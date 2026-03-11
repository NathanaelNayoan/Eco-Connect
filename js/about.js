document.addEventListener("DOMContentLoaded", () => {
    const contactForm = document.getElementById("contact-form");
    const emailInput = document.getElementById("contact-email");
    const waInput = document.getElementById("contact-wa");
    const msgInput = document.getElementById("contact-msg");
    const btnSubmit = document.getElementById("btn-submit-contact");
    const alertBox = document.getElementById("contact-alert");

    const API_URL = 'http://localhost:3000';

    if (contactForm) {
        contactForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = emailInput.value.trim();
            const whatsapp = waInput.value.trim();
            const message = msgInput.value.trim();

            if (!email || !whatsapp || !message) {
                showAlert("Harap isi semua kolom dengan benar.", "error");
                return;
            }

            btnSubmit.disabled = true;
            btnSubmit.textContent = "Mengirim...";

            try {
                const res = await fetch(`${API_URL}/api/contact`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, whatsapp, message })
                });

                if (!res.ok) {
                    throw new Error("Gagal mengirim pesan");
                }

                showAlert("Terima kasih! Pesan Anda telah berhasil dikirim.", "success");
                contactForm.reset();
            } catch (err) {
                console.error(err);
                showAlert("Terjadi kesalahan. Silakan coba lagi nanti.", "error");
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Kirim Pesan";
            }
        });
    }

    function showAlert(msg, type) {
        alertBox.textContent = msg;
        alertBox.style.display = "block";
        if (type === "success") {
            alertBox.style.backgroundColor = "rgba(0, 230, 91, 0.1)";
            alertBox.style.color = "#00e65b";
            alertBox.style.border = "1px solid rgba(0, 230, 91, 0.3)";
        } else {
            alertBox.style.backgroundColor = "rgba(244, 63, 94, 0.1)";
            alertBox.style.color = "#f43f5e";
            alertBox.style.border = "1px solid rgba(244, 63, 94, 0.3)";
        }

        setTimeout(() => {
            alertBox.style.display = "none";
        }, 5000);
    }
});
