// Modul bersama NUSAHERA: data rempah + render kartu/carousel + modal detail.
// Dipakai oleh dashboard (index) maupun halaman masakan.html & rempah.html.
(function () {
    const NUSA = window.NUSA || (window.NUSA = {});

    // ---- Data rempah: dimuat dari data/nusahera_rempah.json ----
    // Untuk mengganti / menambah rempah, cukup edit file JSON tersebut (tanpa menyentuh kode).
    // NUSA.spiceCatalog  -> dipakai kartu, modal & pencarian  {name, sub, province, manfaat, image}
    // NUSA.spiceLocations-> dipakai peta                       {name, location, coords, icon, image, color, desc}
    NUSA.SPICE_JSON_URL = 'data/nusahera_rempah.json';
    NUSA.spiceCatalog = [];
    NUSA.spiceLocations = [];
    NUSA.spiceAliases = {};   // nama alternatif (huruf kecil) -> nama resmi (huruf kecil)
    NUSA.spiceError = null;
    let _spicePromise = null;

    function applySpiceData(list) {
        NUSA.spiceCatalog = list.map(r => ({
            id: r.id,
            name: r.nama,
            sub: r.daerah || '',
            province: r.provinsi || '',
            manfaat: r.manfaat || '',
            deskripsi: r.deskripsi || '',
            khasiat: r.khasiat || '',
            image: r.gambar_url || ''
        }));
        NUSA.spiceLocations = list.map(r => {
            const k = r.koordinat || {};
            return {
                id: r.id,
                name: r.nama,
                location: r.lokasi || r.provinsi || '',
                coords: [Number(k.lng), Number(k.lat)],
                icon: r.ikon || '🌿',
                image: r.gambar_peta_url || r.gambar_url || '',
                color: r.warna || '',
                desc: r.deskripsi || r.manfaat || '',
                khasiat: r.khasiat || ''
            };
        });
        NUSA.spiceAliases = {};
        list.forEach(r => (r.alias || []).forEach(a => {
            NUSA.spiceAliases[String(a).trim().toLowerCase()] = String(r.nama).trim().toLowerCase();
        }));
    }

    // Muat sekali, hasilnya di-cache. Selalu resolve (data kosong + NUSA.spiceError bila gagal).
    NUSA.loadSpices = function () {
        if (_spicePromise) return _spicePromise;
        _spicePromise = fetch(NUSA.SPICE_JSON_URL, { cache: 'no-store' })
            .then(res => {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(data => {
                const list = Array.isArray(data) ? data : (data && data.rempah);
                if (!Array.isArray(list)) throw new Error('Format JSON tidak valid: properti "rempah" (array) tidak ditemukan');
                applySpiceData(list.filter(r => r && r.nama));
                NUSA.spiceError = null;
                return NUSA.spiceCatalog;
            })
            .catch(err => {
                console.warn('Gagal memuat ' + NUSA.SPICE_JSON_URL + ':', err);
                NUSA.spiceError = err;
                return NUSA.spiceCatalog;
            });
        return _spicePromise;
    };


    // Fallback data resep (dari js/recipes-data.js) agar halaman tetap jalan tanpa server.
    NUSA._recipes = Array.isArray(window.RECIPES_DATA) ? window.RECIPES_DATA : [];

    // ---- Util ----
    function esc(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function firstPart(s) { return String(s || 'Indonesia').split(',')[0].trim(); }
    function provinceOf(s) { const p = String(s || 'Indonesia').split(','); return (p[p.length - 1] || '').trim() || firstPart(s); }
    function formatWaktu(menit) {
        if (!menit) return '—';
        if (menit >= 60) { const j = Math.floor(menit / 60), m = menit % 60; return `${j} jam${m ? ' ' + m + ' menit' : ''}`; }
        return `${menit} menit`;
    }
    function placeholderMedia() {
        return `<div class="w-full h-full flex flex-col items-center justify-center text-forest/30 bg-cream-dark">
            <i class="fa-solid fa-image text-2xl mb-1"></i><span class="text-[10px]">Gambar belum tersedia</span></div>`;
    }

    // ---- Kartu ----
    function cardWidthClass(carousel) { return carousel ? 'shrink-0 snap-start w-56 sm:w-60' : 'w-full'; }

    function recipeCardHTML(r, opts) {
        const w = cardWidthClass(opts && opts.carousel);
        const sub = firstPart(r.daerah_asal);
        const prov = provinceOf(r.daerah_asal);
        const media = r.gambar_url
            ? `<img src="${esc(r.gambar_url)}" alt="${esc(r.nama)}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">`
            : placeholderMedia();
        return `
            <div class="${w} bg-cream rounded-2xl border border-forest/10 shadow-sm hover:shadow-lg hover:border-terracotta transition-all overflow-hidden flex flex-col cursor-pointer group" role="button" tabindex="0"
                 onclick="NUSA.onRecipeCard('${esc(r.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();NUSA.onRecipeCard('${esc(r.id)}')}">
                <div class="h-36 overflow-hidden relative bg-cream-dark">${media}
                    <span class="absolute top-2 right-2 bg-terracotta text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">${esc(prov)}</span>
                </div>
                <div class="p-4 flex flex-col flex-1">
                    <h4 class="font-bold text-forest text-base text-center">${esc(r.nama)}</h4>
                    <p class="text-[11px] text-terracotta font-medium text-center mb-2">${esc(sub)}</p>
                    <p class="text-[11px] text-forest/60 line-clamp-2">${esc(r.deskripsi || 'Deskripsi belum tersedia.')} <span class="text-terracotta font-semibold whitespace-nowrap">… Selengkapnya</span></p>
                    <div class="mt-auto pt-3 border-t border-forest/10 flex items-center gap-1 text-[11px] text-forest/70"><i class="fa-solid fa-location-dot text-terracotta"></i> ${esc(prov)}</div>
                </div>
            </div>`;
    }

    function spiceCardHTML(s, idx, opts) {
        const w = cardWidthClass(opts && opts.carousel);
        const media = s.image
            ? `<img src="${esc(s.image)}" alt="${esc(s.name)}" loading="lazy" class="w-full h-full object-contain p-3">`
            : placeholderMedia();
        return `
            <div class="${w} bg-cream rounded-2xl border border-forest/10 shadow-sm hover:shadow-lg hover:border-terracotta transition-all overflow-hidden flex flex-col cursor-pointer group" role="button" tabindex="0"
                 onclick="NUSA.onSpiceCard(${idx})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();NUSA.onSpiceCard(${idx})}">
                <div class="h-36 overflow-hidden relative bg-white border-b border-forest/5">${media}</div>
                <div class="p-4 flex flex-col flex-1">
                    <h4 class="font-bold text-forest text-base text-center">${esc(s.name)}</h4>
                    <p class="text-[11px] text-terracotta font-medium text-center mb-2">${esc(s.sub)}</p>
                    <p class="text-[11px] text-forest/60 line-clamp-2">${esc(s.manfaat)} <span class="text-terracotta font-semibold whitespace-nowrap">… Selengkapnya</span></p>
                    <div class="mt-auto pt-3 border-t border-forest/10 flex items-center gap-1 text-[11px] text-forest/70"><i class="fa-solid fa-location-dot text-terracotta"></i> ${esc(s.province)}</div>
                </div>
            </div>`;
    }

    // ---- Render ----
    // Pasang kartu: carousel (track transform + loop) atau grid biasa.
    function mountInto(el, cardsHTML, carousel) {
        if (carousel) {
            el.classList.add('overflow-hidden');
            el.classList.remove('overflow-x-auto', 'snap-x', 'scroll-smooth');
            el.innerHTML = `<div class="flex gap-4 nusa-track will-change-transform">${cardsHTML}</div>`;
            setupCarousel(el);
        } else {
            el.innerHTML = cardsHTML;
        }
    }

    NUSA.renderRecipes = function (targetId, recipes, opts) {
        opts = opts || {};
        const el = document.getElementById(targetId);
        if (!el) return;
        let list = recipes || [];
        if (opts.limit) list = list.slice(0, opts.limit);
        mountInto(el, list.map(r => recipeCardHTML(r, opts)).join(''), opts.carousel);
    };

    NUSA.renderSpices = function (targetId, opts) {
        opts = opts || {};
        const el = document.getElementById(targetId);
        if (!el) return;
        let list = NUSA.spiceCatalog.map((s, i) => ({ s, i }));
        if (opts.limit) list = list.slice(0, opts.limit);
        if (!list.length) {
            // Belum termuat / gagal dimuat: tampilkan pesan, bukan area kosong.
            const msg = NUSA.spiceError
                ? 'Data rempah gagal dimuat. Pastikan <code>data/nusahera_rempah.json</code> ada dan situs dibuka lewat server (bukan file://).'
                : 'Memuat data rempah…';
            el.innerHTML = `<p class="col-span-full text-sm text-forest/60 py-6 text-center">${msg}</p>`;
            return;
        }
        mountInto(el, list.map(o => spiceCardHTML(o.s, o.i, opts)).join(''), opts.carousel);
    };

    // Render subset rempah (mis. hasil pencarian). pairs = [{s, i}] dengan i = indeks asli.
    NUSA.renderSpicesSubset = function (targetId, pairs, opts) {
        const el = document.getElementById(targetId);
        if (!el) return;
        el.innerHTML = (pairs || []).map(o => spiceCardHTML(o.s, o.i, opts || {})).join('');
    };

    function prefersReducedMotion() {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    // Carousel loop ala Netflix: geser satu halaman via transform, lalu rotasi urutan DOM
    // (kartu depan dipindah ke belakang) sehingga setelah item terakhir mulus lanjut ke item pertama.
    function setupCarousel(viewport) {
        const track = viewport.firstElementChild;
        if (!track) return;
        let animating = false;
        let dragging = false;

        function stepPx() {
            const c = track.children[0];
            if (!c) return 0;
            const w = c.getBoundingClientRect().width;
            const cs = getComputedStyle(track);
            const gap = parseFloat(cs.columnGap || cs.gap) || 16;
            return w + gap;
        }
        function perPage() {
            const s = stepPx();
            return s ? Math.max(1, Math.floor(viewport.clientWidth / s)) : 1;
        }

        viewport._nusaStep = function (dir) {
            const n = track.children.length;
            if (!n || animating || dragging) return;
            const p = Math.min(perPage(), n);
            const dist = p * stepPx();
            if (!dist) return;

            if (prefersReducedMotion()) {
                for (let i = 0; i < p; i++) {
                    if (dir > 0) track.appendChild(track.firstElementChild);
                    else track.insertBefore(track.lastElementChild, track.firstElementChild);
                }
                return;
            }

            animating = true;
            if (dir > 0) {
                track.style.transition = 'transform .45s ease';
                track.style.transform = `translateX(${-dist}px)`;
                const done = () => {
                    track.removeEventListener('transitionend', done);
                    for (let i = 0; i < p; i++) track.appendChild(track.firstElementChild);
                    track.style.transition = 'none';
                    track.style.transform = 'translateX(0)';
                    void track.offsetWidth; // reflow agar reset tidak teranimasi
                    animating = false;
                };
                track.addEventListener('transitionend', done);
                setTimeout(() => { if (animating) done(); }, 700);
            } else {
                for (let i = 0; i < p; i++) track.insertBefore(track.lastElementChild, track.firstElementChild);
                track.style.transition = 'none';
                track.style.transform = `translateX(${-dist}px)`;
                void track.offsetWidth;
                track.style.transition = 'transform .45s ease';
                track.style.transform = 'translateX(0)';
                const done = () => { track.removeEventListener('transitionend', done); animating = false; };
                track.addEventListener('transitionend', done);
                setTimeout(() => { if (animating) animating = false; }, 700);
            }
        };

        // ---- Geser dengan tangan / mouse (swipe & drag) ----
        // Sentuh lalu geser kiri/kanan; lepas -> snap ke kartu terdekat, tetap loop.
        viewport.style.touchAction = 'pan-y';   // scroll vertikal halaman tetap jalan
        viewport.style.cursor = 'grab';
        viewport.addEventListener('dragstart', e => e.preventDefault()); // cegah drag gambar bawaan

        let pid = null, startX = 0, startY = 0, lastX = 0, lastT = 0, vel = 0;
        let pending = false, moved = false, base = 0, buf = 0, step = 0, per = 1, minDx = 0, maxDx = 0;

        function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

        function beginDrag() {
            const n = track.children.length;
            step = stepPx(); per = Math.min(perPage(), n);
            buf = Math.min(2, Math.max(0, n - per));           // kartu cadangan di sisi kiri
            for (let i = 0; i < buf; i++) track.insertBefore(track.lastElementChild, track.firstElementChild);
            base = -buf * step;
            maxDx = buf * step;                                  // batas geser ke kanan
            minDx = -(n - buf - per) * step;                     // batas geser ke kiri
            track.style.transition = 'none';
            track.style.transform = `translateX(${base}px)`;
            dragging = true;
        }

        function endDrag(cancelled) {
            if (pid !== null) { try { viewport.releasePointerCapture(pid); } catch (e) {} }
            pid = null;
            viewport.style.cursor = 'grab';
            if (!dragging) { pending = false; return; }
            const dx = clamp(lastX - startX, minDx, maxDx);
            let cards = step ? Math.round(-dx / step) : 0;      // + = maju, - = mundur
            if (!cancelled && cards === 0 && Math.abs(vel) > 0.4 && Math.abs(dx) > 20) cards = vel < 0 ? 1 : -1;
            if (cancelled) cards = 0;
            const n = track.children.length;
            cards = clamp(cards, -buf, n - buf - per);
            const shift = buf + cards;                           // indeks kartu pertama yang terlihat

            const finish = () => {
                for (let i = 0; i < shift; i++) track.appendChild(track.firstElementChild);
                track.style.transition = 'none';
                track.style.transform = 'translateX(0)';
                void track.offsetWidth;
                dragging = false; animating = false; pending = false;
            };
            animating = true;
            const target = -shift * step;
            if (prefersReducedMotion() || Math.abs(target - (base + dx)) < 1) { finish(); return; }
            track.style.transition = 'transform .3s ease-out';
            track.style.transform = `translateX(${target}px)`;
            const done = () => { track.removeEventListener('transitionend', done); finish(); };
            track.addEventListener('transitionend', done);
            setTimeout(() => { if (animating) { track.removeEventListener('transitionend', done); finish(); } }, 500);
        }

        viewport.addEventListener('pointerdown', e => {
            if (animating || dragging) return;
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (viewport.firstElementChild !== track || track.children.length < 2) return;
            pending = true; moved = false;
            pid = e.pointerId; startX = lastX = e.clientX; startY = e.clientY; lastT = e.timeStamp; vel = 0;
        });

        viewport.addEventListener('pointermove', e => {
            if (!pending || e.pointerId !== pid) return;
            const dxRaw = e.clientX - startX, dyRaw = e.clientY - startY;
            if (!dragging) {
                if (Math.abs(dxRaw) < 6 || Math.abs(dxRaw) < Math.abs(dyRaw)) return; // belum cukup / gerak vertikal
                beginDrag();
                moved = true;
                try { viewport.setPointerCapture(pid); } catch (err) {}
                viewport.style.cursor = 'grabbing';
            }
            const dt = e.timeStamp - lastT;
            if (dt > 0) vel = 0.8 * vel + 0.2 * ((e.clientX - lastX) / dt);
            lastX = e.clientX; lastT = e.timeStamp;
            const dx = clamp(e.clientX - startX, minDx, maxDx);
            track.style.transform = `translateX(${base + dx}px)`;
        });

        viewport.addEventListener('pointerup', e => { if (e.pointerId === pid) endDrag(false); });
        viewport.addEventListener('pointercancel', e => { if (e.pointerId === pid) endDrag(true); });
        viewport.addEventListener('lostpointercapture', () => { if (dragging && pid !== null) endDrag(false); });

        // Setelah drag, jangan anggap sebagai klik pada kartu (supaya modal tidak terbuka)
        viewport.addEventListener('click', e => {
            if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
        }, true);
    }

    NUSA.scrollRow = function (id, dir) {
        const el = document.getElementById(id);
        if (el && el._nusaStep) el._nusaStep(dir);
    };

    NUSA.loadRecipes = async function () {
        try {
            const res = await fetch('data/nusahera_resep.json', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data.resep)) { NUSA._recipes = data.resep; return data.resep; }
            }
        } catch (e) { console.warn('Gagal memuat resep:', e); }
        return NUSA._recipes || [];
    };

    // ---- Modal detail (dinamis, mandiri) ----
    function ensureHost() {
        let host = document.getElementById('nusa-detail-modal');
        if (!host) {
            host = document.createElement('div');
            host.id = 'nusa-detail-modal';
            host.className = 'hidden fixed inset-0 z-[100] bg-black/60 p-4 overflow-y-auto';
            host.addEventListener('click', e => { if (e.target === host) NUSA.closeDetail(); });
            document.addEventListener('keydown', e => { if (e.key === 'Escape') NUSA.closeDetail(); });
            document.body.appendChild(host);
        }
        return host;
    }
    function openHTML(inner) {
        const host = ensureHost();
        host.innerHTML = inner;
        host.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    }
    NUSA.closeDetail = function () {
        const host = document.getElementById('nusa-detail-modal');
        if (host) host.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    };
    const closeBtn = `<button onclick="NUSA.closeDetail()" class="shrink-0 rounded-full w-10 h-10 bg-forest/10 text-forest hover:bg-terracotta hover:text-white flex items-center justify-center" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>`;

    NUSA.showRecipeDetail = function (r) {
        if (!r) return;
        const bahan = r.bahan || [], langkah = r.langkah || [], rempah = r.rempah_utama || [];
        const media = r.gambar_url
            ? `<img src="${esc(r.gambar_url)}" alt="${esc(r.nama)}" class="w-full h-56 object-cover">`
            : `<div class="h-40">${placeholderMedia()}</div>`;
        openHTML(`
            <div class="max-w-3xl mx-auto my-8 bg-cream rounded-2xl shadow-2xl overflow-hidden" role="dialog" aria-modal="true">
                ${media}
                <div class="p-5 md:p-7">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-xs uppercase tracking-widest font-bold text-terracotta">${esc(r.daerah_asal || '')}</p>
                            <h2 class="text-2xl md:text-3xl font-bold text-forest mt-1">${esc(r.nama || '')}</h2>
                            <p class="text-sm text-forest/70 mt-2">${esc(r.deskripsi || '')}</p>
                        </div>
                        ${closeBtn}
                    </div>
                    <div class="flex gap-4 text-xs text-forest/70 mt-4">
                        <span><i class="fa-regular fa-clock text-terracotta"></i> ${formatWaktu(r.waktu_menit)}</span>
                        <span><i class="fa-solid fa-users text-terracotta"></i> ${esc(r.porsi || '—')} porsi</span>
                    </div>
                    <div class="grid md:grid-cols-2 gap-7 mt-6">
                        <div>
                            <h3 class="font-bold text-lg text-forest mb-3">Bahan-bahan</h3>
                            <ul class="space-y-2 text-sm text-forest/80 ${bahan.length ? 'list-disc pl-5' : ''}">
                                ${bahan.length ? bahan.map(b => `<li>${esc(b.nama)} — ${esc(b.takaran)}</li>`).join('') : '<li class="italic text-forest/50">Resep belum tersedia.</li>'}
                            </ul>
                            <h3 class="font-bold text-lg text-forest mt-6 mb-3">Rempah utama</h3>
                            <div class="flex flex-wrap gap-2">
                                ${rempah.length ? rempah.map(x => `<span class="px-2.5 py-1 rounded-full bg-terracotta/10 text-terracotta text-xs font-semibold">${esc(x)}</span>`).join('') : '<span class="italic text-forest/50 text-xs">Belum tersedia.</span>'}
                            </div>
                        </div>
                        <div>
                            <h3 class="font-bold text-lg text-forest mb-3">Cara memasak</h3>
                            <ol class="space-y-3 text-sm text-forest/80 ${langkah.length ? 'list-decimal pl-5' : ''}">
                                ${langkah.length ? langkah.map(s => `<li>${esc(s)}</li>`).join('') : '<li class="italic text-forest/50">Langkah memasak belum tersedia.</li>'}
                            </ol>
                            ${r.nilai_budaya ? `<div class="mt-6 p-4 rounded-xl bg-forest/5"><h3 class="font-bold text-forest text-sm mb-1">Nilai budaya</h3><p class="text-sm text-forest/75">${esc(r.nilai_budaya)}</p></div>` : ''}
                            ${r.sumber ? `<p class="text-[11px] text-forest/50 mt-4">${esc(r.sumber)}</p>` : ''}
                        </div>
                    </div>
                </div>
            </div>`);
    };

    NUSA.showSpiceDetail = function (s) {
        if (!s) return;
        const media = s.image
            ? `<img src="${esc(s.image)}" alt="${esc(s.name)}" class="w-full h-52 object-contain bg-white p-6">`
            : `<div class="h-40">${placeholderMedia()}</div>`;
        openHTML(`
            <div class="max-w-md mx-auto my-10 bg-cream rounded-2xl shadow-2xl overflow-hidden" role="dialog" aria-modal="true">
                ${media}
                <div class="p-6 text-center relative">
                    <div class="absolute top-4 right-4">${closeBtn}</div>
                    <p class="text-[11px] uppercase tracking-widest text-terracotta font-bold">${esc(s.province)}</p>
                    <h2 class="text-2xl font-bold text-forest mt-1">${esc(s.name)}</h2>
                    <p class="text-xs text-terracotta mb-3">${esc(s.sub)}</p>
                    <p class="text-sm text-forest/70">${esc(s.deskripsi || s.manfaat)}</p>
                    ${s.khasiat ? `<div class="mt-4 p-4 rounded-xl bg-forest/5 text-left"><h3 class="font-bold text-forest text-sm mb-1"><i class="fa-solid fa-leaf text-terracotta mr-1"></i> Khasiat</h3><p class="text-sm text-forest/75">${esc(s.khasiat)}</p></div>` : ''}
                    <div class="mt-5 inline-flex items-center gap-1 text-xs text-forest/70"><i class="fa-solid fa-location-dot text-terracotta"></i> ${esc(s.province)}</div>
                </div>
            </div>`);
    };

    // ---- Handler default (dapat ditimpa per halaman) ----
    NUSA.onRecipeCard = async function (id) {
        let r = (NUSA._recipes || []).find(x => x.id === id);
        if (!r) { await NUSA.loadRecipes(); r = (NUSA._recipes || []).find(x => x.id === id); }
        NUSA.showRecipeDetail(r);
    };
    NUSA.onSpiceCard = function (idx) { NUSA.showSpiceDetail(NUSA.spiceCatalog[idx]); };
})();
