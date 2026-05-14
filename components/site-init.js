(function (global) {
    function mountLayout() {
        const headerPlaceholder = document.getElementById('header-placeholder');
        const footerPlaceholder = document.getElementById('footer-placeholder');

        if (headerPlaceholder && typeof global.createHeader === 'function') {
            headerPlaceholder.innerHTML = global.createHeader();
            if (typeof global.initializeHeaderEvents === 'function') {
                global.initializeHeaderEvents();
            }
        }

        if (footerPlaceholder && typeof global.createFooter === 'function') {
            footerPlaceholder.innerHTML = global.createFooter();
        }
    }

    function initMotion() {
        if (global.WOVI_MOTION && typeof global.WOVI_MOTION.init === 'function') {
            global.WOVI_MOTION.init();
        }
    }

    function initNoteFeed() {
        const container = document.getElementById('note-articles');
        if (!container || !global.NoteFeed || typeof global.NoteFeed.load !== 'function') return;

        const limit = Number(document.body.getAttribute('data-note-feed-limit')) || 3;
        const variant = document.body.getAttribute('data-note-feed-variant') || 'default';
        global.NoteFeed.load({ containerId: 'note-articles', limit, variant });
    }

    function initContactForm() {
        const contactForm = document.getElementById('contact-form');
        if (!contactForm) return;

        contactForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData);
            const subject = encodeURIComponent('お問い合わせ - Wovi');
            const body = encodeURIComponent([
                `お名前: ${data.name}`,
                `会社名: ${data.company || '(未入力)'}`,
                `メールアドレス: ${data.email}`,
                `電話番号: ${data.phone || '(未入力)'}`,
                '',
                'お問い合わせ内容:',
                data.message
            ].join('\n'));

            global.location.href = `mailto:info@wovi.net?subject=${subject}&body=${body}`;
            global.alert('メールアプリが開きます。送信完了後、担当者よりご連絡させていただきます。');
            contactForm.reset();
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        mountLayout();
        initMotion();
        initNoteFeed();
        initContactForm();
    });
})(window);
