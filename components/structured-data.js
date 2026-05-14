(function () {
    const siteUrl = 'https://wovi.net';
    const organization = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: '株式会社Wovi',
        alternateName: 'Wovi Inc.',
        url: siteUrl,
        logo: `${siteUrl}/images/kurumi_icon_black.png`,
        email: 'info@wovi.net',
        address: {
            '@type': 'PostalAddress',
            postalCode: '333-0866',
            addressRegion: '埼玉県',
            addressLocality: '川口市',
            streetAddress: '芝6306番地12',
            addressCountry: 'JP'
        }
    };

    const pages = {
        home: [
            organization,
            {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: '株式会社Wovi',
                url: siteUrl,
                inLanguage: 'ja'
            }
        ],
        company: [
            organization,
            {
                '@context': 'https://schema.org',
                '@type': 'AboutPage',
                name: '会社概要 | 株式会社Wovi',
                url: `${siteUrl}/company.html`,
                inLanguage: 'ja'
            }
        ],
        news: [
            organization,
            {
                '@context': 'https://schema.org',
                '@type': 'CollectionPage',
                name: 'お知らせ | 株式会社Wovi',
                url: `${siteUrl}/news.html`,
                inLanguage: 'ja'
            }
        ],
        kurumi: [
            organization,
            {
                '@context': 'https://schema.org',
                '@type': 'Product',
                name: 'Kurumi',
                brand: {
                    '@type': 'Brand',
                    name: 'Wovi'
                },
                description: '暮らしや仕事の変化に合わせて組み替えられるWoviのモジュール小屋キットです。',
                image: `${siteUrl}/images/kurumi.png`,
                url: `${siteUrl}/kurumi.html`
            }
        ],
        miniature: [
            organization,
            {
                '@context': 'https://schema.org',
                '@type': 'Service',
                name: '住宅ミニチュア製造',
                provider: {
                    '@type': 'Organization',
                    name: '株式会社Wovi',
                    url: siteUrl
                },
                areaServed: 'JP',
                description: '写真や図面から、思い出の住まいを手元に置ける住宅ミニチュアへ制作するサービスです。',
                url: `${siteUrl}/miniature.html`
            }
        ],
        gallery: [
            organization,
            {
                '@context': 'https://schema.org',
                '@type': 'ImageGallery',
                name: '制作事例ギャラリー - Wovi',
                url: `${siteUrl}/miniature-gallery.html`,
                inLanguage: 'ja'
            }
        ],
        policy: [
            organization,
            {
                '@context': 'https://schema.org',
                '@type': 'WebPage',
                name: 'プライバシーポリシー | 株式会社Wovi',
                url: `${siteUrl}/policy/`,
                inLanguage: 'ja'
            }
        ]
    };

    function appendJsonLd(item, index) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = `structured-data-${index + 1}`;
        script.textContent = JSON.stringify(item);
        document.head.appendChild(script);
    }

    document.addEventListener('DOMContentLoaded', function () {
        const page = document.body && document.body.getAttribute('data-page');
        const entries = pages[page] || [];
        entries.forEach(appendJsonLd);
    });
})();
