// グローバルヘッダーコンポーネント
function createHeader() {
    return `
        <!-- ヘッダー -->
        <header class="p-3 md:p-4 fixed top-0 left-0 w-full z-10 bg-white shadow-sm">
            <nav class="flex items-center justify-between">
                <!-- ロゴ -->
                <div class="flex items-center">
                    <a href="index.html">
                        <img src="images/logo.png" alt="Wovi Logo" class="h-14 md:h-16 w-auto">
                    </a>
                </div>
                
                <!-- ナビゲーションメニュー -->
                <div class="hidden md:flex items-center space-x-8">
                    <a href="company.html" class="text-gray-700 hover:text-gray-900 font-semibold transition-colors duration-200 font-jp">Woviについて</a>
                    <a href="index.html#business" class="text-gray-700 hover:text-gray-900 font-semibold transition-colors duration-200 font-jp">事業内容</a>
                    <a href="company.html#company" class="text-gray-700 hover:text-gray-900 font-semibold transition-colors duration-200 font-jp">会社概要</a>
                    <a href="news.html" class="text-gray-700 hover:text-gray-900 font-semibold transition-colors duration-200 font-jp">お知らせ</a>
                    <a href="index.html#contact" class="btn-creative font-semibold py-2 px-6 rounded-full">お問い合わせ</a>
                </div>
                
                <!-- モバイル用メニューボタン -->
                <div class="md:hidden">
                    <button id="mobile-menu-button" class="text-gray-700 hover:text-gray-900 focus:outline-none">
                        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                        </svg>
                    </button>
                </div>
            </nav>
            
            <!-- モバイル用メニュー -->
            <div id="mobile-menu" class="hidden md:hidden mt-4">
                <div class="rounded-lg shadow-lg p-4 space-y-2" style="background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);">
                    <a href="company.html" class="block text-gray-700 hover:text-gray-900 font-semibold py-2 transition-colors duration-200 font-jp">Woviについて</a>
                    <a href="index.html#business" class="block text-gray-700 hover:text-gray-900 font-semibold py-2 transition-colors duration-200 font-jp">事業内容</a>
                    <a href="company.html#company" class="block text-gray-700 hover:text-gray-900 font-semibold py-2 transition-colors duration-200 font-jp">会社概要</a>
                    <a href="news.html" class="block text-gray-700 hover:text-gray-900 font-semibold py-2 transition-colors duration-200 font-jp">お知らせ</a>
                    <a href="index.html#contact" class="block text-gray-700 hover:text-gray-900 font-semibold py-2 transition-colors duration-200 font-jp">お問い合わせ</a>
                </div>
            </div>
        </header>
    `;
}

// ヘッダーのイベントリスナーを設定する関数
function initializeHeaderEvents() {
    // モバイルメニューの開閉
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });

        // メニューリンクをクリックした際にモバイルメニューを閉じる
        document.querySelectorAll('#mobile-menu a').forEach(link => {
            link.addEventListener('click', function() {
                mobileMenu.classList.add('hidden');
            });
        });

        // ページ外をクリックした際にモバイルメニューを閉じる
        document.addEventListener('click', function(event) {
            if (!mobileMenu.contains(event.target) && !mobileMenuButton.contains(event.target)) {
                mobileMenu.classList.add('hidden');
            }
        });
    }
}