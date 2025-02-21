const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const app = express();
const port = 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public'), {
	setHeaders: (res, filePath) => {
		res.setHeader("Cache-Control", "no-cache");
	}
}));

// Return 403 for any non-public file requests
app.use((req, res, next) => {
	if (req.method === "GET" && !req.path.startsWith("/convert")) {
		return res.status(403).json({ error: "Access denied" });
	}
	next();
});

// Configure multer for handling file uploads
const upload = multer({
	storage: multer.memoryStorage(),
	fileFilter: (req, file, cb) => {
		if (file.originalname.toLowerCase().endsWith(".opus")) {
			cb(null, true);
		} else {
			cb(new Error("Only .opus files are allowed"));
		}
	},
});

// Handle file upload and conversion
app.post("/convert", upload.single("opusFile"), async (req, res) => {
	try {
		if (!req.file) {
			throw new Error("No file uploaded");
		}

		// Create temporary files for input and output
		const tempInputPath = path.join(__dirname, `temp_${Date.now()}.opus`);
		const tempOutputPath = path.join(__dirname, `temp_${Date.now()}.wav`);

		// Write the uploaded file to disk
		fs.writeFileSync(tempInputPath, req.file.buffer);

		// Convert using FFmpeg
		const ffmpeg = spawn("ffmpeg", [
			"-i",
			tempInputPath,
			"-c:a",
			"pcm_s16le", // 16-bit PCM WAV
			"-ar",
			"8000", // Sample rate (8 KHz)
			"-ac",
			"1", // Mono channel
			tempOutputPath,
		]);

		ffmpeg.stderr.on("data", data => {
			console.log(`FFmpeg: ${data}`);
		});

		ffmpeg.on("close", code => {
			if (code === 0) {
				// Read the converted file
				const wavData = fs.readFileSync(tempOutputPath);

				// Clean up temporary files
				fs.unlinkSync(tempInputPath);
				fs.unlinkSync(tempOutputPath);

				// Send the WAV file
				res.setHeader("Content-Type", "audio/wav");
				res.setHeader("Content-Disposition", `attachment; filename="${req.file.originalname.replace(".opus", ".wav")}"`);
				res.send(wavData);
			} else {
				res.status(500).json({ error: "Conversion failed" });
			}
		});

		ffmpeg.on("error", error => {
			// Clean up temporary files if they exist
			if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
			if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);

			console.error("FFmpeg error:", error);
			res.status(500).json({ error: "Conversion failed" });
		});
	} catch (error) {
		console.error("Conversion error:", error);
		res.status(500).json({ error: error.message });
	}
});

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});
