import { createPdfToolkit, PdfPasswordError } from 'pdfstudio';
import './style.css';

const fileInput = document.querySelector('#pdfFile');
const dropzone = document.querySelector('#dropzone');
const dropTitle = document.querySelector('#dropTitle');
const dropSubtitle = document.querySelector('#dropSubtitle');
const fileMeta = document.querySelector('#fileMeta');
const passwordInput = document.querySelector('#pdfPassword');
const togglePassword = document.querySelector('#togglePassword');
const ownership = document.querySelector('#ownership');
const unlockButton = document.querySelector('#unlockButton');
const statusBox = document.querySelector('#status');
const resultBox = document.querySelector('#result');
const downloadButton = document.querySelector('#downloadButton');

let selectedFile = null;
let unlockedBytes = null;
let unlockedName = 'unlocked.pdf';
let toolkitPromise = null;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function setStatus(message, type = 'info') {
  statusBox.className = `status status-${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '!' : type === 'working' ? '…' : 'i';
  statusBox.innerHTML = `<span class="status-icon" aria-hidden="true"></span><span></span>`;
  statusBox.querySelector('.status-icon').textContent = icon;
  statusBox.querySelector('span:last-child').textContent = message;
}

function updateButton() {
  unlockButton.disabled = !(selectedFile && passwordInput.value.length > 0 && ownership.checked) || unlockButton.dataset.busy === 'true';
}

function chooseFile(file) {
  resultBox.hidden = true;
  unlockedBytes = null;
  if (!file) return;
  if (!(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
    selectedFile = null;
    fileInput.value = '';
    dropTitle.textContent = 'Please choose a PDF file';
    dropSubtitle.textContent = 'This tool accepts PDF documents only.';
    fileMeta.hidden = true;
    setStatus('The selected file does not appear to be a PDF. Please choose a .pdf file.', 'error');
    updateButton();
    return;
  }
  selectedFile = file;
  dropTitle.textContent = file.name;
  dropSubtitle.textContent = 'PDF selected and ready';
  fileMeta.textContent = `File size: ${formatBytes(file.size)}`;
  fileMeta.hidden = false;
  setStatus('PDF selected. Enter its current password to unlock it.');
  updateButton();
}

fileInput.addEventListener('change', () => chooseFile(fileInput.files?.[0]));
for (const eventName of ['dragenter', 'dragover']) {
  dropzone.addEventListener(eventName, event => { event.preventDefault(); dropzone.classList.add('drag-over'); });
}
for (const eventName of ['dragleave', 'drop']) {
  dropzone.addEventListener(eventName, event => { event.preventDefault(); dropzone.classList.remove('drag-over'); });
}
dropzone.addEventListener('drop', event => chooseFile(event.dataTransfer?.files?.[0]));
passwordInput.addEventListener('input', updateButton);
ownership.addEventListener('change', updateButton);

togglePassword.addEventListener('click', () => {
  const show = passwordInput.type === 'password';
  passwordInput.type = show ? 'text' : 'password';
  togglePassword.textContent = show ? 'Hide' : 'Show';
  togglePassword.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
});

unlockButton.addEventListener('click', async () => {
  if (!selectedFile || !passwordInput.value || !ownership.checked) return;
  resultBox.hidden = true;
  unlockedBytes = null;
  unlockButton.dataset.busy = 'true';
  unlockButton.disabled = true;
  unlockButton.innerHTML = '<span class="spinner" aria-hidden="true"></span> Loading PDF engine…';
  setStatus('Loading the PDF engine in your browser. Large files may take a little time.', 'working');

  try {
    toolkitPromise ??= createPdfToolkit();
    const pdf = await toolkitPromise;
    unlockButton.innerHTML = '<span class="spinner" aria-hidden="true"></span> Unlocking PDF…';
    setStatus('Processing on this device. Your PDF is not being uploaded.', 'working');
    unlockedBytes = await pdf.unlock(selectedFile, { password: passwordInput.value });
    unlockedName = selectedFile.name.replace(/\.pdf$/i, '') + '-unlocked.pdf';
    setStatus('Success! Your PDF has been unlocked. Download the separate copy below.', 'success');
    resultBox.hidden = false;
  } catch (error) {
    unlockedBytes = null;
    if (error instanceof PdfPasswordError || /password|invalid password|incorrect password/i.test(String(error?.message || error))) {
      setStatus('That password was not accepted. Check it and try again. This tool does not recover forgotten passwords.', 'error');
    } else {
      console.error('PDF unlock error:', error);
      setStatus('Could not unlock this PDF. It may be damaged, unsupported, or protected in a way this version cannot handle. Please try another PDF.', 'error');
    }
  } finally {
    unlockButton.dataset.busy = 'false';
    unlockButton.innerHTML = '<span aria-hidden="true">🔓</span> Unlock PDF';
    updateButton();
  }
});

downloadButton.addEventListener('click', () => {
  if (!unlockedBytes) return;
  const blob = new Blob([unlockedBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = unlockedName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
});
