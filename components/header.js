(function (global) {
    const navLinks = (global.WOVI_NAV && typeof global.WOVI_NAV.getNavLinks === 'function')
        ? global.WOVI_NAV.getNavLinks()
        : [];

    const CTA_FALLBACK_CLASSES = 'inline-flex items-center justify-center border border-black text-black hover:bg-[#FFD166] hover:border-[#FFD166] transition-colors duration-200';

    function renderDesktopNav() {
        return navLinks.map(link => {
            if (link.isCta) {
                return `<a href="${link.href}" class="btn-creative ${CTA_FALLBACK_CLASSES} font-semibold py-2 px-6 rounded-full">${link.label}</a>`;
            }
            return `<a href="${link.href}" class="text-gray-700 hover:text-gray-900 font-semibold transition-colors duration-200 font-jp">${link.label}</a>`;
        }).join('\n                    ');
    }

    function renderMobileNav() {
        return navLinks.map(link => {
            return `<a href="${link.href}" class="block text-gray-700 hover:text-gray-900 font-semibold py-2 transition-colors duration-200 font-jp">${link.label}</a>`;
        }).join('\n                    ');
    }

    function createHeader() {
        return `
            <!-- ヘッダー -->
            <header class="p-3 md:p-4 fixed top-0 left-0 w-full z-50 bg-white shadow-sm">
                <nav class="flex items-center justify-between">
                    <!-- ロゴ -->
                    <div class="flex items-center">
                        <a href="/index.html">
                            <img src="/images/logo.png" alt="Wovi Logo" class="h-14 md:h-16 w-auto">
                        </a>
                    </div>
                    
                    <!-- ナビゲーションメニュー -->
                    <div class="hidden md:flex items-center space-x-8">
                        ${renderDesktopNav()}
                    </div>
                    
                    <!-- モバイル用メニューボタン -->
                    <div class="md:hidden">
                        <button id="mobile-menu-button" type="button" class="text-gray-700 hover:text-gray-900 focus:outline-none"
                            aria-label="メニューを開閉" aria-expanded="false" aria-controls="mobile-menu">
                            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                            </svg>
                        </button>
                    </div>
                </nav>
                
                <!-- モバイル用メニュー -->
                <div id="mobile-menu" class="hidden md:hidden mt-4">
                    <div class="rounded-lg shadow-lg p-4 space-y-2" style="background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);">
                        ${renderMobileNav()}
                    </div>
                </div>
            </header>
        `;
    }

    function initializeHeaderEvents() {
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');

        if (mobileMenuButton && mobileMenu) {
            function setMenuState(isOpen) {
                if (isOpen) {
                    mobileMenu.classList.remove('hidden');
                } else {
                    mobileMenu.classList.add('hidden');
                }
                mobileMenuButton.setAttribute('aria-expanded', String(isOpen));
            }

            mobileMenuButton.addEventListener('click', function () {
                const willOpen = mobileMenu.classList.contains('hidden');
                setMenuState(willOpen);
            });

            document.querySelectorAll('#mobile-menu a').forEach(link => {
                link.addEventListener('click', function () {
                    setMenuState(false);
                });
            });

            document.addEventListener('click', function (event) {
                if (!mobileMenu.contains(event.target) && !mobileMenuButton.contains(event.target)) {
                    setMenuState(false);
                }
            });

            document.addEventListener('keydown', function (event) {
                if (event.key === 'Escape') {
                    setMenuState(false);
                }
            });
        }
    }

    global.createHeader = createHeader;
    global.initializeHeaderEvents = initializeHeaderEvents;
})(window);
