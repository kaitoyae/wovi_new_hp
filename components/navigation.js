(function(global) {
    const NAV_LINKS = Object.freeze([
        { label: 'Woviについて', href: 'company.html' },
        { label: '事業内容', href: 'index.html#business' },
        { label: '会社概要', href: 'company.html#company' },
        { label: 'お知らせ', href: 'news.html' },
        { label: 'お問い合わせ', href: 'index.html#contact', isCta: true }
    ]);

    function getNavLinks() {
        return NAV_LINKS.slice();
    }

    global.WOVI_NAV = {
        ...(global.WOVI_NAV || {}),
        getNavLinks
    };
})(window);
