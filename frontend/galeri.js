document.addEventListener('DOMContentLoaded', () => {
    const galleryContainer = document.getElementById('gallery-container');
    const loadingStatus = document.getElementById('loading-status');

    // Fungsi untuk mengambil dan menampilkan tanda tangan
    async function fetchAndDisplaySignatures() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html'; // Jika tidak ada token, paksa login
            return;
        }

        try {
            // HANYA SATU FETCH DENGAN TOKEN OTENTIKASI
            const response = await fetch('http://localhost:5000/api/signatures', {
                headers: {
                    'x-auth-token': token
                }
            });
            
            // Periksa jika token tidak valid atau ada error dari server
            if (!response.ok) {
                // Jika token ditolak (unauthorized), paksa login kembali
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                }
                throw new Error('Gagal memuat data dari server.');
            }
            
            const signatures = await response.json();

            loadingStatus.style.display = 'none';

            if (signatures.length === 0) {
                galleryContainer.innerHTML = '<p class="col-span-full text-center text-gray-500">Belum ada tanda tangan yang disimpan.</p>';
                return;
            }

            signatures.forEach(signature => {
                const signatureWrapper = document.createElement('div');
                signatureWrapper.className = 'bg-white p-2 border rounded-lg shadow flex flex-col items-center relative';

                const deleteButton = document.createElement('button');
                deleteButton.innerText = '×';
                deleteButton.className = 'absolute top-0 right-1 text-red-500 font-bold text-lg hover:text-red-700';
                deleteButton.title = 'Hapus tanda tangan ini';
                deleteButton.onclick = async () => {
                    if (confirm('Apakah Anda yakin ingin menghapus tanda tangan ini?')) {
                        try {
                            // DIPERBAIKI: Tambahkan header otentikasi saat menghapus
                            const deleteResponse = await fetch(`http://localhost:5000/api/signatures/${signature._id}`, {
                                method: 'DELETE',
                                headers: {
                                    'x-auth-token': token
                                }
                            });
                            if (!deleteResponse.ok) throw new Error('Gagal menghapus');
                            signatureWrapper.remove();
                        } catch (error) {
                            console.error(error);
                            alert('Gagal menghapus tanda tangan.');
                        }
                    }
                };
                
                const img = document.createElement('img');
                img.src = signature.imageUrl;
                img.alt = 'Tanda Tangan';
                img.className = 'w-full h-auto object-contain';

                const downloadLink = document.createElement('a');
                downloadLink.href = signature.imageUrl;
                downloadLink.innerText = 'Unduh';
                downloadLink.setAttribute('download', 'tanda-tangan.png');
                downloadLink.className = 'mt-2 text-sm text-blue-600 hover:underline';
                
                signatureWrapper.appendChild(deleteButton);
                signatureWrapper.appendChild(img);
                signatureWrapper.appendChild(downloadLink);
                galleryContainer.appendChild(signatureWrapper);
            });

        } catch (error) {
            console.error('Gagal mengambil data:', error);
            loadingStatus.innerText = 'Gagal memuat data. Mungkin sesi Anda telah berakhir, silakan login kembali.';
            loadingStatus.classList.add('text-red-500');
        }
    }

    // Panggil fungsinya saat halaman dimuat
    fetchAndDisplaySignatures();
});