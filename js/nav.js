// Menu popup untuk tampilan mobile (< md / 768px)
(function () {
    var btn = document.getElementById('menu-toggle');
    var menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;
    var closeBtn = document.getElementById('menu-close');
    var isMobile = function () { return !window.matchMedia('(min-width: 768px)').matches; };

    function setOpen(open) {
        menu.classList.toggle('hidden', !open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.style.overflow = open && isMobile() ? 'hidden' : '';
    }

    btn.addEventListener('click', function () { setOpen(menu.classList.contains('hidden')); });
    if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false); });
    // Klik area gelap di luar popup menutup menu
    menu.addEventListener('click', function (e) { if (e.target === menu && isMobile()) setOpen(false); });
    menu.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    window.matchMedia('(min-width: 768px)').addEventListener('change', function (e) {
        if (e.matches) setOpen(false);
    });
})();
