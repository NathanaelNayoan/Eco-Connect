(() => {
  const CONFIG = {
    rupiahPerCoin: 100,
    minWithdrawRupiah: 100_000,
    autoCompleteAfterMs: 8000,
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

  const API_URL = '';
  const getUserId = () => localStorage.getItem('sessionId') || 'user_1';

  async function loadProfile() {
    try {
      const res = await fetch(`${API_URL}/api/profile/${getUserId()}`);
      if (res.ok) {
        const data = await res.json();
        if (data) return data;
      }
    } catch (e) { console.error("Error loading profile:", e); }
    return {
      fullName: "Budi Santoso",
      birthDate: "",
      gender: "",
      contact: "",
      phone: "",
      address: "",
      kecamatan: "",
      kelurahan: "",
      alamatFavorit: "",
      memberSince: new Date().toISOString().slice(0, 10),
    };
  }

  async function saveProfile(profile) {
    // Profil ditarik dari DB. Saat ini simulasi karena profile update API blm dibuat spesifik.
    localStorage.setItem(CONFIG.storage.profile, JSON.stringify(profile));
  }

  async function loadBalanceCoins() {
    try {
      const res = await fetch(`${API_URL}/api/profile/${getUserId()}`);
      if (res.ok) {
        const data = await res.json();
        return data.balanceCoins || 0;
      }
    } catch (e) { console.error(e); }
    return 0;
  }

  function saveBalanceCoins(coins) {
    // Database handled this on backend (admin action / cashout).
  }

  async function loadWaste() {
    try {
      const res = await fetch(`${API_URL}/api/user/waste/${getUserId()}`);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) { console.error(e); }
    return [];
  }

  function saveWaste(items) {
    // Replaced by POST API
  }

  async function loadCashouts() {
    try {
      const res = await fetch(`${API_URL}/api/user/cashout/${getUserId()}`);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) { console.error(e); }
    return [];
  }

  function saveCashouts(items) {
    // Replaced by POST API
  }

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

  function coinsToRupiah(coins) {
    return Math.round((Number(coins || 0) * CONFIG.rupiahPerCoin));
  }

  function rupiahToCoins(rupiah) {
    return Math.floor(Number(rupiah || 0) / CONFIG.rupiahPerCoin);
  }

  function maskAccountNumber(s) {
    const raw = String(s || "").replace(/\s+/g, "");
    if (raw.length <= 6) return raw;
    const first = raw.slice(0, 3);
    const last = raw.slice(-3);
    return `${first}•••${last}`;
  }

  function uid(prefix) {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  }

  function setActivePage(pageId) {
    $$(".page").forEach((p) => p.classList.toggle("active", p.id === pageId));
    $$(".side-link").forEach((b) => b.classList.toggle("active", b.dataset.page === pageId));
    const pageTitleMap = {
      "page-overview": "Overview",
      "page-waste": "Tukar Sampah",
      "page-cashout": "Tukar Uang",
      "page-profile": "Profil",
    };
    const t = pageTitleMap[pageId] || "Dashboard";
    const elTitle = $("#topbar-title");
    if (elTitle) elTitle.textContent = t;
    history.replaceState({}, "", `#${pageId.replace("page-", "")}`);
  }

  function getPageFromHash() {
    const raw = (location.hash || "").replace("#", "").trim();
    const map = {
      overview: "page-overview",
      waste: "page-waste",
      cashout: "page-cashout",
      profile: "page-profile",
    };
    return map[raw] || "page-overview";
  }

  async function refreshDerivedStates() {
    renderAll();
  }

  async function renderSidebarProfile() {
    const profile = await loadProfile();
    const name = profile.fullName || "Pengguna";
    const initials = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "EC";

    const avatar = $("#sidebar-avatar");
    const nameEl = $("#sidebar-name");
    if (avatar) avatar.textContent = initials;
    if (nameEl) nameEl.textContent = name;

    const greet = $("#greet-name");
    if (greet) greet.textContent = name.split(" ")[0] || name;
  }

  async function renderOverviewCards() {
    const waste = await loadWaste();
    const cashouts = await loadCashouts();
    const balanceCoins = await loadBalanceCoins();

    const totalKg = waste.reduce((acc, w) => acc + Number(w.beratActual || w.beratKg || 0), 0);
    const totalEarnedCoins = waste.reduce((acc, w) => acc + Number(w.coinsEarned || w.coins || 0), 0);
    const totalWithdrawRupiah = cashouts
      .filter((c) => c.status === "Berhasil")
      .reduce((acc, c) => acc + Number(c.amountRupiah || 0), 0);

    const setText = (id, text) => {
      const el = $(id);
      if (el) el.textContent = text;
    };

    setText("#ov-total-kg", `${formatNumber(totalKg)} kg`);
    setText("#ov-balance-coins", `${formatNumber(balanceCoins)} coin`);
    setText("#ov-balance-rupiah", formatRupiah(coinsToRupiah(balanceCoins)));
    setText("#ov-withdrawn", formatRupiah(totalWithdrawRupiah));

    const eq = $("#ov-earned-coins");
    if (eq) eq.textContent = `${formatNumber(totalEarnedCoins)} coin terkumpul`;

    // Render Virtual Tree
    const animTree = $("#anim-tree");
    const phaseLabel = $("#vt-phase");
    const heightLabel = $("#vt-height");
    const bonusTpl = $("#vt-bonus");

    let phase = 1, height = 5, scaleStr = "scale(0.2)";
    if (totalKg > 50) {
      phase = 5; height = 25; scaleStr = "scale(1)";
    } else if (totalKg > 30) {
      phase = 4; height = 20; scaleStr = "scale(0.8)";
    } else if (totalKg > 15) {
      phase = 3; height = 15; scaleStr = "scale(0.6)";
    } else if (totalKg > 5) {
      phase = 2; height = 10; scaleStr = "scale(0.4)";
    }

    if (animTree) {
      animTree.style.transform = scaleStr;
    }
    if (phaseLabel) phaseLabel.textContent = `Fase ${phase}`;
    if (heightLabel) heightLabel.textContent = `Tinggi: ${height} cm`;
    if (bonusTpl) bonusTpl.style.display = (phase === 5) ? "block" : "none";
  }

  async function renderWastePage() {
    const wasteList = await loadWaste();
    const waste = wasteList.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalKg = waste.reduce((acc, w) => acc + Number(w.beratActual || w.beratKg || 0), 0);
    const totalCoins = waste.reduce((acc, w) => acc + Number(w.coinsEarned || w.coins || 0), 0);

    const s1 = $("#waste-total-kg");
    const s2 = $("#waste-total-coins");
    if (s1) s1.textContent = `${formatNumber(totalKg)} kg`;
    if (s2) s2.textContent = `${formatNumber(totalCoins)} coin`;

    const tb = $("#waste-tbody");
    if (tb) {
      tb.innerHTML = waste
        .map((w) => {
          let badge = '';
          if (w.status === "Selesai") {
            badge = `<span class="badge success"><i class="fa-solid fa-circle-check"></i> Selesai</span>`;
          } else if (w.status === "Dijemput") {
            badge = `<span class="badge" style="background: rgba(14, 165, 233, 0.1); color: #0ea5e9;"><i class="fa-solid fa-truck"></i> Dijemput</span>`;
          } else {
            badge = `<span class="badge pending"><i class="fa-solid fa-clock"></i> ${w.status || "Menunggu"}</span>`;
          }
          const jenisLabel = Array.isArray(w.jenis) ? w.jenis.join(", ") : (w.jenis || "-");
          const photoCount = Array.isArray(w.photos) ? w.photos.length : (w.photos ? w.photos.split(',').length : 0);
          const photoText = photoCount > 0 ? `${photoCount} foto` : "-";
          const dKg = w.beratActual || w.beratKg;
          const dCoins = w.coinsEarned || w.coins || 0;
          return `
            <tr>
              <td>${formatDateTimeID(w.createdAt)}</td>
              <td>${jenisLabel}</td>
              <td>${formatNumber(dKg)} kg</td>
              <td>${photoText}</td>
              <td>${w.lokasi || "-"}</td>
              <td>${badge}</td>
              <td>+${formatNumber(dCoins)} coin</td>
            </tr>
          `;
        })
        .join("");
    }
  }

  async function renderCashoutPage() {
    const cashoutsList = await loadCashouts();
    const cashouts = cashoutsList.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const balanceCoins = await loadBalanceCoins();
    const balanceRupiah = coinsToRupiah(balanceCoins);

    const totalWithdrawRupiah = cashouts
      .filter((c) => c.status === "Berhasil")
      .reduce((acc, c) => acc + Number(c.amountRupiah || 0), 0);

    const b1 = $("#cashout-balance-coins");
    const b2 = $("#cashout-balance-rupiah");
    const b3 = $("#cashout-total-withdrawn");
    if (b1) b1.textContent = `${formatNumber(balanceCoins)} coin`;
    if (b2) b2.textContent = formatRupiah(balanceRupiah);
    if (b3) b3.textContent = formatRupiah(totalWithdrawRupiah);

    const minHint = $("#cashout-min-hint");
    if (minHint) minHint.textContent = `Minimal pencairan ${formatRupiah(CONFIG.minWithdrawRupiah)}.`;

    const tb = $("#cashout-tbody");
    if (tb) {
      tb.innerHTML = cashouts
        .map((c) => {
          const badge =
            c.status === "Berhasil"
              ? `<span class="badge success"><i class="fa-solid fa-circle-check"></i> Berhasil</span>`
              : `<span class="badge pending"><i class="fa-solid fa-clock"></i> Diproses</span>`;
          const via = c.method === "bank" ? `Bank • ${c.provider}` : `E-Wallet • ${c.provider}`;
          return `
            <tr>
              <td>${formatDateTimeID(c.createdAt)}</td>
              <td>${via}</td>
              <td>${maskAccountNumber(c.accountNumber || "-")}</td>
              <td>${c.accountName || "-"}</td>
              <td>${formatRupiah(c.amountRupiah)}</td>
              <td>-${formatNumber(c.coinsUsed || c.coins)} coin</td>
              <td>${badge}</td>
            </tr>
          `;
        })
        .join("");
    }

    const notice = $("#cashout-notice");
    if (notice) {
      if (balanceRupiah < CONFIG.minWithdrawRupiah) {
        notice.className = "notice";
        notice.innerHTML = `Saldo kamu belum cukup untuk dicairkan. <strong>Minimal ${formatRupiah(CONFIG.minWithdrawRupiah)}</strong>.`;
      } else {
        notice.className = "notice ok";
        notice.innerHTML = `Saldo kamu sudah memenuhi minimal pencairan. Kamu bisa mencairkan mulai <strong>${formatRupiah(CONFIG.minWithdrawRupiah)}</strong>.`;
      }
    }
  }

  async function renderProfilePage() {
    const profile = await loadProfile();
    const setText = (id, value) => {
      const el = $(id);
      if (el) el.textContent = value || "-";
    };
    setText("#pf-fullName-text", profile.fullName);
    setText("#pf-contact-text", profile.contact || profile.phone);
    const birthLabel = profile.birthDate
      ? new Date(profile.birthDate).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
      : "";
    setText("#pf-birth-text", birthLabel);
    setText("#pf-gender-text", profile.gender);
    const memberId = `EC-${(profile.fullName || "USER").split(" ").map((p) => p[0]?.toUpperCase()).join("")}-${(profile.memberSince || "").replace(/-/g, "").slice(2)}`;
    setText("#pf-memberId-text", memberId);
    setText("#pf-kecamatan-text", profile.kecamatan);
    setText("#pf-kelurahan-text", profile.kelurahan);
    const ms = $("#pf-memberSince");
    if (ms) ms.textContent = profile.memberSince ? `Bergabung sejak ${profile.memberSince}` : "";
  }

  async function renderAll() {
    await renderSidebarProfile();
    await renderOverviewCards();
    await renderWastePage();
    await renderCashoutPage();
    await renderProfilePage();
    await checkKYC();
  }

  async function checkKYC() {
    const profile = await loadProfile();
    const isVerified = parseInt(profile.isVerified) === 1;

    // --- OVERVIEW BANNER ---
    const overviewPage = $("#page-overview");
    let overviewBanner = $("#kyc-overview-banner");
    const actionsPanel = $(".panel .actions"); // The Quick Actions buttons container
    const goWasteBtn = $("#go-waste");
    const goCashoutBtn = $("#go-cashout");

    if (!isVerified && overviewPage) {
      if (!overviewBanner) {
        overviewBanner = document.createElement("div");
        overviewBanner.id = "kyc-overview-banner";
        overviewBanner.className = "notice";
        overviewBanner.style.backgroundColor = "rgba(234, 179, 8, 0.1)"; // Yellow-ish background
        overviewBanner.style.color = "#a16207"; // Dark yellow text
        overviewBanner.style.border = "1px solid rgba(234, 179, 8, 0.3)";
        overviewBanner.style.marginBottom = "20px";
        overviewBanner.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <strong>Akun Anda Belum Diverifikasi:</strong> Mohon tunggu admin untuk memverifikasi pendaftaran Anda (KTP & Selfie). Anda belum bisa menggunakan fitur penukaran sampah dan pencairan uang.`;
        // Insert right at the top of the overview content (before the cards)
        overviewPage.insertBefore(overviewBanner, overviewPage.firstChild);
      }
      // Disable quick action buttons
      if (goWasteBtn) goWasteBtn.disabled = true;
      if (goCashoutBtn) goCashoutBtn.disabled = true;
    } else if (isVerified) {
      if (overviewBanner) overviewBanner.remove();
      if (goWasteBtn) goWasteBtn.disabled = false;
      if (goCashoutBtn) goCashoutBtn.disabled = false;
    }

    // --- WASTE FORM ---
    const wasteForm = $("#form-waste");
    const wasteBtn = wasteForm ? wasteForm.querySelector('button[type="submit"]') : null;
    let kycNoticeWaste = $("#kyc-notice-waste");
    if (!isVerified && wasteForm) {
      if (!kycNoticeWaste) {
        kycNoticeWaste = document.createElement("div");
        kycNoticeWaste.id = "kyc-notice-waste";
        kycNoticeWaste.className = "notice";
        kycNoticeWaste.style.marginBottom = "10px";
        kycNoticeWaste.style.backgroundColor = "rgba(234, 179, 8, 0.1)";
        kycNoticeWaste.style.color = "#a16207";
        kycNoticeWaste.style.border = "1px solid rgba(234, 179, 8, 0.3)";
        kycNoticeWaste.innerHTML = `<i class="fa-solid fa-lock"></i> <strong>Perhatian:</strong> Akun Anda sedang dalam proses verifikasi identitas (KYC) oleh Admin. Fitur penukaran sampah dikunci sementara.`;
        wasteForm.prepend(kycNoticeWaste);
      }
      if (wasteBtn) {
        wasteBtn.disabled = true;
        wasteBtn.textContent = "Menunggu Verifikasi";
        wasteBtn.style.opacity = "0.5";
        wasteBtn.style.cursor = "not-allowed";
      }
      // Disable inputs inside the form
      Array.from(wasteForm.elements).forEach(el => {
        if (el !== wasteBtn) el.disabled = true;
      });
    } else if (isVerified && wasteForm) {
      if (kycNoticeWaste) kycNoticeWaste.remove();
      if (wasteBtn) {
        wasteBtn.disabled = false;
        wasteBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Kirim Permintaan`;
        wasteBtn.style.opacity = "1";
        wasteBtn.style.cursor = "pointer";
      }
      // Assuming initAddressOptions map handles its own disabling logic correctly, we just enable the basics
      const berat = $("#waste-berat");
      const foto = $("#waste-foto");
      if (berat) berat.disabled = false;
      if (foto) foto.disabled = false;
      // Let existing logic handle address dropdown states
    }

    // --- CASHOUT FORM ---
    const cashForm = $("#form-cashout");
    const cashBtn = cashForm ? cashForm.querySelector('button[type="submit"]') : null;
    let kycNoticeCash = $("#kyc-notice-cashout");
    if (!isVerified && cashForm) {
      if (!kycNoticeCash) {
        kycNoticeCash = document.createElement("div");
        kycNoticeCash.id = "kyc-notice-cashout";
        kycNoticeCash.className = "notice";
        kycNoticeCash.style.marginBottom = "10px";
        kycNoticeCash.style.backgroundColor = "rgba(234, 179, 8, 0.1)";
        kycNoticeCash.style.color = "#a16207";
        kycNoticeCash.style.border = "1px solid rgba(234, 179, 8, 0.3)";
        kycNoticeCash.innerHTML = `<i class="fa-solid fa-lock"></i> <strong>Perhatian:</strong> Akun Anda sedang dalam proses verifikasi identitas (KYC) oleh Admin. Fitur penarikan dana dikunci sementara.`;
        cashForm.prepend(kycNoticeCash);
      }
      if (cashBtn) {
        cashBtn.disabled = true;
        cashBtn.textContent = "Menunggu Verifikasi";
        cashBtn.style.opacity = "0.5";
        cashBtn.style.cursor = "not-allowed";
      }
      // Disable inputs inside the form
      Array.from(cashForm.elements).forEach(el => {
        if (el !== cashBtn) el.disabled = true;
      });
    } else if (isVerified && cashForm) {
      if (kycNoticeCash) kycNoticeCash.remove();
      if (cashBtn) {
        cashBtn.disabled = false;
        cashBtn.innerHTML = `<i class="fa-solid fa-money-bill-transfer"></i> Ajukan Pencairan`;
        cashBtn.style.opacity = "1";
        cashBtn.style.cursor = "pointer";
      }
      Array.from(cashForm.elements).forEach(el => {
        if (el !== cashBtn) el.disabled = false;
      });
    }
  }

  function wireNavigation() {
    $$(".side-link").forEach((btn) => {
      btn.addEventListener("click", () => setActivePage(btn.dataset.page));
    });
    window.addEventListener("hashchange", () => setActivePage(getPageFromHash()));
  }

  function wireOverviewShortcuts() {
    const go = (id, page) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("click", () => setActivePage(page));
    };
    go("#go-waste", "page-waste");
    go("#go-cashout", "page-cashout");
    go("#go-profile", "page-profile");
  }

  function wireWasteForm() {
    const form = $("#form-waste");
    if (!form) return;

    const jenisGroup = $("#waste-jenis-group");
    const berat = $("#waste-berat");
    const foto = $("#waste-foto");
    const kecamatan = $("#waste-kecamatan");
    const lokasi = $("#waste-lokasi");
    const detail = $("#waste-detail");
    const phone = $("#waste-phone");
    const coinPreview = $("#waste-coin-preview");
    const photoPreview = $("#waste-photo-preview");

    const btnPickMap = $("#btn-pick-map");
    const mapContainer = $("#map-container");

    // Fitur Alamat
    const addrSource = $("#waste-address-source");
    const saveFavBtn = $("#btn-save-favorit");
    const saveFavContainer = $("#save-fav-container");
    let currentProfile = null;

    let map = null;
    let marker = null;
    let selectedWasteFiles = [];

    // Menginisiasi nilai awal input form sampah berdasarkan Profile User
    async function initAddressOptions() {
      currentProfile = await loadProfile();
      if (!addrSource) return;

      // Reset value first
      addrSource.value = "profil";
      applyAddressSource("profil");

      addrSource.addEventListener("change", (e) => {
        applyAddressSource(e.target.value);
      });
    }

    function applyAddressSource(sourceTyp) {
      if (!currentProfile) return;

      if (sourceTyp === "profil") {
        kecamatan.value = currentProfile.kecamatan || "";
        lokasi.value = currentProfile.kelurahan || "";
        if (detail) { detail.value = ""; detail.disabled = false; }
        if (phone) { phone.value = currentProfile.phone || currentProfile.contact || ""; phone.disabled = false; }
        kecamatan.disabled = true;
        lokasi.disabled = true;
        saveFavContainer.style.display = "none";
        if (btnPickMap) btnPickMap.style.display = "none";
        if (mapContainer) mapContainer.style.display = "none";
      } else if (sourceTyp === "favorit") {
        const favStr = currentProfile.alamatFavorit || "";
        if (favStr) {
          const parts = favStr.split("|");
          kecamatan.value = parts[0] || "";
          lokasi.value = parts[1] || "";
          if (detail) { detail.value = parts[2] || ""; detail.disabled = false; }
          if (phone) { phone.value = parts[3] || currentProfile.phone || currentProfile.contact || ""; phone.disabled = false; }
        } else {
          kecamatan.value = "";
          lokasi.value = "";
          if (detail) detail.value = "";
          if (phone) phone.value = "";
          alert("Alamat Favorit belum disetel. Silakan ketik baru dan simpan.");
          addrSource.value = "baru";
          return applyAddressSource("baru"); // fallback
        }
        kecamatan.disabled = true;
        lokasi.disabled = true;
        saveFavContainer.style.display = "none";
        if (btnPickMap) {
          btnPickMap.style.display = "inline-flex";
          btnPickMap.innerHTML = '<i class="fa-solid fa-map-location-dot"></i> Pilih dari Peta';
        }
        if (mapContainer) mapContainer.style.display = "none";
      } else if (sourceTyp === "baru") {
        kecamatan.value = "";
        lokasi.value = "";
        if (detail) { detail.value = ""; detail.disabled = false; }
        if (phone) { phone.value = ""; phone.disabled = false; }
        kecamatan.disabled = false;
        lokasi.disabled = false;
        saveFavContainer.style.display = "block";
        if (btnPickMap) {
          btnPickMap.style.display = "inline-flex";
          btnPickMap.innerHTML = '<i class="fa-solid fa-map-location-dot"></i> Pilih dari Peta';
        }
        if (mapContainer) mapContainer.style.display = "none";
      }
    }

    if (saveFavBtn) {
      saveFavBtn.addEventListener("click", async () => {
        const kec = kecamatan.value;
        const lok = lokasi.value;
        const det = detail ? detail.value : "";
        const phn = phone ? phone.value : "";
        if (!kec || !lok || !det || !phn) return alert("Isi kecamatan, kelurahan, detail, dan telepon terlebih dahulu.");

        const favString = `${kec}|${lok}|${det}|${phn}`;
        try {
          // Simpan via API
          const res = await fetch(`${API_URL}/api/user/address/${getUserId()}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alamatFavorit: favString })
          });
          if (!res.ok) throw new Error("Gagal menyimpan alamat favorit.");

          alert("Alamat Favorit berhasil disimpan!");
          // Mutate cache locally spy kalau buka lagi favorit ngga perlu load total dr db
          currentProfile = await loadProfile();
        } catch (e) {
          alert(e.message);
        }
      });
    }

    initAddressOptions();

    if (btnPickMap && mapContainer) {
      btnPickMap.addEventListener("click", () => {
        const isHidden = mapContainer.style.display === "none";
        if (isHidden) {
          mapContainer.style.display = "block";
          btnPickMap.innerHTML = '<i class="fa-solid fa-xmark"></i> Tutup Peta';

          if (!map && window.L) {
            map = L.map("map-container").setView([1.4170, 124.9620], 13); // Airmadidi/Kalawat Center
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            if ("geolocation" in navigator) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const lat = pos.coords.latitude;
                  const lng = pos.coords.longitude;
                  map.setView([lat, lng], 15);
                  if (!marker) {
                    marker = L.marker([lat, lng]).addTo(map);
                  } else {
                    marker.setLatLng([lat, lng]);
                  }
                  fetchAddress(lat, lng);
                },
                (err) => console.warn("Geolocation failed", err),
                { enableHighAccuracy: true }
              );
            }

            map.on("click", (e) => {
              const { lat, lng } = e.latlng;
              if (!marker) {
                marker = L.marker([lat, lng]).addTo(map);
              } else {
                marker.setLatLng([lat, lng]);
              }
              fetchAddress(lat, lng);
            });
          } else if (map && window.L) {
            setTimeout(() => map.invalidateSize(), 100);
          }
        } else {
          mapContainer.style.display = "none";
          btnPickMap.innerHTML = '<i class="fa-solid fa-map-location-dot"></i> Pilih dari Peta';
        }
      });
    }

    async function fetchAddress(lat, lng) {
      if (lokasi) lokasi.value = "Mengambil alamat...";
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
        if (!res.ok) throw new Error("Gagal mengambil data");
        const data = await res.json();
        const addressStr = data.display_name || "";

        const lowerAddr = addressStr.toLowerCase();
        let foundKecamatan = "";

        if (lowerAddr.includes("airmadidi")) {
          foundKecamatan = "Airmadidi";
        } else if (lowerAddr.includes("kalawat")) {
          foundKecamatan = "Kalawat";
        }

        if (foundKecamatan) {
          if (kecamatan) kecamatan.value = foundKecamatan;
          if (lokasi) lokasi.value = addressStr;
        } else {
          alert("Mohon maaf, lokasi penjemputan saat ini hanya tersedia untuk Kecamatan Airmadidi dan Kalawat.");
          if (lokasi) lokasi.value = "";
          if (marker) map.removeLayer(marker);
          marker = null;
        }

      } catch (err) {
        if (lokasi) lokasi.value = `Lat: ${lat}, Lng: ${lng}`;
        console.error(err);
      }
    }

    function getSelectedJenis() {
      if (!jenisGroup) return [];
      return Array.from(jenisGroup.querySelectorAll("input[type='checkbox']:checked")).map((c) => c.value);
    }

    async function updateCoinPreview() {
      const jenis = getSelectedJenis();
      let coins = calcCoinsEarned({ jenis, beratKg: berat?.value });

      const waste = await loadWaste();
      const totalKg = waste.reduce((acc, w) => acc + Number(w.beratActual || w.beratKg || 0), 0);
      let bonusText = "";
      if (totalKg > 50) {
        coins += 500;
        bonusText = " (+500 Bonus Fase 5)";
      }

      if (coinPreview) coinPreview.textContent = `Perkiraan reward: +${formatNumber(coins)} Eco-coin${bonusText}`;
    }

    function updatePhotoPreview(e) {
      if (!photoPreview) return;

      // Apabila ada event change, tambahkan files ke buffer
      if (e && e.target && e.target.files) {
        const newFiles = Array.from(e.target.files);

        for (const f of newFiles) {
          const ext = f.name.split('.').pop().toLowerCase();
          const validExts = ['jpg', 'jpeg', 'heif', 'heic'];
          if (!validExts.includes(ext)) {
            alert(`File "${f.name}" ditolak. Hanya JPG/JPEG dan HEIF/HEIC yang diperbolehkan.`);
            foto.value = ""; // reset input
            continue;
          }
          selectedWasteFiles.push(f);
        }
        foto.value = ""; // prevent accumulating same files inherently in input
      }

      const files = selectedWasteFiles;

      const txtPreview = $("#waste-foto-names");
      if (txtPreview) {
        if (files.length === 0) {
          txtPreview.innerHTML = "";
        } else {
          txtPreview.innerHTML = files.map(f => `<div><i class="fa-solid fa-file-image" style="margin-right:4px;"></i> ${f.name}</div>`).join("");
        }
      }

      if (files.length === 0) {
        photoPreview.innerHTML = `<div class="placeholder">Upload foto sampah (JPG/JPEG/HEIC/HEIF).<br/>Tidak perlu akses kamera.</div>`;
        return;
      }

      const thumbs = files.slice(0, 10).map((file, index) => {
        const url = URL.createObjectURL(file);
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        return `
          <div style="background:#f8fafc; border:1px solid rgba(0,0,0,0.1); border-radius:14px; padding:8px; display:flex; flex-direction:column; gap:8px; position:relative;">
            <button type="button" data-index="${index}" class="btn-remove-photo" style="position:absolute;top:-8px;right:-8px;background:rgba(255,0,0,0.8);color:white;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;z-index:2;display:grid;place-items:center;">&times;</button>
            <div style="position:relative;width:100%;height:150px;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:8px;">
              <img src="${url}" alt="Foto sampah" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;">
            </div>
            <div style="font-size:12px;color:#4b5563;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${file.name}">
              ${file.name}
            </div>
          </div>
        `;
      });

      const extraCount = files.length - 10;
      const extraBadge = extraCount > 0
        ? `<div style="background:rgba(0,0,0,0.8);color:white;padding:8px;border-radius:14px;font-size:12px;text-align:center;align-self:center;">+${extraCount} file lainnya</div>`
        : "";

      photoPreview.innerHTML = `
        <div style="width:100%;padding:10px;display:grid;grid-template-columns:repeat(auto-fill, minmax(140px, 1fr));gap:12px;box-sizing:border-box;">
          ${thumbs.join("")}
          ${extraBadge}
        </div>
      `;

      // Wire delete buttons
      $$(".btn-remove-photo", photoPreview).forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.dataset.index, 10);
          selectedWasteFiles.splice(idx, 1);
          updatePhotoPreview(); // re-render
        });
      });
    }

    // Pastikan saat halaman baru dibuka, file input kosong dan preview reset
    if (foto) {
      foto.value = "";
    }
    selectedWasteFiles = [];
    if (photoPreview) {
      photoPreview.innerHTML = `<div class="placeholder">Upload foto sampah (JPG/JPEG/HEIC/HEIF).<br/>Tidak perlu akses kamera.</div>`;
    }
    const txtPreview = $("#waste-foto-names");
    if (txtPreview) txtPreview.innerHTML = "";
    if (jenisGroup) {
      jenisGroup.addEventListener("change", updateCoinPreview);
    }
    if (berat) {
      berat.addEventListener("input", updateCoinPreview);
    }
    if (foto) foto.addEventListener("change", updatePhotoPreview);

    updateCoinPreview();

    form.addEventListener("reset", () => {
      // Tunggu sedetik hingga DOM clear
      setTimeout(() => {
        selectedWasteFiles = [];
        if (photoPreview) {
          photoPreview.innerHTML = `<div class="placeholder">Upload foto sampah (JPG/JPEG/HEIC/HEIF).<br/>Tidak perlu akses kamera.</div>`;
        }
        if (txtPreview) txtPreview.innerHTML = "";
        updateCoinPreview();
      }, 0);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const selectedJenis = getSelectedJenis();
      if (!selectedJenis.length) {
        alert("Pilih minimal satu jenis sampah (plastik, kertas, atau karton).");
        return;
      }

      const files = selectedWasteFiles;
      if (files.length === 0) {
        alert("Foto sampah wajib diupload (min. 1 foto).");
        return;
      }

      // Validasi ekstensi foto (hanya JPG/JPEG, HEIF/HEIC)
      for (const f of files) {
        const ext = f.name.split('.').pop().toLowerCase();
        const validExts = ['jpg', 'jpeg', 'heif', 'heic'];
        if (!validExts.includes(ext)) {
          alert(`File "${f.name}" ditolak. Hanya file dengan ekstensi JPG/JPEG dan HEIF/HEIC yang diperbolehkan.`);
          return;
        }
      }

      if (files.length > 10) {
        alert("Maksimal 10 foto yang bisa diupload dalam satu kali pengajuan.");
        return;
      }

      const beratVal = Number(berat?.value || 0);
      if (!Number.isFinite(beratVal) || beratVal < 2 || !Number.isInteger(beratVal)) {
        alert("Berat sampah minimal 2 kg dan harus berupa bilangan bulat positif.");
        return;
      }

      const kecVal = (kecamatan?.value || "").trim();
      if (!kecVal) {
        alert("Silakan pilih Kecamatan (Airmadidi / Kalawat).");
        return;
      }

      const lokasiVal = (lokasi?.value || "").trim();
      if (!lokasiVal) {
        alert("Kelurahan wajib diisi.");
        return;
      }

      const detailVal = (detail?.value || "").trim();
      if (!detailVal) {
        alert("Detail penjemputan wajib diisi.");
        return;
      }

      const phoneVal = (phone?.value || "").trim();
      if (!phoneVal) {
        alert("Nomor telepon aktif wajib diisi.");
        return;
      }

      // Validasi Jadwal (H-1 s.d Hari-H Jam 05:00)
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday
      const currentHour = now.getHours();

      let isAllowed = false;
      let scheduleInfo = "";

      if (kecVal === "Kalawat") {
        // Kalawat: Monday Pickup. Allow Sunday (Day 0) OR Monday (Day 1) before 05:00
        if (currentDay === 0 || (currentDay === 1 && currentHour < 5)) {
          isAllowed = true;
        }
        scheduleInfo = "Minggu s/d Senin pukul 04:59 WITA";
      } else if (kecVal === "Airmadidi") {
        // Airmadidi: Tuesday Pickup. Allow Monday (Day 1) OR Tuesday (Day 2) before 05:00
        if (currentDay === 1 || (currentDay === 2 && currentHour < 5)) {
          isAllowed = true;
        }
        scheduleInfo = "Senin s/d Selasa pukul 04:59 WITA";
      }

      if (!isAllowed) {
        alert(`Pengajuan penjemputan untuk wilayah ${kecVal} hanya bisa dilakukan pada H-1 hingga Hari H jam 05:00 pagi.\n\nJadwal ${kecVal}: ${scheduleInfo}.`);
        return;
      }

      const currentWaste = await loadWaste();
      const currentTotalKg = currentWaste.reduce((acc, w) => acc + Number(w.beratActual || w.beratKg || 0), 0);

      let coins = calcCoinsEarned({ jenis: selectedJenis, beratKg: beratVal });
      if (currentTotalKg > 50) {
        coins += 500;
      }

      const formData = new FormData();
      formData.append("userId", getUserId());
      formData.append("jenis", selectedJenis.join(","));
      formData.append("beratKg", beratVal);
      // Combine all location parts into one string to maintain current DB schema
      const fullLocationString = `${kecVal} - ${lokasiVal} - Detail: ${detailVal} - Tlp: ${phoneVal}`;
      formData.append("lokasi", fullLocationString);
      formData.append("coinsEarned", coins);

      files.forEach(f => formData.append("photos", f));

      try {
        const res = await fetch(`${API_URL}/api/user/waste`, {
          method: 'POST',
          body: formData
        });

        if (!res.ok) throw new Error("Pengajuan gagal diproses oleh server.");

        form.reset();
        selectedWasteFiles = [];
        const prev = $("#waste-photo-preview");
        if (prev) prev.innerHTML = `<div class="placeholder">Upload foto sampah (JPG/JPEG/HEIC/HEIF).<br/>Tidak perlu akses kamera.</div>`;

        const txtPrevReset = $("#waste-foto-names");
        if (txtPrevReset) txtPrevReset.innerHTML = "";
        updateCoinPreview();

        await renderAll();
        alert("Permintaan tukar sampah berhasil dibuat dan akan diproses.");
      } catch (err) {
        alert(err.message);
      }
    });
  }

  function wireCashoutForm() {
    const form = $("#form-cashout");
    if (!form) return;

    const amount = $("#cashout-amount");
    const method = $$("input[name='cashout-method']");
    const provider = $("#cashout-provider");
    const accountNumber = $("#cashout-accountNumber");
    const accountName = $("#cashout-accountName");
    const help = $("#cashout-help");

    const providers = {
      wallet: ["DANA", "OVO", "GoPay", "ShopeePay", "LinkAja"],
      bank: ["BCA", "BRI", "BNI", "Mandiri", "CIMB Niaga"],
    };

    function selectedMethod() {
      return (method.find((r) => r.checked)?.value || "wallet");
    }

    function refreshProviderOptions() {
      if (!provider) return;
      const m = selectedMethod();
      const list = m === "bank" ? providers.bank : providers.wallet;
      provider.innerHTML = list.map((p) => `<option value="${p}">${p}</option>`).join("");
    }

    async function validate() {
      const balanceCoins = await loadBalanceCoins();
      const balanceRupiah = coinsToRupiah(balanceCoins);
      const a = Number(amount?.value || 0);

      if (!help) return { ok: true, balanceCoins };

      if (!Number.isFinite(a) || a <= 0) {
        help.className = "notice";
        help.textContent = `Masukkan jumlah pencairan. Minimal ${formatRupiah(CONFIG.minWithdrawRupiah)}.`;
        return { ok: false };
      }
      if (a < CONFIG.minWithdrawRupiah) {
        help.className = "notice";
        help.textContent = `Belum bisa dicairkan. Minimal ${formatRupiah(CONFIG.minWithdrawRupiah)}.`;
        return { ok: false };
      }
      if (a > balanceRupiah) {
        help.className = "notice danger";
        help.textContent = `Saldo tidak cukup. Saldo kamu ${formatRupiah(balanceRupiah)}.`;
        return { ok: false };
      }

      help.className = "notice ok";
      help.textContent = `Valid. Akan memotong ${formatNumber(rupiahToCoins(a))} coin.`;
      return { ok: true, balanceCoins };
    }

    refreshProviderOptions();
    validate();

    method.forEach((r) => r.addEventListener("change", () => {
      refreshProviderOptions();
      validate();
    }));
    if (amount) amount.addEventListener("input", validate);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = await validate();
      if (!v.ok) return;

      const a = Number(amount?.value || 0);
      const m = selectedMethod();
      const p = (provider?.value || "").trim();
      const acc = (accountNumber?.value || "").trim();
      const accName = (accountName?.value || "").trim();

      if (!p) return alert("Pilih e-wallet / bank.");
      if (!acc) return alert("Nomor akun/rekening wajib diisi.");
      if (!accName) return alert("Nama pemilik akun wajib diisi.");

      const coins = rupiahToCoins(a);
      if (coins <= 0) return alert("Jumlah tidak valid.");

      if (coins > v.balanceCoins) return alert("Saldo coin tidak cukup.");

      const payload = {
        userId: getUserId(),
        method: m,
        provider: p,
        accountNumber: acc,
        accountName: accName,
        amountRupiah: Math.round(a),
        coinsUsed: coins
      };

      try {
        const res = await fetch(`${API_URL}/api/user/cashout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Gagal memproses penarikan.");

        form.reset();
        refreshProviderOptions();
        await renderAll();
        alert("Permintaan pencairan berhasil dibuat dan sedang diproses.");

      } catch (err) {
        alert(err.message);
      }
    });
  }

  function wireProfileForm() {
    const form = $("#form-profile");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const profile = await loadProfile();
      const next = {
        ...profile,
        fullName: ($("#pf-fullName")?.value || "").trim(),
        contact: ($("#pf-contact")?.value || "").trim(),
        phone: ($("#pf-phone")?.value || "").trim(),
        address: ($("#pf-address")?.value || "").trim(),
      };
      if (!next.fullName) return alert("Nama lengkap wajib diisi.");
      await saveProfile(next);
      await renderAll();
      alert("Profil berhasil disimpan.");
    });
  }

  function wireLogout() {
    const btn = $("#btn-logout");
    if (!btn) return;
    btn.addEventListener("click", () => {
      localStorage.removeItem('sessionId');
      window.location.href = "login.html";
    });
  }

  function wireQuickRefresh() {
    const btn = $("#btn-refresh");
    if (!btn) return;
    btn.addEventListener("click", () => {
      refreshDerivedStates();
      alert("Dashboard diperbarui.");
    });
  }

  function boot() {
    wireNavigation();
    wireOverviewShortcuts();
    wireWasteForm();
    wireCashoutForm();
    wireProfileForm();
    wireLogout();
    wireQuickRefresh();

    setActivePage(getPageFromHash());
    renderAll();
    refreshDerivedStates();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();

