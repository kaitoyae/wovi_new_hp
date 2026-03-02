(function (global) {
    const navLinks = (global.WOVI_NAV && typeof global.WOVI_NAV.getNavLinks === 'function')
        ? global.WOVI_NAV.getNavLinks()
        : [];

    function renderFooterLinks() {
        return navLinks
            .filter((link) => !link.isCta)
            .map((link) => `<li><a href="${link.href}" class="footer-link">${link.label}</a></li>`)
            .join('');
    }

    function createFooter() {
        return `
            <footer class="site-footer architectural-grid">
                <div class="site-footer-grid">
                    <div>
                        <div class="footer-logo">
                            <img src="/images/kurumi_icon.png" alt="Wovi Logo">
                            <span>Wovi</span>
                        </div>
                        <p style="margin-top:0.95rem; color:var(--color-muted); line-height:1.9;">
                            「暮らしをつくる喜び」を
                            すべての人に。
                        </p>
                    </div>

                    <div>
                        <h4 class="footer-title">Menu</h4>
                        <ul class="footer-links">
                            ${renderFooterLinks()}
                        </ul>
                    </div>

                    <div>
                        <h4 class="footer-title">Company</h4>
                        <ul class="footer-meta">
                            <li>株式会社 Wovi</li>
                            <li>〒333-0866 埼玉県川口市芝6306-12</li>
                            <li><a href="mailto:info@wovi.net" class="footer-link">info@wovi.net</a></li>
                        </ul>
                    </div>
                </div>

                <div class="footer-bottom">
                    <span>© 2026 Wovi Inc.</span>
                    <a href="/policy" class="footer-link">Privacy Policy</a>
                </div>
            </footer>
        `;
    }

    global.createFooter = createFooter;
})(window);
