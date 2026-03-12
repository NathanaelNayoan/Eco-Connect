(() => {
    const CONFIG = {
        rupiahPerCoin: 100,
        storage: {
            profile: "ec_profile_v1",
            balanceCoins: "ec_balance_coins_v1",
            waste: "ec_waste_exchanges_v1",
            cashout: "ec_cashouts_v1",
        },
    };

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const idr = new Intl.NumberFormat("id-ID");

    function formatRupiah(value) {
        const n = Number(value || 0);
        return `Rp ${idr.format(Math.round(n))}`;
    }

    function formatNumber(value) {
        const n = Number(value || 0);
        const isInt = Number.isInteger(n);
        return isInt ? idr.format(n) : n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
    }

    function toISODateTime(d = new Date()) {
        return d.toISOString();
    }

    function formatDateTimeID(iso) {
        const d = new Date(iso);
        const date = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
        const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
        return `${date} • ${time}`;
    }

    function safeJsonParse(raw, fallback) {
        try {
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    }

    // Obsolete local storage functions (keep dummy interfaces if needed, or remove)
    function loadBalanceCoins() { return 0; }
    function saveBalanceCoins() { }

    const API_URL = '';

    async function fetchData(url) {
        try {
            const res = await fetch(API_URL + url);
            if (res.ok) return await res.json();
            console.error("API Error at " + url + ", Status:", res.status);
            if (res.status === 404) alert("Data tidak ditemukan (404) di " + url);
        } catch (e) {
            console.error("Fetch failed for " + url + ":", e);
            alert("Terjadi kesalahan jaringan saat mengambil data.");
        }
        return [];
    }

    // Helper functions for API (replacing localStorage)
    async function getWastes() { return await fetchData('/api/admin/waste'); }
    async function getCashouts() { return await fetchData('/api/admin/cashout'); }
    async function getStats() { return await fetchData('/api/admin/stats'); }

    // Obsolete local storage functions (keep dummy interfaces if needed, or remove)
    function loadWaste() { return []; }
    function saveWaste() { }
    function loadCashouts() { return []; }
    function saveCashouts() { }

    function calcCoinsEarned({ jenis, beratKg }) {
        const w = Number(beratKg || 0);
        const multiplier = (() => {
            const labels = Array.isArray(jenis) ? jenis : String(jenis || "").split(",");
            const t = labels.map((x) => String(x).toLowerCase().trim());
            if (t.some((v) => v.includes("plastik"))) return 1.1;
            if (t.some((v) => v.includes("karton"))) return 1.05;
            if (t.some((v) => v.includes("kertas"))) return 1.0;
            return 1.0;
        })();

        const baseCoinsPerKg = 100;
        return Math.max(0, Math.round(w * baseCoinsPerKg * multiplier));
    }

    // State Management
    let currentWasteTab = "Menunggu";
    let currentCashoutTab = "Diproses";
    let selectedWasteIdForVerif = null;
    let selectedCashoutIdForVerif = null;

    // Modals
    const wasteModal = $("#modal-verif-waste");
    const wasteModalActualKgInput = $("#modal-waste-actualkg");
    const wasteModalUserKgInput = $("#modal-waste-userkg");

    const cashoutModal = $("#modal-verif-cashout");
    const cashoutModalProofInput = $("#modal-cashout-proof");

    function setActivePage(pageId) {
        $$(".page").forEach((p) => p.classList.toggle("active", p.id === pageId));
        $$(".side-link").forEach((b) => b.classList.toggle("active", b.dataset.page === pageId));

        const pageTitleMap = {
            "page-overview": "Beranda",
            "page-verify-user": "Verifikasi Pengguna",
            "page-verify-waste": "Verifikasi Sampah",
            "page-verify-cashout": "Verifikasi Pencairan",
            "page-contacts": "Pesan Masuk",
            "page-stats": "Data Pengguna",
        };

        const t = pageTitleMap[pageId] || "Beranda Admin";
        const elTitle = $("#topbar-title");
        if (elTitle) elTitle.textContent = t;
        history.replaceState({}, "", `#${pageId.replace("page-", "")}`);
    }

    // ================= START NEW VERIF UI =================
    async function loadPendingUsers() {
        try {
            const res = await fetch(`${API_URL}/api/admin/users/pending`);
            if (res.ok) return await res.json();
        } catch (e) {
            console.error(e);
        }
        return [];
    }

    async function renderPendingUserList() {
        const container = $("#user-verify-list-container");
        if (!container) return;

        const users = await loadPendingUsers();

        if (users.length === 0) {
            container.innerHTML = `<div style="text-align:center;color:var(--muted);padding:32px;background:var(--panel);border-radius:12px;border:1px solid var(--border);">Tidak ada pengguna yang membutuhkan verifikasi saat ini.</div>`;
            return;
        }

        container.innerHTML = users.map(u => {
            const dateStr = formatDateTimeID(u.createdAt);
            const dataStr = encodeURIComponent(JSON.stringify(u)); // stringify to pass in data attribute

            return `
            <div style="background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:16px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-size:12px; color:var(--muted); margin-bottom:4px;">UID: ${u.id} • Daftar: ${dateStr}</div>
                    <div style="font-weight:600; margin-bottom:4px;">${u.fullName}</div>
                    <div style="font-size:14px; margin-bottom:4px; display:flex; gap: 12px; align-items:center;">
                         <span><i class="fa-solid fa-location-dot" style="color:var(--muted);"></i> ${u.kelurahan || '-'}, ${u.kecamatan || '-'}</span>
                         <span><i class="fa-solid fa-cake-candles" style="color:var(--muted);"></i> ${u.birthDate || '-'}</span>
                    </div>
                </div>
                <div style="text-align:right;">
                    <button class="btn btn-primary btn-sm btn-review-user" data-user="${dataStr}">Tinjau Pendaftaran</button>
                </div>
            </div>
            `;
        }).join("");

        // Wire buttons
        $$(".btn-review-user", container).forEach(btn => {
            btn.addEventListener("click", () => {
                const u = JSON.parse(decodeURIComponent(btn.dataset.user));
                openUserVerificationModal(u);
            });
        });
    }

    function openUserVerificationModal(user) {
        const modal = $("#modal-verif-user");
        if (!modal) return;

        $("#vu-fullname").textContent = user.fullName || "-";

        // Calculate Age
        let ageStr = "-";
        if (user.birthDate) {
            const dob = new Date(user.birthDate);
            const today = new Date();
            let age = today.getFullYear() - dob.getFullYear();
            const m = today.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
                age--;
            }
            ageStr = `${age} Tahun (${user.birthDate})`;
        }

        $("#vu-age").textContent = ageStr;
        $("#vu-gender").textContent = user.gender === 'L' ? 'Laki-laki' : (user.gender === 'P' ? 'Perempuan' : (user.gender || '-'));
        $("#vu-contact").textContent = user.phone || user.email || "-";
        $("#vu-address").textContent = `${user.kelurahan || '-'}, ${user.kecamatan || '-'}`;

        const baseUrl = API_URL;
        const setImg = (id, path) => {
            const el = $(id);
            if (!el) return;
            if (path) {
                el.src = path.startsWith('/') ? baseUrl + path : path;
                el.style.display = "block";
                el.previousElementSibling.style.display = "none"; // Hide fallback text
            } else {
                el.style.display = "none";
                el.previousElementSibling.style.display = "block";
            }
        };

        setImg("#vu-ktp-img", user.idCardPhoto);
        setImg("#vu-selfie-img", user.selfiePhoto);

        // Store active user ID for approval
        const btnApprove = $("#btn-save-user-verif");
        if (btnApprove) btnApprove.dataset.id = user.id;

        modal.style.display = "flex";
    }

    function wireUserModal() {
        const btnClose = $("#btn-close-user-modal");
        const modal = $("#modal-verif-user");
        if (btnClose && modal) {
            btnClose.addEventListener("click", () => {
                modal.style.display = "none";
            });
        }

        const btnApprove = $("#btn-save-user-verif");
        if (btnApprove) {
            btnApprove.addEventListener("click", async () => {
                const uid = btnApprove.dataset.id;
                if (!uid) return;

                btnApprove.disabled = true;
                btnApprove.textContent = "Menyetujui...";

                try {
                    const res = await fetch(`${API_URL}/api/admin/users/${uid}/verify`, { method: "PUT" });
                    if (!res.ok) throw new Error("Gagal menyetujui akun.");
                    alert("Akun berhasil disetujui!");
                    modal.style.display = "none";
                    renderPendingUserList(); // refresh list
                    renderOverview(); // update counter if implemented
                } catch (e) {
                    alert(e.message);
                } finally {
                    btnApprove.disabled = false;
                    btnApprove.innerHTML = `<i class="fa-solid fa-check"></i> Setujui Akun Ini`;
                }
            });
        }
    }
    // ================= END NEW VERIF UI =================

    function wireNavigation() {
        $$(".side-link").forEach((btn) => {
            btn.addEventListener("click", () => setActivePage(btn.dataset.page));
        });

        const logoutBtn = $("#btn-logout");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                const conf = confirm("Apakah Anda yakin ingin keluar?");
                if (conf) {
                    localStorage.removeItem('sessionId');
                    window.location.href = "login.html";
                }
            });
        }

        const refreshBtn = $("#btn-refresh");
        if (refreshBtn) {
            refreshBtn.addEventListener("click", () => {
                renderAll();
            });
        }

        // Waste Tabs
        $$("#waste-tabs button").forEach(btn => {
            btn.addEventListener("click", () => {
                $$("#waste-tabs button").forEach(b => b.classList.remove("active", "btn-soft"));
                $$("#waste-tabs button").forEach(b => b.classList.add("btn-ghost"));
                btn.classList.add("active", "btn-soft");
                btn.classList.remove("btn-ghost");
                currentWasteTab = btn.dataset.tab;
                renderWasteList();
            });
        });

        // Cashout Tabs
        $$("#cashout-tabs button").forEach(btn => {
            btn.addEventListener("click", () => {
                $$("#cashout-tabs button").forEach(b => b.classList.remove("active", "btn-soft"));
                $$("#cashout-tabs button").forEach(b => b.classList.add("btn-ghost"));
                btn.classList.add("active", "btn-soft");
                btn.classList.remove("btn-ghost");
                currentCashoutTab = btn.dataset.tab;
                renderCashoutList();
            });
        });
    }

    // ================= render overview =================
    async function renderOverview() {
        const stats = await getStats();

        if ($("#ov-users")) $("#ov-users").textContent = stats.totalUsers || 0;
        if ($("#ov-pending-users")) $("#ov-pending-users").textContent = stats.pendingUsers || 0;

        if ($("#ov-pending-waste")) $("#ov-pending-waste").textContent = stats.pendingWaste || 0;
        if ($("#ov-pending-cashout")) $("#ov-pending-cashout").textContent = stats.pendingCashout || 0;

        renderAnnualPieChart(stats.wasteRows || []);
        renderUserRanking(stats.usersRanking || []);
    }

    let annualPieChartInstance = null;

    function renderAnnualPieChart(wastes) {
        const ctx = $("#chart-annual-waste");
        if (!ctx) return;

        if (annualPieChartInstance) annualPieChartInstance.destroy();

        const now = Date.now();
        const oneYear = 365 * 24 * 60 * 60 * 1000;

        let plastikKg = 0;
        let kertasKg = 0;
        let kartonKg = 0;

        wastes.forEach(w => {
            if (w.status !== "Selesai") return;
            const t = new Date(w.statusUpdatedAt || w.createdAt || 0).getTime();
            if (now - t > oneYear) return;

            const kg = Number(w.beratActual || w.beratKg || 0);
            const jenisArr = typeof w.jenis === 'string' ? w.jenis.split(',') : (w.jenis || []);
            const numJenis = jenisArr.length || 1;
            const kgPerJenis = kg / numJenis; // Membagi rata berat aktual ke jenis sampah yang ada

            jenisArr.forEach(j => {
                const jenisLower = j.trim().toLowerCase();
                if (jenisLower.includes("plastik")) plastikKg += kgPerJenis;
                else if (jenisLower.includes("kertas")) kertasKg += kgPerJenis;
                else if (jenisLower.includes("karton")) kartonKg += kgPerJenis;
            });
        });

        annualPieChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Plastik', 'Kertas', 'Karton'],
                datasets: [{
                    data: [plastikKg, kertasKg, kartonKg],
                    backgroundColor: [
                        'rgba(0, 230, 91, 0.8)',
                        'rgba(255, 152, 0, 0.8)',
                        'rgba(33, 150, 243, 0.8)'
                    ],
                    borderColor: [
                        'rgba(0, 230, 91, 1)',
                        'rgba(255, 152, 0, 1)',
                        'rgba(33, 150, 243, 1)'
                    ],
                    borderWidth: 1,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#A0AAB2',
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += formatNumber(context.parsed) + ' kg';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    function renderUserRanking(usersRanking) {
        const tbody = $("#user-ranking-tbody");
        if (!tbody) return;

        if (!usersRanking || usersRanking.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #9CA3AF; padding: 24px;">Belum ada data pengguna.</td></tr>`;
            return;
        }

        tbody.innerHTML = usersRanking.map((user, index) => {
            let rankBadge = '';
            if (index === 0) {
                rankBadge = `<div style="display:flex;align-items:center;gap:6px;"><i class="fa-solid fa-crown" style="color: #FFD700;"></i> <span style="font-weight:bold;color:#FFD700;">1</span></div>`;
            } else if (index === 1) {
                rankBadge = `<div style="display:flex;align-items:center;gap:6px;"><i class="fa-solid fa-crown" style="color: #C0C0C0;"></i> <span style="font-weight:bold;color:#C0C0C0;">2</span></div>`;
            } else if (index === 2) {
                rankBadge = `<div style="display:flex;align-items:center;gap:6px;"><i class="fa-solid fa-crown" style="color: #CD7F32;"></i> <span style="font-weight:bold;color:#CD7F32;">3</span></div>`;
            } else {
                rankBadge = `<div style="padding-left:14px; color:#A0AAB2; font-weight:bold;">${index + 1}</div>`;
            }

            return `
                <tr>
                    <td>${rankBadge}</td>
                    <td style="font-weight: 500;">${user.name}</td>
                    <td>${formatNumber(user.totalKg || 0)} kg</td>
                    <td style="color: #00E65B; font-weight: 500;">+${formatNumber(user.totalCoin || 0)}</td>
                    <td style="color: #F43F5E;">${formatRupiah(user.totalCashout || 0)}</td>
                </tr>
            `;
        }).join('');
    }

    // ================= render waste validation =================
    async function renderWasteList() {
        const container = $("#waste-list-container");
        if (!container) return;

        let wastes = await getWastes();

        if (currentWasteTab === "Menunggu") {
            wastes = wastes.filter(w => w.status === "Menunggu");
        } else if (currentWasteTab === "Dalam_Penjemputan") {
            wastes = wastes.filter(w => w.status === "Dalam Penjemputan" || w.status === "Dijemput");
        } else if (currentWasteTab === "Selesai") {
            wastes = wastes.filter(w => w.status === "Selesai");
        }

        if (wastes.length === 0) {
            container.innerHTML = `<div style="text-align:center;color:var(--muted);padding:32px;background:var(--panel);border-radius:12px;border:1px solid var(--border);">Tidak ada data.</div>`;
            return;
        }

        container.innerHTML = wastes.map(w => {
            const userName = w.fullName || "User Tidak Dikenal";
            const dateStr = formatDateTimeID(w.createdAt);

            let aksi = '';
            if (w.status !== "Selesai") {
                aksi = `<button class="btn btn-primary btn-sm btn-verify-waste" data-id="${w.id}" data-kg="${w.beratKg}">Verifikasi Berat</button>`;
            }

            let badgeHtml = '';
            if (w.status === "Selesai") {
                badgeHtml = `<span class="badge" style="background: rgba(0,230,91,0.1); color:#00E65B;"><i class="fa-solid fa-circle-check"></i> Selesai</span>`;
            } else if (w.status === "Dijemput" || w.status === "Dalam Penjemputan") {
                badgeHtml = `<span class="badge" style="background: rgba(14, 165, 233, 0.1); color: #0ea5e9;"><i class="fa-solid fa-truck"></i> ${w.status}</span>`;
            } else {
                badgeHtml = `<span class="badge" style="background: rgba(33, 150, 243, 0.1); color: #2196F3;"><i class="fa-solid fa-clock"></i> ${w.status}</span>`;
            }

            return `
            <div style="background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:16px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-size:12px; color:var(--muted); margin-bottom:4px;">UID: ${w.id} • ${dateStr}</div>
                    <div style="font-weight:600; margin-bottom:4px;">${userName}</div>
                    <div style="font-size:14px; margin-bottom:4px;">Jenis: <strong style="color:var(--accent);">${Array.isArray(w.jenis) ? w.jenis.join(", ") : (w.jenis || "-")}</strong> (${w.beratKg || 0} kg)</div>
                    <div style="margin-top:8px;">${badgeHtml}</div>
                </div>
                <div style="text-align:right; display:flex; flex-direction:column; gap:8px;">
                    <button class="btn btn-secondary btn-sm btn-view-photos" data-photos="${w.photos || ''}">
                        <i class="fa-solid fa-image"></i> Lihat Foto
                    </button>
                    ${aksi}
                </div>
            </div>
            `;
        }).join("");

        // Attach action listeners
        $$(".btn-verify-waste", container).forEach(btn => {
            btn.addEventListener("click", () => {
                selectedWasteIdForVerif = btn.dataset.id;
                wasteModalUserKgInput.value = btn.dataset.kg;
                wasteModalActualKgInput.value = ""; // biarkan admin mengisi manual
                wasteModal.style.display = "flex";
            });
        });

        $$(".btn-view-photos", container).forEach(btn => {
            btn.addEventListener("click", () => {
                const photosRaw = btn.dataset.photos;
                const photoViewer = $("#modal-photo-viewer");
                const container = $("#photo-viewer-container");
                if (photoViewer && container) {
                    if (!photosRaw) {
                        container.innerHTML = "<p>Tidak ada foto yang diunggah.</p>";
                    } else {
                        const photosArr = photosRaw.split(',');
                        container.innerHTML = photosArr.map(pUrl => {
                            // Backend API_URL needs to be appended if it's a relative path from uploads
                            const fullUrl = pUrl.startsWith('/') ? API_URL + pUrl : pUrl;
                            return `<img src="${fullUrl}" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid var(--border);" alt="Foto Sampah" />`;
                        }).join("");
                    }
                    photoViewer.style.display = "flex";
                }
            });
        });
    }

    // ================= render cashout validation =================
    async function renderCashoutList() {
        const container = $("#cashout-list-container");
        if (!container) return;

        let cashouts = await getCashouts();

        if (currentCashoutTab === "Diproses") {
            cashouts = cashouts.filter(c => c.status === "Diproses");
        } else if (currentCashoutTab === "Berhasil") {
            cashouts = cashouts.filter(c => c.status === "Berhasil");
        }

        if (cashouts.length === 0) {
            container.innerHTML = `<div style="text-align:center;color:var(--muted);padding:32px;background:var(--panel);border-radius:12px;border:1px solid var(--border);">Tidak ada data.</div>`;
            return;
        }

        container.innerHTML = cashouts.map(c => {
            const userName = c.fullName || "User Tidak Dikenal";
            const dateStr = formatDateTimeID(c.createdAt);
            const rpStr = formatRupiah(c.amountRupiah);

            let badgeHtml = '';
            let actionBtn = '';

            if (c.status === "Berhasil") {
                badgeHtml = `<span class="badge" style="background: rgba(0,230,91,0.1); color:#00E65B;"><i class="fa-solid fa-circle-check"></i> Disetujui</span>`;
                if (c.proofImage) {
                    actionBtn = `<a href="${c.proofImage.startsWith('/') ? API_URL + c.proofImage : c.proofImage}" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none;"><i class="fa-solid fa-image"></i> Lihat Bukti</a>`;
                }
            } else {
                badgeHtml = `<span class="badge" style="background: rgba(255, 152, 0, 0.1); color: #ff9800;"><i class="fa-solid fa-clock"></i> Diproses</span>`;
                actionBtn = `<button class="btn btn-primary btn-sm btn-verif-cashout" data-id="${c.id}"><i class="fa-solid fa-upload"></i> Unggah Bukti TF</button>`;
            }

            return `
            <div style="background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:16px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-size:12px; color:var(--muted); margin-bottom:4px;">UID: ${c.id} • ${dateStr}</div>
                    <div style="font-weight:600; margin-bottom:4px;">${userName}</div>
                    <div style="font-size:14px; margin-bottom:4px;">Request transfer ke: <strong>${c.method} - ${c.accountName} (${c.accountNumber})</strong></div>
                    <div style="font-size:14px; margin-bottom:4px;">Nominal: <strong style="color:var(--accent);">${rpStr}</strong> (${formatNumber(c.coinsUsed)} coin)</div>
                    <div style="margin-top:8px;">${badgeHtml}</div>
                </div>
                <div style="text-align:right;">
                    ${actionBtn}
                </div>
            </div>
            `;
        }).join("");

        $$(".btn-verif-cashout", container).forEach(btn => {
            btn.addEventListener("click", () => {
                selectedCashoutIdForVerif = btn.dataset.id;
                cashoutModalProofInput.value = "";
                cashoutModal.style.display = "flex";
            });
        });
    }

    // ================= render stats =================
    async function renderStats(stats) {
        if (!stats) stats = await getStats();
        const wastes = await getWastes();
        const cashouts = await getCashouts();

        let dataK = { users: stats.locationCounts ? stats.locationCounts["Kalawat"] : 0, weight: 0, rp: 0, p: 0, kr: 0, kt: 0 };
        let dataA = { users: stats.locationCounts ? stats.locationCounts["Airmadidi"] : 0, weight: 0, rp: 0, p: 0, kr: 0, kt: 0 };

        wastes.forEach(w => {
            if (w.status !== "Selesai") return;

            const kg = Number(w.beratActual || w.beratKg || 0);
            const isKalawat = w.lokasi && w.lokasi.includes("Kalawat");
            const isAirmadidi = w.lokasi && w.lokasi.includes("Airmadidi");

            if (isKalawat) {
                dataK.weight += kg;
                let jenisArr = typeof w.jenis === 'string' ? w.jenis.split(',') : (w.jenis || []);
                jenisArr.forEach(j => {
                    let label = j.trim().toLowerCase();
                    if (label.includes("plastik")) dataK.p++;
                    if (label.includes("kertas")) dataK.kr++;
                    if (label.includes("karton")) dataK.kt++;
                });
            } else if (isAirmadidi) {
                dataA.weight += kg;
                let jenisArr = typeof w.jenis === 'string' ? w.jenis.split(',') : (w.jenis || []);
                jenisArr.forEach(j => {
                    let label = j.trim().toLowerCase();
                    if (label.includes("plastik")) dataA.p++;
                    if (label.includes("kertas")) dataA.kr++;
                    if (label.includes("karton")) dataA.kt++;
                });
            }
        });

        cashouts.forEach(c => {
            if (c.status !== "Berhasil") return;

            const isKalawat = c.kecamatan && c.kecamatan.includes("Kalawat");
            const isAirmadidi = c.kecamatan && c.kecamatan.includes("Airmadidi");

            if (isKalawat) {
                dataK.rp += Number(c.amountRupiah);
            } else if (isAirmadidi) {
                dataA.rp += Number(c.amountRupiah);
            }
        });
        if ($("#stat-k-users")) $("#stat-k-users").textContent = dataK.users;
        if ($("#stat-a-users")) $("#stat-a-users").textContent = dataA.users;

        if ($("#stat-k-kg")) $("#stat-k-kg").textContent = `${formatNumber(dataK.weight)} kg`;
        if ($("#stat-a-kg")) $("#stat-a-kg").textContent = `${formatNumber(dataA.weight)} kg`;

        if ($("#stat-k-dist")) {
            $("#stat-k-dist").innerHTML = `<div>Plastik: ${dataK.p}</div><div>Kertas: ${dataK.kr}</div><div>Karton: ${dataK.kt}</div>`;
        }
        if ($("#stat-a-dist")) {
            $("#stat-a-dist").innerHTML = `<div>Plastik: ${dataA.p}</div><div>Kertas: ${dataA.kr}</div><div>Karton: ${dataA.kt}</div>`;
        }

        if ($("#stat-k-rp")) $("#stat-k-rp").textContent = formatRupiah(dataK.rp);
        if ($("#stat-a-rp")) $("#stat-a-rp").textContent = formatRupiah(dataA.rp);

        renderCharts(dataK, dataA);
    }

    let kalawatChartInstance = null;
    let airmadidiChartInstance = null;

    function renderCharts(dataK, dataA) {
        const ctxK = $("#chart-kalawat");
        const ctxA = $("#chart-airmadidi");

        if (kalawatChartInstance) kalawatChartInstance.destroy();
        if (airmadidiChartInstance) airmadidiChartInstance.destroy();

        if (ctxK) {
            kalawatChartInstance = new Chart(ctxK, {
                type: 'bar',
                data: {
                    labels: ['Plastik', 'Kertas', 'Karton'],
                    datasets: [{
                        label: 'Jumlah Transaksi (Jenis Sampah)',
                        data: [dataK.p, dataK.kr, dataK.kt],
                        backgroundColor: [
                            'rgba(0, 230, 91, 0.6)',
                            'rgba(255, 152, 0, 0.6)',
                            'rgba(33, 150, 243, 0.6)'
                        ],
                        borderColor: [
                            'rgba(0, 230, 91, 1)',
                            'rgba(255, 152, 0, 1)',
                            'rgba(33, 150, 243, 1)'
                        ],
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                color: '#A0AAB2'
                            },
                            grid: {
                                color: 'rgba(255,255,255,0.05)'
                            }
                        },
                        x: {
                            ticks: {
                                color: '#A0AAB2'
                            },
                            grid: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: '#A0AAB2'
                            }
                        }
                    }
                }
            });
        }

        if (ctxA) {
            airmadidiChartInstance = new Chart(ctxA, {
                type: 'bar',
                data: {
                    labels: ['Plastik', 'Kertas', 'Karton'],
                    datasets: [{
                        label: 'Jumlah Transaksi (Jenis Sampah)',
                        data: [dataA.p, dataA.kr, dataA.kt],
                        backgroundColor: [
                            'rgba(0, 230, 91, 0.6)',
                            'rgba(255, 152, 0, 0.6)',
                            'rgba(33, 150, 243, 0.6)'
                        ],
                        borderColor: [
                            'rgba(0, 230, 91, 1)',
                            'rgba(255, 152, 0, 1)',
                            'rgba(33, 150, 243, 1)'
                        ],
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                color: '#A0AAB2'
                            },
                            grid: {
                                color: 'rgba(255,255,255,0.05)'
                            }
                        },
                        x: {
                            ticks: {
                                color: '#A0AAB2'
                            },
                            grid: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: '#A0AAB2'
                            }
                        }
                    }
                }
            });
        }
    }

    // ================= modals wiring =================
    function wireModals() {
        // Waste
        $("#btn-close-waste-modal").addEventListener("click", () => {
            wasteModal.style.display = "none";
            selectedWasteIdForVerif = null;
        });

        $("#btn-save-waste-verif").addEventListener("click", async () => {
            const actualKg = Number(wasteModalActualKgInput.value);
            if (!actualKg || actualKg <= 0) return alert("Masukkan berat aktual yang valid.");

            // To find user info, we need the waste
            const wastes = await getWastes();
            const wasteIndex = wastes.findIndex(w => w.id === selectedWasteIdForVerif);

            if (wasteIndex !== -1) {
                let w = wastes[wasteIndex];
                let baseCoins = calcCoinsEarned({ jenis: w.jenis, beratKg: actualKg });

                // check phase 5 logic
                const pastWastes = wastes.filter((past, i) => past.status === "Selesai" && i < wasteIndex && past.userId === w.userId);
                const pastTotalKg = pastWastes.reduce((sum, p) => sum + Number(p.beratActual || p.beratKg || 0), 0);

                if (pastTotalKg > 50) {
                    baseCoins += 500;
                }

                try {
                    const res = await fetch(`${API_URL}/api/admin/waste/${w.id}/verify`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            beratActual: actualKg,
                            coinsEarned: baseCoins,
                            userId: w.userId
                        })
                    });

                    if (!res.ok) throw new Error("Gagal memverifikasi sampah.");

                    alert(`Verifikasi sampah (Aktual: ${actualKg}kg) selesai. ${formatNumber(baseCoins)} coin diberikan ke user.`);
                } catch (e) {
                    alert(e.message);
                }
            }

            wasteModal.style.display = "none";
            selectedWasteIdForVerif = null;
            await renderAll();
        });

        // Cashouts
        $("#btn-close-cashout-modal").addEventListener("click", () => {
            cashoutModal.style.display = "none";
            selectedCashoutIdForVerif = null;
        });

        $("#btn-save-cashout-verif").addEventListener("click", async () => {
            if (!cashoutModalProofInput.files || cashoutModalProofInput.files.length === 0) {
                return alert("Harap unggah bukti transfer berformat gambar.");
            }

            const file = cashoutModalProofInput.files[0];

            const formData = new FormData();
            formData.append("proofImage", file);

            try {
                const res = await fetch(`${API_URL}/api/admin/cashout/${selectedCashoutIdForVerif}/proof`, {
                    method: 'PUT',
                    body: formData
                });

                if (!res.ok) throw new Error("Gagal mengunggah bukti transfer.");
                alert(`Bukti transfer "${file.name}" telah berhasil diunggah.`);
            } catch (e) {
                alert(e.message);
            }

            cashoutModal.style.display = "none";
            selectedCashoutIdForVerif = null;
            await renderAll();
        });
    }

    async function getContacts() { return await fetchData('/api/admin/contacts'); }

    // ================= render contacts =================
    async function renderContactList() {
        const container = $("#contacts-list-container");
        if (!container) return;

        const contacts = await getContacts();

        if (!contacts || contacts.length === 0) {
            container.innerHTML = `<div style="text-align:center;color:var(--muted);padding:32px;background:var(--panel);border-radius:12px;border:1px solid var(--border);">Tidak ada pesan masuk.</div>`;
            return;
        }

        container.innerHTML = contacts.map(c => {
            const dateStr = formatDateTimeID(c.createdAt);

            // Format WA number to make it clickable
            let waLink = "#";
            let displayWa = c.whatsapp || "-";
            if (c.whatsapp) {
                // Normalize 08 to 628
                let num = c.whatsapp.replace(/\D/g, '');
                if (num.startsWith('0')) num = '62' + num.substring(1);
                waLink = `https://wa.me/${num}`;
            }

            return `
            <div style="background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:8px;">
                    <div style="font-size:12px; color:var(--muted);">
                        <i class="fa-solid fa-clock"></i> ${dateStr}
                    </div>
                    <span class="badge" style="background:rgba(33, 150, 243, 0.1); color:#2196F3; font-size:11px;">
                        ${c.status || "Pesan Baru"}
                    </span>
                </div>
                <div>
                    <div style="display:flex; gap:16px; margin-bottom:8px; font-size:13px;">
                        <div>
                            <i class="fa-solid fa-envelope" style="color:var(--muted);"></i>
                            <a href="mailto:${c.email}" style="color:var(--accent); text-decoration:none;">${c.email}</a>
                        </div>
                        <div>
                            <i class="fa-brands fa-whatsapp" style="color:#25D366;"></i>
                            <a href="${waLink}" target="_blank" style="color:#e2e8f0; text-decoration:none;">${displayWa}</a>
                        </div>
                    </div>
                    <div style="background:rgba(0,0,0,0.2); padding:12px; border-radius:8px; font-size:14px; line-height:1.5; color:#e2e8f0; border-left:3px solid var(--accent);">
                        ${c.message || "-"}
                    </div>
                </div>
            </div>
            `;
        }).join("");
    }

    async function renderAll() {
        await renderOverview();
        await renderWasteList();
        await renderCashoutList();
        await renderStats();
        await renderContactList();
    }

    async function init() {
        // 1. Matikan event simulasi dashboard user di window object karena kita ada di scope admin
        window.disableAutoSimulate = true;

        wireNavigation();
        wireModals();

        // Hash routing
        const page = (location.hash || "").replace("#", "").trim();
        if (page) {
            setActivePage("page-" + page);
        } else {
            setActivePage("page-overview");
        }

        wireUserModal(); // wire our new modal
        await renderAll();
        renderPendingUserList(); // init independent tab
    }

    document.addEventListener("DOMContentLoaded", init);
})();
