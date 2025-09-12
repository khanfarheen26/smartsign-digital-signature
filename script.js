const pdfCanvas = document.getElementById("pdfCanvas");
const pdfCtx = pdfCanvas.getContext("2d");
const signCanvas = document.getElementById("signCanvas");
const ctx = signCanvas.getContext("2d");

const colorPicker = document.getElementById("colorPicker");
const canvasColor = document.getElementById("canvasColor");
const penSize = document.getElementById("penSize");

const clearButton = document.getElementById("clearButton");
const saveButton = document.getElementById("saveButton");
const retrieveButton = document.getElementById("retrieveButton");
const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");

let isDrawing = false, lastX = 0, lastY = 0;
let undoStack = [], redoStack = [];

// --- PDF Upload ---
let pdfDoc = null;
document.getElementById("pdfUpload").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") { alert("Upload PDF"); return; }
    const reader = new FileReader();
    reader.onload = function () {
        const typedarray = new Uint8Array(this.result);
        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
            pdfDoc = pdf;
            pdfDoc.getPage(1).then(page => {
                const viewport = page.getViewport({ scale: 1.2 });
                pdfCanvas.width = viewport.width;
                pdfCanvas.height = viewport.height;
                page.render({ canvasContext: pdfCtx, viewport });
            });
        });
    }
    reader.readAsArrayBuffer(file);
});

// --- Signature Pad ---
ctx.lineCap = ctx.lineJoin = "round";
ctx.strokeStyle = colorPicker.value;
ctx.lineWidth = penSize.value;

function saveState() { undoStack.push(signCanvas.toDataURL()); redoStack = []; }
function startDrawing(e) { isDrawing = true;[lastX, lastY] = [e.offsetX, e.offsetY]; saveState(); }
function draw(e) { if (!isDrawing) return; ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke();[lastX, lastY] = [e.offsetX, e.offsetY]; }
function stopDrawing() { isDrawing = false; }

signCanvas.addEventListener("mousedown", startDrawing);
signCanvas.addEventListener("mousemove", draw);
signCanvas.addEventListener("mouseup", stopDrawing);
signCanvas.addEventListener("mouseout", stopDrawing);

colorPicker.addEventListener("change", e => ctx.strokeStyle = e.target.value);
penSize.addEventListener("change", e => ctx.lineWidth = e.target.value);
canvasColor.addEventListener("change", e => { ctx.fillStyle = e.target.value; ctx.fillRect(0, 0, signCanvas.width, signCanvas.height); saveState(); });
clearButton.addEventListener("click", () => { ctx.fillStyle = canvasColor.value; ctx.fillRect(0, 0, signCanvas.width, signCanvas.height); saveState(); });
undoButton.addEventListener("click", () => { if (undoStack.length) { redoStack.push(signCanvas.toDataURL()); let img = new Image(); img.src = undoStack.pop(); img.onload = () => ctx.drawImage(img, 0, 0); } });
redoButton.addEventListener("click", () => { if (redoStack.length) { let img = new Image(); img.src = redoStack.pop(); img.onload = () => ctx.drawImage(img, 0, 0); } });

saveButton.addEventListener("click", () => { localStorage.setItem("signature", signCanvas.toDataURL()); alert("Saved"); });
retrieveButton.addEventListener("click", () => { let saved = localStorage.getItem("signature"); if (saved) { let img = new Image(); img.src = saved; img.onload = () => ctx.drawImage(img, 0, 0); } });

// --- AI-style Typed Signature ---
const handwritingFonts = [
    "'Great Vibes', cursive",
    "'Dancing Script', cursive",
    "'Pacifico', cursive",
    "'Satisfy', cursive"
];

document.getElementById("aiGenerate").addEventListener("click", () => {
    const name = document.getElementById("typedName").value.trim();
    if (!name) return alert("Type your name first");

    ctx.clearRect(0, 0, signCanvas.width, signCanvas.height);
    ctx.fillStyle = canvasColor.value;
    ctx.fillRect(0, 0, signCanvas.width, signCanvas.height);

    ctx.fillStyle = colorPicker.value;
    const randomFont = handwritingFonts[Math.floor(Math.random() * handwritingFonts.length)];
    ctx.font = `48px ${randomFont}`;
    ctx.textBaseline = "middle";
    ctx.fillText(name, 20, signCanvas.height / 2);

    saveState();
});

// --- Drag signature onto PDF ---
document.getElementById("addSign").addEventListener("click", () => {
    let img = new Image(); img.src = signCanvas.toDataURL();
    let box = document.createElement("div");
    box.className = "signature-box"; box.style.width = "200px"; box.style.height = "80px"; box.style.left = "20px"; box.style.top = "20px";
    box.appendChild(img); document.getElementById("pdfWrapper").appendChild(box);

    let offsetX, offsetY, isDragging = false;
    box.addEventListener("mousedown", (e) => { isDragging = true; offsetX = e.clientX - box.offsetLeft; offsetY = e.clientY - box.offsetTop; });
    document.addEventListener("mousemove", (e) => { if (isDragging) { box.style.left = (e.clientX - offsetX) + "px"; box.style.top = (e.clientY - offsetY) + "px"; } });
    document.addEventListener("mouseup", () => { isDragging = false; });
});

// --- Download Signed PDF ---
document.getElementById("downloadPDF").addEventListener("click", () => {
    if (!pdfDoc) { alert("Upload PDF first"); return; }
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "px", [pdfCanvas.width, pdfCanvas.height]);
    pdf.addImage(pdfCanvas.toDataURL("image/png"), "PNG", 0, 0, pdfCanvas.width, pdfCanvas.height);

    document.querySelectorAll(".signature-box").forEach(box => {
        const img = box.querySelector("img");
        const x = parseInt(box.style.left);
        const y = parseInt(box.style.top);
        const w = box.offsetWidth;
        const h = box.offsetHeight;
        pdf.addImage(img.src, "PNG", x, y, w, h);
    });

    const name = document.getElementById("signerName").value || "Anonymous";
    const email = document.getElementById("signerEmail").value || "Not Provided";
    const timestamp = new Date().toLocaleString();

    pdf.setFontSize(12);
    pdf.text(`Signed by: ${name}`, 20, pdfCanvas.height - 40);
    pdf.text(`Email: ${email}`, 20, pdfCanvas.height - 25);
    pdf.text(`Date: ${timestamp}`, 20, pdfCanvas.height - 10);

    pdf.save("signed-document.pdf");
});

ctx.fillStyle = canvasColor.value;
ctx.fillRect(0, 0, signCanvas.width, signCanvas.height);
