// Atur worker untuk PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js`;

// Ambil semua elemen DOM yang kita butuhkan
const pdfUpload = document.getElementById('pdf-upload');
const pdfViewer = document.getElementById('pdf-viewer');
const canvas = document.getElementById('pdf-canvas');
const context = canvas.getContext('2d');
const signatureGallery = document.getElementById('signature-gallery');
const savePdfButton = document.getElementById('save-pdf');
const statusDiv = document.getElementById('status');
const pdfNavigation = document.getElementById('pdf-navigation');
const prevPageButton = document.getElementById('prev-page');
const nextPageButton = document.getElementById('next-page');
const pageNumSpan = document.getElementById('page-num');

// Variabel untuk menyimpan state
let pdfDoc = null;
let currentPage = 1;
let originalPdfFile = null;
let activeSignature = {
    element: null,
    url: null,
    x: 100,
    y: 100,
    width: 150,
    height: 75
};

// --- FUNGSI 1: Memuat Galeri Tanda Tangan (Dengan Otentikasi) ---
async function loadSignatures() {
    // KUNCI: Pemeriksaan token di pintu depan
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/api/signatures', {
            headers: { 'x-auth-token': token } // KUNCI: Sertakan token
        });

        if (response.status === 401) { // Jika token ditolak
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }
        if (!response.ok) throw new Error('Gagal memuat galeri');

        const signatures = await response.json();
        signatureGallery.innerHTML = '';

        if (signatures.length === 0) {
            signatureGallery.innerHTML = '<p class="text-sm text-gray-500 col-span-full">Galeri kosong.</p>';
        }

        signatures.forEach(sig => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'p-2 border rounded hover:bg-gray-200 cursor-pointer relative';
            
            const deleteButton = document.createElement('button');
            deleteButton.innerText = '×';
            deleteButton.className = 'absolute top-0 right-1 text-red-500 font-bold text-lg hover:text-red-700';
            deleteButton.title = 'Hapus tanda tangan ini';
            deleteButton.onclick = async (event) => {
                event.stopPropagation();
                if (confirm('Apakah Anda yakin ingin menghapus tanda tangan ini?')) {
                    try {
                        const deleteResponse = await fetch(`http://localhost:5000/api/signatures/${sig._id}`, {
                            method: 'DELETE',
                            headers: { 'x-auth-token': token } // KUNCI: Sertakan token saat menghapus
                        });
                        if (!deleteResponse.ok) throw new Error('Gagal menghapus');
                        imgContainer.remove();
                    } catch (error) {
                        alert('Gagal menghapus tanda tangan.');
                    }
                }
            };

            const img = document.createElement('img');
            img.src = sig.imageUrl;
            img.className = 'w-32 object-contain';
            
            imgContainer.appendChild(deleteButton);
            imgContainer.appendChild(img);
            imgContainer.addEventListener('click', () => placeSignature(sig.imageUrl));
            signatureGallery.appendChild(imgContainer);
        });
    } catch (error) {
        console.error('Gagal memuat tanda tangan:', error);
        signatureGallery.innerHTML = '<p class="text-red-500">Gagal memuat.</p>';
    }
}

// --- FUNGSI 2: Menampilkan PDF di Canvas (Responsif) ---
async function renderPage(num) {
    if (!pdfDoc) return;
    
    pdfNavigation.classList.remove('hidden');
    pdfNavigation.classList.add('flex');

    const page = await pdfDoc.getPage(num);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const containerWidth = pdfViewer.clientWidth;
    const dynamicScale = containerWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale: dynamicScale });

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = { canvasContext: context, viewport: viewport };
    await page.render(renderContext).promise;

    pageNumSpan.textContent = `Halaman ${num} dari ${pdfDoc.numPages}`;
    prevPageButton.disabled = (num <= 1);
    nextPageButton.disabled = (num >= pdfDoc.numPages);
}

// Event listener untuk input file PDF
pdfUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
        originalPdfFile = file;
        const fileReader = new FileReader();
        
        fileReader.onload = async function() {
            const typedarray = new Uint8Array(this.result);
            pdfDoc = await pdfjsLib.getDocument(typedarray).promise;
            currentPage = 1;
            renderPage(currentPage);
            savePdfButton.disabled = false;
        };
        fileReader.readAsArrayBuffer(file);
    }
});

