document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('signature-pad');
    const colorButtons = document.querySelectorAll('.color-btn');
    const saveButton = document.getElementById('save-button');
    const clearButton = document.getElementById('clear-button');
    const undoButton = document.getElementById('undo-button');
    const statusDiv = document.getElementById('status');

    // Atur ukuran canvas agar responsif
    function resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
    }

    // Inisialisasi SignaturePad
    const signaturePad = new SignaturePad(canvas, {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        penColor: 'black' //
    });
    // === LOGIKA PILIHAN WARNA BARU ===
    colorButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Hapus border aktif dari semua tombol
            colorButtons.forEach(b => b.classList.replace('border-blue-500', 'border-gray-300'));
            colorButtons.forEach(b => b.classList.replace('border-4', 'border-2'));

            // Tambahkan border aktif ke tombol yang diklik
            btn.classList.replace('border-gray-300', 'border-blue-500');
            btn.classList.replace('border-2', 'border-4');

            // Ubah warna pena
            const color = btn.dataset.color;
            if (color === 'blue') signaturePad.penColor = '#0000FF';
            else if (color === 'red') signaturePad.penColor = '#FF0000';
            else signaturePad.penColor = '#000000';
        });
    });
    // === AKHIR LOGIKA PILIHAN WARNA ===
    // Set ukuran awal dan saat window di-resize
    window.addEventListener("resize", resizeCanvas);
    // Set ukuran canvas menjadi 500x200 saat awal load
    canvas.style.width = '500px';
    canvas.style.height = '200px';
    resizeCanvas();

    // Fungsi Tombol Hapus
    clearButton.addEventListener('click', () => {
        signaturePad.clear();
        statusDiv.textContent = '';
    });

    // === LOGIKA TOMBOL UNDO BARU ===
    undoButton.addEventListener('click', () => {
        // 1. Ambil data semua goresan yang ada
        const data = signaturePad.toData();

        // 2. Jika ada goresan, hapus goresan terakhir
        if (data.length > 0) {
            data.pop(); // Menghapus elemen terakhir dari array

            // 3. Bersihkan canvas dan gambar ulang dengan data yang sudah dikurangi
            signaturePad.clear();
            signaturePad.fromData(data);
        }
    });
    // === AKHIR LOGIKA UNDO ===

    // Fungsi Tombol Simpan
    saveButton.addEventListener('click', () => {
        if (signaturePad.isEmpty()) {
            alert("Mohon bubuhkan tanda tangan terlebih dahulu.");
            return;
        }

        // Tampilkan status loading
        statusDiv.textContent = 'Menyimpan...';
        saveButton.disabled = true;

        // Ambil gambar sebagai data URL (Base64 PNG)
        const imageData = signaturePad.toDataURL('image/png');

        // Kirim data ke backend menggunakan Fetch API
        // (Kita bisa saja pakai jscroot jika ada fungsi helpernya, tapi Fetch sudah sangat standar)
        fetch('http://localhost:5000/api/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: imageData }),
        })
        .then(response => response.json())
        .then(data => {
            console.log('Sukses:', data);
            statusDiv.textContent = `Berhasil disimpan! URL: ${data.url}`;
            statusDiv.classList.add('text-green-600');

            // Buat tombol unduh
            const downloadLink = document.createElement('a');
            downloadLink.href = imageData;
            downloadLink.download = 'tanda-tangan.png';
            downloadLink.innerHTML = 'Unduh Tanda Tangan Ini';
            downloadLink.className = 'block text-center mt-2 text-blue-500 underline';
            statusDiv.appendChild(downloadLink);

        })
        .catch((error) => {
            console.error('Error:', error);
            statusDiv.textContent = 'Gagal menyimpan. Cek console untuk detail.';
            statusDiv.classList.add('text-red-600');
        })
        .finally(() => {
            saveButton.disabled = false;
        });
    });
});