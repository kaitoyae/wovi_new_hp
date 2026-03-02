(function (global) {
    const navLinks = (global.WOVI_NAV && typeof global.WOVI_NAV.getNavLinks === 'function')
        ? global.WOVI_NAV.getNavLinks()
        : [];

    function renderDesktopNav() {
        return navLinks.map((link) => {
            if (link.isCta) {
                return `<a href="${link.href}" class="site-nav-cta">${link.label}</a>`;
            }
            return `<a href="${link.href}" class="site-nav-link">${link.label}</a>`;
        }).join('');
    }

    function renderMobileNav() {
        return navLinks.map((link) => {
            if (link.isCta) {
                return `<a href="${link.href}" class="site-nav-cta">${link.label}</a>`;
            }
            return `<a href="${link.href}" class="site-nav-link">${link.label}</a>`;
        }).join('');
    }

    function createHeader() {
        return `
            <header class="site-header">
                <div class="site-header-inner">
                    <a href="/index.html" class="site-logo-link" aria-label="Woviトップページへ">
                        <img src="/images/kurumi_icon.png" alt="Wovi Logo">
                        <span class="site-logo-wordmark">WOVI</span>
                    </a>

                    <nav class="site-nav-desktop" aria-label="グローバルナビゲーション">
                        ${renderDesktopNav()}
                    </nav>

                    <button id="mobile-menu-button" type="button" class="site-menu-button" aria-label="メニューを開閉" aria-expanded="false" aria-controls="mobile-menu">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                        </svg>
                    </button>
                </div>

                <div id="mobile-menu" class="site-mobile-menu" hidden>
                    ${renderMobileNav()}
                </div>
            </header>
        `;
    }

    function initializeHeaderEvents() {
        const menuButton = document.getElementById('mobile-menu-button');
        const menu = document.getElementById('mobile-menu');

        if (!menuButton || !menu) return;

        function setMenuState(isOpen) {
            menuButton.setAttribute('aria-expanded', String(isOpen));
            if (isOpen) {
                menu.hidden = false;
                menu.classList.add('is-open');
            } else {
                menu.hidden = true;
                menu.classList.remove('is-open');
            }
        }

        menuButton.addEventListener('click', function () {
            const shouldOpen = menu.hidden;
            setMenuState(shouldOpen);
        });

        menu.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', function () {
                setMenuState(false);
            });
        });

        document.addEventListener('click', function (event) {
            if (!menu.contains(event.target) && !menuButton.contains(event.target)) {
                setMenuState(false);
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                setMenuState(false);
            }
        });
    }

    global.createHeader = createHeader;
    global.initializeHeaderEvents = initializeHeaderEvents;
})(window);
