// Pencarian NUSAHERA: sampai 3 kata kunci -> masakan, bahan/rempah, dan daerah yang cocok.
// Cara pakai: ketik kata kunci dipisah koma ("jahe, bali, sate") atau spasi ("jahe bali sate").
// Jika memakai koma, frasa berspasi tetap utuh ("daun jeruk, sumatera barat").
(function () {
    const NUSA = window.NUSA || (window.NUSA = {});
    const MAX_KEYWORDS = 3;
    const MIN_LENGTH = 2;

    // Sinonim umum agar "sereh" tetap menemukan "serai", dst. Semua huruf kecil.
    const ALIASES = [
        ['serai', 'sereh'],
        ['cabai', 'cabe', 'lombok'],
        ['jintan', 'jinten'],
        ['lengkuas', 'laos'],
        ['kluwek', 'keluak', 'kepayang'],
        ['kemangi', 'kemambang'],
        ['daun jeruk', 'jeruk purut'],
        ['kayu manis', 'kayumanis'],
        ['cengkeh', 'cengkih'],
        ['merica', 'lada']
    ];

    let matchAll = false;
    let lastQuery = '';

    // ---- Util ----
    function esc(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function norm(s) { return String(s == null ? '' : s).toLowerCase().trim(); }

    function parseKeywords(query) {
        const raw = String(query || '');
        const parts = raw.indexOf(',') >= 0 ? raw.split(',') : raw.split(/\s+/);
        const seen = new Set();
        const all = [];
        parts.forEach(p => {
            const k = norm(p).replace(/\s+/g, ' ');
            if (k.length >= MIN_LENGTH && !seen.has(k)) { seen.add(k); all.push(k); }
        });
        return { keywords: all.slice(0, MAX_KEYWORDS), truncated: all.length > MAX_KEYWORDS };
    }

    function variantsOf(kw) {
        const out = new Set([kw]);
        ALIASES.forEach(group => { if (group.indexOf(kw) >= 0) group.forEach(v => out.add(v)); });
        return Array.from(out);
    }
    // Cocok jika kata kunci diawali di awal kata ("bali" cocok "Bali", tapi "lada" tidak cocok "balado").
    function textHas(text, variants) {
        const t = norm(text);
        if (t === '') return false;
        return variants.some(v => {
            let from = 0, i;
            while ((i = t.indexOf(v, from)) >= 0) {
                if (i === 0 || !/[a-z0-9]/.test(t.charAt(i - 1))) return true;
                from = i + 1;
            }
            return false;
        });
    }

    function getRecipes() {
        // main.js (beranda) menyimpan database di variabel global; halaman lain memakai NUSA._recipes.
        try {
            if (typeof nusaheraRecipeDatabase !== 'undefined' && nusaheraRecipeDatabase && Array.isArray(nusaheraRecipeDatabase.resep) && nusaheraRecipeDatabase.resep.length) {
                return nusaheraRecipeDatabase.resep;
            }
        } catch (e) { /* abaikan */ }
        return NUSA._recipes || [];
    }

    // ---- Inti pencarian (tanpa DOM, bisa diuji terpisah) ----
    // Mengembalikan { keywords, truncated, dishes:[{r, score, hits}], spices:[{s, i, score, hits}] }
    // hits = [{ kw, field: 'nama'|'daerah'|'bahan'|'rempah', text }]
    NUSA.search = function (query, opts) {
        opts = opts || {};
        const requireAll = opts.matchAll != null ? opts.matchAll : matchAll;
        const parsed = parseKeywords(query);
        const kws = parsed.keywords;
        const result = { keywords: kws, truncated: parsed.truncated, dishes: [], spices: [] };
        if (!kws.length) return result;
        const vmap = kws.map(variantsOf);

        function finish(list) {
            const filtered = list.filter(o => o.score > 0 && (!requireAll || o.score === kws.length));
            filtered.sort((a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name), 'id'));
            return filtered;
        }

        // Masakan: nama, daerah asal, bahan (+ rempah utama)
        const dishes = getRecipes().map(r => {
            const hits = [];
            let score = 0;
            kws.forEach((kw, idx) => {
                const v = vmap[idx];
                const kwHits = [];
                if (textHas(r.nama, v)) kwHits.push({ kw, field: 'nama', text: r.nama });
                if (textHas(r.daerah_asal, v)) kwHits.push({ kw, field: 'daerah', text: r.daerah_asal });
                const seenBahan = new Set();
                (r.bahan || []).forEach(b => {
                    if (textHas(b.nama, v) && !seenBahan.has(norm(b.nama))) {
                        seenBahan.add(norm(b.nama));
                        kwHits.push({ kw, field: 'bahan', text: b.nama });
                    }
                });
                (r.rempah_utama || []).forEach(x => {
                    if (textHas(x, v) && !seenBahan.has(norm(x))) {
                        seenBahan.add(norm(x));
                        kwHits.push({ kw, field: 'rempah', text: x });
                    }
                });
                if (kwHits.length) { score++; kwHits.forEach(h => hits.push(h)); }
            });
            return { r, name: r.nama, score, hits };
        });
        result.dishes = finish(dishes);

        // Rempah/bahan: nama, wilayah (sub), provinsi
        const spices = (NUSA.spiceCatalog || []).map((s, i) => {
            const hits = [];
            let score = 0;
            kws.forEach((kw, idx) => {
                const v = vmap[idx];
                let hit = false;
                if (textHas(s.name, v)) { hits.push({ kw, field: 'nama', text: s.name }); hit = true; }
                if (textHas(s.sub, v)) { hits.push({ kw, field: 'daerah', text: s.sub }); hit = true; }
                if (textHas(s.province, v)) { hits.push({ kw, field: 'daerah', text: s.province }); hit = true; }
                if (hit) score++;
            });
            return { s, i, name: s.name, score, hits };
        });
        result.spices = finish(spices);
        return result;
    };

    // ---- UI: panel hasil di bawah kolom cari header ----
    const FIELD_LABEL = { nama: 'Nama', daerah: 'Daerah', bahan: 'Bahan', rempah: 'Bahan' };
    const FIELD_ICON = { nama: 'fa-utensils', daerah: 'fa-location-dot', bahan: 'fa-leaf', rempah: 'fa-leaf' };

    function chipsHTML(hits) {
        const seen = new Set();
        return hits.filter(h => {
            const key = h.field + '|' + norm(h.text);
            if (seen.has(key)) return false;
            seen.add(key); return true;
        }).slice(0, 6).map(h =>
            `<span class="inline-flex items-center gap-1 text-[10px] font-semibold text-terracotta bg-terracotta/10 border border-terracotta/20 rounded-full px-2 py-0.5"><i class="fa-solid ${FIELD_ICON[h.field]} text-[9px]"></i>${FIELD_LABEL[h.field]}: ${esc(h.text)}</span>`
        ).join(' ');
    }

    function dishRowHTML(o) {
        const r = o.r;
        const img = r.gambar_url
            ? `<img src="${esc(r.gambar_url)}" alt="" class="w-12 h-12 rounded-lg object-cover shrink-0" onerror="this.style.display='none'">`
            : `<div class="w-12 h-12 rounded-lg bg-cream-dark flex items-center justify-center text-forest/30 shrink-0"><i class="fa-solid fa-bowl-food"></i></div>`;
        return `<button type="button" data-kind="dish" data-id="${esc(r.id)}" class="w-full flex items-start gap-3 text-left p-2 rounded-xl hover:bg-forest/5 transition-colors">
            ${img}
            <div class="min-w-0">
                <div class="text-sm font-bold text-forest leading-tight">${esc(r.nama)}</div>
                <div class="text-[11px] text-forest/60 mb-1">${esc(r.daerah_asal || 'Nusantara')}</div>
                <div class="flex flex-wrap gap-1">${chipsHTML(o.hits)}</div>
            </div>
        </button>`;
    }

    function spiceRowHTML(o) {
        const s = o.s;
        const img = s.image
            ? `<img src="${esc(s.image)}" alt="" class="w-12 h-12 rounded-lg object-cover shrink-0" onerror="this.style.display='none'">`
            : `<div class="w-12 h-12 rounded-lg bg-cream-dark flex items-center justify-center text-forest/30 shrink-0"><i class="fa-solid fa-seedling"></i></div>`;
        return `<button type="button" data-kind="spice" data-idx="${o.i}" class="w-full flex items-start gap-3 text-left p-2 rounded-xl hover:bg-forest/5 transition-colors">
            ${img}
            <div class="min-w-0">
                <div class="text-sm font-bold text-forest leading-tight">${esc(s.name)}</div>
                <div class="text-[11px] text-forest/60 mb-1">${esc(s.sub)} &middot; ${esc(s.province)}</div>
                <div class="flex flex-wrap gap-1">${chipsHTML(o.hits)}</div>
            </div>
        </button>`;
    }

    function ensurePanel(input) {
        let panel = document.getElementById('nusa-search-panel');
        if (panel) return panel;
        panel = document.createElement('div');
        panel.id = 'nusa-search-panel';
        panel.className = 'hidden absolute left-0 right-0 top-full mt-2 z-50 bg-cream-card border border-forest/15 rounded-2xl shadow-xl max-h-[70vh] overflow-y-auto p-3 text-forest';
        input.parentElement.appendChild(panel);

        // Klik hasil -> buka detail
        panel.addEventListener('click', e => {
            const toggle = e.target.closest('[data-role="match-all"]');
            if (toggle) { matchAll = toggle.checked; render(); return; }
            const btn = e.target.closest('button[data-kind]');
            if (!btn) return;
            closePanel();
            if (btn.dataset.kind === 'dish') {
                if (typeof openRecipe === 'function' && document.getElementById('recipe-modal')) openRecipe(btn.dataset.id);
                else NUSA.onRecipeCard(btn.dataset.id);
            } else {
                NUSA.onSpiceCard(Number(btn.dataset.idx));
            }
        });
        return panel;
    }

    function closePanel() {
        const panel = document.getElementById('nusa-search-panel');
        if (panel) panel.classList.add('hidden');
    }

    function render() {
        const input = document.getElementById('header-search');
        if (!input) return;
        const panel = ensurePanel(input);
        const res = NUSA.search(lastQuery);

        if (!res.keywords.length) { closePanel(); return; }

        const kwChips = res.keywords.map(k =>
            `<span class="inline-block text-[11px] font-semibold bg-forest text-cream rounded-full px-2.5 py-0.5">${esc(k)}</span>`).join(' ');
        const total = res.dishes.length + res.spices.length;

        let html = `<div class="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 border-b border-forest/10">
            <div class="flex flex-wrap items-center gap-1.5 text-xs">${kwChips}<span class="text-forest/60">&middot; ${total} hasil</span></div>
            <label class="flex items-center gap-1.5 text-[11px] text-forest/70 cursor-pointer select-none">
                <input type="checkbox" data-role="match-all" ${matchAll ? 'checked' : ''} class="accent-[#b85c37]"> Cocok semua kata kunci
            </label>
        </div>`;
        if (res.truncated) {
            html += `<p class="text-[11px] text-forest/60 px-1 pt-2">Hanya ${MAX_KEYWORDS} kata kunci pertama yang dipakai.</p>`;
        }

        if (!total) {
            html += `<p class="text-sm text-forest/60 text-center py-6">Tidak ada masakan, bahan, atau daerah yang cocok${matchAll && res.keywords.length > 1 ? '. Coba matikan "Cocok semua kata kunci"' : ''}.</p>`;
        } else {
            if (res.dishes.length) {
                html += `<div class="text-[11px] font-bold uppercase tracking-widest text-terracotta px-1 pt-3 pb-1">Masakan (${res.dishes.length})</div>`;
                html += res.dishes.map(dishRowHTML).join('');
            }
            if (res.spices.length) {
                html += `<div class="text-[11px] font-bold uppercase tracking-widest text-terracotta px-1 pt-3 pb-1">Rempah &amp; Bahan (${res.spices.length})</div>`;
                html += res.spices.map(spiceRowHTML).join('');
            }
        }
        panel.innerHTML = html;
        panel.classList.remove('hidden');
    }

    NUSA.runSearch = function (query) { lastQuery = query; render(); };

    // Dipanggil dari onsubmit form header (Enter).
    NUSA.submitSearch = function (e) {
        if (e && e.preventDefault) e.preventDefault();
        const input = document.getElementById('header-search');
        NUSA.runSearch(input ? input.value : '');
    };

    function init() {
        const input = document.getElementById('header-search');
        if (!input) return;
        ensurePanel(input);
        let timer = null;
        input.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(() => NUSA.runSearch(input.value), 150);
        });
        input.addEventListener('focus', () => { if (input.value.trim()) NUSA.runSearch(input.value); });
        document.addEventListener('click', e => {
            if (!e.target.closest('#nusa-search-panel') && e.target !== input) closePanel();
        });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });
        // Pastikan data resep terbaru dari JSON ikut termuat (jika server tersedia).
        if (typeof NUSA.loadRecipes === 'function') NUSA.loadRecipes();
        // Data rempah (data/nusahera_rempah.json) juga dimuat agar hasil pencarian rempah tersedia.
        if (typeof NUSA.loadSpices === 'function') NUSA.loadSpices();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
