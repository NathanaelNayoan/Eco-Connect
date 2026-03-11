/**
 * ECO CONNECT - FORGOT PASSWORD LOGIC
 */

function hilangkanLoading() {
    const loader = document.getElementById('loader');
    setTimeout(() => {
        if (loader) loader.classList.add('fade-out');
    }, 1000);
}

// PROSES RESET PASSWORD
async function prosesReset(event) {
    event.preventDefault();

    const emailVal = document.getElementById('email').value;
    const newPassVal = document.getElementById('new-password').value;
    const confirmPassVal = document.getElementById('confirm-password').value;
    const API_URL = 'http://localhost:3000';

    if (newPassVal !== confirmPassVal) {
        alert("Konfirmasi password tidak cocok!");
        return;
    }

    const btnSubmit = document.querySelector('.btn-submit');
    const originalText = btnSubmit.textContent;
    btnSubmit.textContent = "Loading...";
    btnSubmit.disabled = true;

    try {
        const res = await fetch(`${API_URL}/api/auth/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailVal, newPassword: newPassVal })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Gagal melakukan reset password.");
        }

        alert("Password berhasil diubah! Silahkan login dengan password baru.");
        window.location.href = 'login.html';
    } catch (e) {
        alert(e.message);
        btnSubmit.textContent = originalText;
        btnSubmit.disabled = false;
    }
}
