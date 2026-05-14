(function (global) {
    const NAV_LINKS = Object.freeze([
        { label: 'Woviについて', href: '/company.html' },
        { label: 'Kurumi', href: '/#business' },
        { label: '住宅ミニチュア', href: '/miniature.html' },
        { label: '会社概要', href: '/company.html#company' },
        { label: 'お知らせ', href: '/news.html' },
        { label: 'お問い合わせ', href: '/#contact', isCta: true }
    ]);

    function getNavLinks() {
        return NAV_LINKS.slice();
    }

    global.WOVI_NAV = {
        ...(global.WOVI_NAV || {}),
        getNavLinks
    };
})(window);
