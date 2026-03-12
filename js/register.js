const selectHari = document.getElementById('selectHari');
const selectBulan = document.getElementById('selectBulan');
const selectTahun = document.getElementById('selectTahun');
const selectKecamatan = document.getElementById('selectKecamatan');
const selectKelurahan = document.getElementById('selectKelurahan');

const dataKelurahan = {
    'Airmadidi': ['Airmadidi Atas', 'Airmadidi Bawah', 'Sarongsong I', 'Sarongsong II', 'Rap-Rap', 'Sukur', 'Sampiri', 'Sawangan', 'Tanggari'],
    'Kalawat': ['Kalawat', 'Kolongan', 'Kolongan Tetempangan', 'Kuwil', 'Maumbi', 'Suwaan', 'Kaweng']
};

// --- 1. INISIALISASI DATA AWAL ---

// Isi Dropdown Bulan
const namaBulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];
namaBulan.forEach((bulan, index) => {
    let opt = document.createElement('option');
    opt.value = index + 1;
    opt.innerHTML = bulan;
    selectBulan.appendChild(opt);
});

// Isi Dropdown Tahun (Dari 2026 sampai 1876)
// Sesuai permintaan Anda, batas atas adalah 2026
const tahunTerupdate = 2026;
const tahunMulai = 1876;
for (let i = tahunTerupdate; i >= tahunMulai; i--) {
    let opt = document.createElement('option');
    opt.value = i;
    opt.innerHTML = i;
    selectTahun.appendChild(opt);
}

// --- 2. LOGIKA KALENDER (SINKRONISASI TANGGAL) ---

function updateTanggal() {
    // Ambil nilai yang sedang dipilih user
    const bulan = parseInt(selectBulan.value);
    const tahun = parseInt(selectTahun.value);
    const tanggalSebelumnya = selectHari.value;

    // Jika bulan belum dipilih, tampilkan standar 31 hari dulu
    // Tapi jika sudah dipilih, hitung jumlah hari asli di bulan tersebut
    let jumlahHari = 31;

    if (bulan) {
        // Trik JS: Tanggal 0 dari bulan berikutnya adalah hari terakhir bulan ini
        // Contoh: new Date(2026, 2, 0) adalah tanggal terakhir bulan Februari 2026
        jumlahHari = new Date(tahun || 2026, bulan, 0).getDate();
    }

    // Bersihkan isi dropdown Hari
    selectHari.innerHTML = '<option value="" disabled selected>Hari</option>';

    // Isi ulang dropdown Hari sesuai jumlahHari yang sudah dihitung
    for (let h = 1; h <= jumlahHari; h++) {
        let opt = document.createElement('option');
        opt.value = h;
        opt.innerHTML = h;

        // Jika tanggal yang dipilih sebelumnya masih ada di bulan baru, biarkan terpilih
        if (h == tanggalSebelumnya) {
            opt.selected = true;
        }
        selectHari.appendChild(opt);
    }
}

// --- 3. EVENT LISTENER ---

// Jalankan fungsi update setiap kali Bulan atau Tahun diganti
selectBulan.addEventListener('change', updateTanggal);
selectTahun.addEventListener('change', updateTanggal);

if (selectKecamatan && selectKelurahan) {
    selectKecamatan.addEventListener('change', function () {
        const kec = this.value;
        selectKelurahan.innerHTML = '<option value="" disabled selected>Pilih Kelurahan/Desa</option>';
        if (dataKelurahan[kec]) {
            dataKelurahan[kec].forEach(kel => {
                let opt = document.createElement('option');
                opt.value = kel;
                opt.innerHTML = kel;
                selectKelurahan.appendChild(opt);
            });
            selectKelurahan.disabled = false;
        } else {
            selectKelurahan.disabled = true;
        }
    });
}

// Jalankan sekali saat pertama kali load agar dropdown Hari terisi 1-31
updateTanggal();

// Fungsi Tombol Daftar
async function prosesDaftar(event) {
    event.preventDefault();

    const namaDepan = document.getElementById('namaDepan').value.trim();
    const namaBelakang = document.getElementById('namaBelakang').value.trim();
    const kontak = document.getElementById('kontak').value.trim();
    const password = document.getElementById('passwordReg').value;

    // Alamat
    const kecEl = document.getElementById('selectKecamatan');
    const kelEl = document.getElementById('selectKelurahan');
    const kecamatanValue = kecEl ? kecEl.value : "";
    const kelurahanValue = kelEl ? kelEl.value : "";

    // Tanggal Lahir & Gender
    const hari = document.getElementById('selectHari').value;
    const bulan = document.getElementById('selectBulan').value;
    const tahun = document.getElementById('selectTahun').value;
    let birthDate = null;
    if (hari && bulan && tahun) {
        // Format YYYY-MM-DD
        const mm = String(bulan).padStart(2, '0');
        const dd = String(hari).padStart(2, '0');
        birthDate = `${tahun}-${mm}-${dd}`;
    }
    const gender = document.getElementById('gender').value;

    const fullName = (namaDepan + ' ' + namaBelakang).trim();
    const API_URL = '';

    if (!kecamatanValue || !kelurahanValue) {
        alert("Silakan pilih Kecamatan dan Kelurahan terlebih dahulu.");
        return;
    }

    // Validasi Usia Minimum 17 Tahun
    if (!birthDate) {
        alert("Mohon lengkapi tanggal lahir Anda.");
        return;
    }
    const today = new Date();
    const dob = new Date(birthDate);
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }

    if (age < 17) {
        alert("Maaf, pendaftaran EcoConnect membutuhkan usia minimal 17 tahun.");
        return;
    }

    const idCardPhotoInput = document.getElementById('idCardPhoto');
    const selfiePhotoInput = document.getElementById('selfiePhoto');

    if (idCardPhotoInput.files.length === 0 || selfiePhotoInput.files.length === 0) {
        alert("Foto KTP dan Selfie dengan KTP wajib diunggah untuk verifikasi.");
        return;
    }

    const btnSubmit = document.querySelector('.btn-submit');
    const originalText = btnSubmit.textContent;
    btnSubmit.textContent = "Loading...";
    btnSubmit.disabled = true;

    try {
        const formData = new FormData();
        formData.append('fullName', fullName || 'Pengguna');
        formData.append('email', kontak); // Simplification: using contact as email
        formData.append('password', password);
        formData.append('phone', kontak); // Simplification: same for phone
        formData.append('kecamatan', kecamatanValue);
        formData.append('kelurahan', kelurahanValue);
        formData.append('birthDate', birthDate);
        formData.append('gender', gender);
        formData.append('idCardPhoto', idCardPhotoInput.files[0]);
        formData.append('selfiePhoto', selfiePhotoInput.files[0]);

        const res = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            console.error("Registration failed with status:", res.status);
            let errorMsg = "Gagal melakukan pendaftaran. Silakan periksa koneksi atau data Anda.";
            try {
                const errData = await res.json();
                if (errData && errData.error) errorMsg = errData.error;
            } catch (e) {
                console.error("Non-JSON error response or empty body:", e);
                errorMsg = "Terjadi kesalahan pada server (Status: " + res.status + "). Pastikan backend berjalan.";
            }
            throw new Error(errorMsg);
        }

        const data = await res.json();
        console.log("Registration successful:", data);

        // Save the unique user ID from backend as sessionId
        localStorage.setItem('sessionId', data.id);

        alert("Pendaftaran Berhasil! Akun kamu telah dibuat.");
        window.location.href = "dashboard-user.html";
    } catch (err) {
        alert(err.message);
        btnSubmit.textContent = originalText;
        btnSubmit.disabled = false;
    }
}