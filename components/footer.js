(function (global) {
    const navLinks = (global.WOVI_NAV && typeof global.WOVI_NAV.getNavLinks === 'function')
        ? global.WOVI_NAV.getNavLinks()
        : [];

    function renderFooterLinks() {
        return navLinks.map(link =>
            `<li><a href="${link.href}" class="text-gray-300 hover:text-white transition-colors">${link.label}</a></li>`
        ).join('\n                            ');
    }

    function createFooter() {
        return `
            <!-- フッター -->
            <footer class="text-white py-16" style="background-color: #2d2d2d;">
                <div class="container mx-auto px-6">
                    <div class="grid md:grid-cols-4 gap-8 mb-12">
                        <!-- ロゴとビジョン -->
                        <div class="md:col-span-2">
                            <img src="/images/logowhitetext.png" alt="Wovi Logo" class="h-16 w-auto mb-4">
                            <p class="text-sm text-gray-300 leading-relaxed">
                                株式会社Wovi<br>
                                Innovation with no one left behind,
                            </p>
                        </div>
                        
                        <!-- メニュー -->
                        <div>
                            <h4 class="font-semibold mb-4">メニュー</h4>
                            <ul class="space-y-2 text-sm">
                                ${renderFooterLinks()}
                            </ul>
                        </div>
                        
                        <!-- 会社情報 -->
                        <div>
                            <h4 class="font-semibold mb-4">会社情報</h4>
                            <ul class="space-y-2 text-sm text-gray-300">
                                <li>株式会社 Wovi</li>
                                <li>〒333-0866</li>
                                <li>埼玉県川口市 芝6306-12</li>
                                <li>info@wovi.net</li>
                            </ul>
                        </div>
                    </div>
                    
                    <!-- 下部 -->
                    <div class="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
                        <div class="text-sm text-gray-400 mb-4 md:mb-0">
                            &copy; 2025 Wovi. All Rights Reserved.
                        </div>
                        <div class="flex space-x-6 text-sm">
                            <a href="/policy" class="text-gray-400 hover:text-white transition-colors">プライバシーポリシー</a>
                            <a href="#" class="text-gray-400 hover:text-white transition-colors">利用規約</a>
                        </div>
                    </div>
                </div>
            </footer>
        `;
    }

    global.createFooter = createFooter;
})(window);
