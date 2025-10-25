document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const statusDiv = document.getElementById('status');

    // Menangani form registrasi
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            statusDiv.textContent = 'Mendaftarkan...';
            try {
                const res = await fetch('http://localhost:5000/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const data = await res.json();
                
                if (!res.ok) {
                    throw new Error(data.msg || 'Registrasi gagal');
                }
                
                statusDiv.textContent = 'Registrasi berhasil! Anda akan dialihkan ke halaman login.';
                // Tunggu sebentar lalu alihkan ke halaman login
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);

            } catch (err) {
                statusDiv.textContent = err.message;
                statusDiv.classList.add('text-red-500');
            }
        });
    }

    // Menangani form login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            statusDiv.textContent = 'Mencoba masuk...';
            try {
                const res = await fetch('http://localhost:5000/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const data = await res.json();

                if (data.token) {
                    // KUNCI: Simpan token ke localStorage jika login berhasil
                    localStorage.setItem('token', data.token);
                    statusDiv.textContent = 'Login berhasil! Mengalihkan ke editor...';
                    // Alihkan ke halaman utama aplikasi
                    window.location.href = 'editor.html'; 
                } else {
                    throw new Error(data.msg || 'Login gagal');
                }
            } catch (err) {
                statusDiv.textContent = err.message;
                statusDiv.classList.add('text-red-500');
            }
        });
    }
});