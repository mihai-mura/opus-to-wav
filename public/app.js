const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const convertButton = document.querySelector(".convert-button");
const statusDiv = document.getElementById("status");

let selectedFile = null;

// Drag and drop handlers
dropZone.addEventListener("dragover", (e) => {
	e.preventDefault();
	dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
	dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
	e.preventDefault();
	dropZone.classList.remove("dragover");
	const file = e.dataTransfer.files[0];
	handleFileSelection(file);
});

// File input handler
fileInput.addEventListener("change", (e) => {
	handleFileSelection(e.target.files[0]);
});

async function handleFileSelection(file) {
	if (!file) return;
	if (!file.name.toLowerCase().endsWith(".opus")) {
		statusDiv.textContent = "Please select an .opus file";
		statusDiv.classList.add("error");
		return;
	}

	selectedFile = file;
	statusDiv.textContent = `Converting ${file.name}...`;
	convertButton.classList.add("loading");
	convertButton.disabled = true;

	try {
		const formData = new FormData();
		formData.append("opusFile", file);

		const response = await fetch("/convert", {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			throw new Error(`Conversion failed: ${response.statusText}`);
		}

		const blob = await response.blob();
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = file.name.replace(".opus", ".wav");
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		statusDiv.textContent = "Conversion successful! File downloaded.";
		statusDiv.classList.remove("error");
	} catch (error) {
		statusDiv.textContent = error.message;
		statusDiv.classList.add("error");
	} finally {
		convertButton.classList.remove("loading");
		convertButton.disabled = false;
	}
}