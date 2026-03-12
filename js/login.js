/**
 * ECO CONNECT - LOGIN LOGIC FINAL
 */

let roleAktif = 'user';

// 1. FUNGSI LOADING SCREEN
function hilangkanLoading() {
    const loader = document.getElementById('loader');
    setTimeout(() => {
        if (loader) loader.classList.add('fade-out');
    }, 1000);
}

// 2. LOGIKA MATA PASSWORD MUNCUL SAAT MENGETIK
function cekInputPassword() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eye-icon');

    if (passwordInput.value.length > 0) {
        eyeIcon.style.display = "block";
    } else {
        eyeIcon.style.display = "none";
    }
}

// 3. LIHAT / SEMBUNYIKAN PASSWORD
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eye-icon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

// 4. GANTI ROLE (USER / ADMIN)
function setRole(role) {
    roleAktif = role;
    document.getElementById('btn-user').classList.remove('active');
    document.getElementById('btn-admin').classList.remove('active');

    if (role === 'user') {
        document.getElementById('btn-user').classList.add('active');
    } else {
        document.getElementById('btn-admin').classList.add('active');
    }
}

// 5. PROSES LOGIN
async function prosesLogin(event) {
    event.preventDefault();

    const userVal = document.getElementById('username').value;
    const passVal = document.getElementById('password').value;
    const API_URL = '';

    const btnSubmit = document.querySelector('.btn-submit');
    const originalText = btnSubmit.textContent;
    btnSubmit.textContent = "Loading...";
    btnSubmit.disabled = true;

    try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userVal, password: passVal })
        });

        if (!res.ok) {
            console.error("Login failed with status:", res.status);
            throw new Error("Email atau password tidak valid.");
        }

        const data = await res.json();
        console.log("Login successful:", data);

        // Simpan sesi
        localStorage.setItem('sessionId', data.user.id);

        // Pastikan role yang diklik sesuai dengan role akun aslinya, atau paksa saja:
        if (data.user.role === 'admin') {
            window.location.href = 'dashboard-admin.html';
        } else {
            window.location.href = 'dashboard-user.html';
        }
    } catch (e) {
        alert(e.message);
        btnSubmit.textContent = originalText;
        btnSubmit.disabled = false;
    }
}