// --- FUNGSI 3: Menempatkan Tanda Tangan ke PDF Viewer ---
function placeSignature(imageUrl) {
    if (activeSignature.element) activeSignature.element.remove();
    const sigImage = document.createElement('img');
    sigImage.src = imageUrl;
    sigImage.className = 'signature-image';
    sigImage.style.width = `${activeSignature.width}px`;
    sigImage.style.height = `${activeSignature.height}px`;
    sigImage.style.transform = `translate(${activeSignature.x}px, ${activeSignature.y}px)`;
    activeSignature.element = sigImage;
    activeSignature.url = imageUrl;
    pdfViewer.appendChild(sigImage);
    makeInteractive(sigImage);
}

// --- FUNGSI 4: Membuat Tanda Tangan Interaktif (Drag & Resize) ---
function makeInteractive(element) {
    interact(element)
        .draggable({
            listeners: { move(event) {
                activeSignature.x += event.dx;
                activeSignature.y += event.dy;
                event.target.style.transform = `translate(${activeSignature.x}px, ${activeSignature.y}px)`;
            }},
            modifiers: [interact.modifiers.restrictRect({ restriction: 'parent' })]
        })
        .resizable({
            edges: { left: true, right: true, bottom: true, top: true },
            listeners: { move(event) {
                activeSignature.width = event.rect.width;
                activeSignature.height = event.rect.height;
                activeSignature.x += event.deltaRect.left;
                activeSignature.y += event.deltaRect.top;
                Object.assign(event.target.style, {
                    width: `${event.rect.width}px`,
                    height: `${event.rect.height}px`,
                    transform: `translate(${activeSignature.x}px, ${activeSignature.y}px)`
                });
            }},
            modifiers: [interact.modifiers.restrictSize({ min: { width: 50, height: 25 } })]
        });
}

// --- FUNGSI 5: Menyimpan dan Mengunduh PDF (Dengan Otentikasi) ---
savePdfButton.addEventListener('click', async () => {
    // KUNCI: Pemeriksaan token sebelum menyimpan
    const token = localStorage.getItem('token');
    if (!token) {
        alert("Sesi Anda telah berakhir. Silakan login kembali.");
        window.location.href = 'login.html';
        return;
    }
    
    if (!originalPdfFile || !activeSignature.url) {
        alert("Mohon unggah PDF dan pilih tanda tangan terlebih dahulu.");
        return;
    }

    statusDiv.innerText = 'Memproses... mohon tunggu.';
    savePdfButton.disabled = true;

    const page = await pdfDoc.getPage(currentPage);
    const pdfPage = page.getViewport({ scale: 1 });
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = pdfPage.width / canvasRect.width;
    const scaleY = pdfPage.height / canvasRect.height;
    const sigRect = activeSignature.element.getBoundingClientRect();
    const relativeX = sigRect.left - canvasRect.left;
    const relativeY = sigRect.top - canvasRect.top;
    const pdfX = relativeX * scaleX;
    const pdfWidth = activeSignature.width * scaleX;
    const pdfHeight = activeSignature.height * scaleY;
    const pdfY = pdfPage.height - (relativeY * scaleY) - pdfHeight;

    const formData = new FormData();
    formData.append('pdfFile', originalPdfFile);
    formData.append('imageUrl', activeSignature.url);
    formData.append('x', pdfX);
    formData.append('y', pdfY);
    formData.append('width', pdfWidth);
    formData.append('height', pdfHeight);
    formData.append('pageIndex', currentPage - 1);

    try {
        const response = await fetch('http://localhost:5000/api/embed', {
            method: 'POST',
            headers: { 'x-auth-token': token }, // KUNCI: Sertakan token saat mengirim data PDF
            body: formData,
        });

        if (!response.ok) throw new Error(`Server merespons dengan status: ${response.status}`);
        const pdfBlob = await response.blob();
        const url = window.URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'dokumen-bertandatangan.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        statusDiv.innerText = 'PDF berhasil dibuat dan diunduh!';
    } catch (error) {
        statusDiv.innerText = 'Gagal memproses PDF. Cek console.';
    } finally {
        savePdfButton.disabled = false;
    }
});

// Event listener untuk navigasi
prevPageButton.addEventListener('click', () => { if (currentPage > 1) renderPage(--currentPage); });
nextPageButton.addEventListener('click', () => { if (currentPage < pdfDoc.numPages) renderPage(++currentPage); });

// Jalankan fungsi untuk memuat galeri saat halaman pertama kali dibuka
loadSignatures();