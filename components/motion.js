(function (global) {
    function initMotion(options = {}) {
        const heroSelector = options.heroSelector || '.hero-reveal';
        const revealSelector = options.revealSelector || '.reveal-target';
        const parallaxSelector = options.parallaxSelector || '.parallax-img';

        const heroElements = Array.from(document.querySelectorAll(heroSelector));
        const revealElements = Array.from(document.querySelectorAll(revealSelector));
        const parallaxElements = Array.from(document.querySelectorAll(parallaxSelector));

        const initTimer = global.setTimeout(() => {
            heroElements.forEach((el, index) => {
                el.style.transitionDelay = `${index * 0.09}s`;
                el.classList.add('is-revealed');
            });
        }, 90);

        let observer = null;
        if ('IntersectionObserver' in global) {
            observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-revealed');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                root: null,
                threshold: 0.12
            });

            revealElements.forEach((el) => observer.observe(el));
        } else {
            revealElements.forEach((el) => el.classList.add('is-revealed'));
        }

        let ticking = false;

        function onScroll() {
            if (ticking) return;
            ticking = true;

            global.requestAnimationFrame(() => {
                const scrolled = global.scrollY || 0;
                parallaxElements.forEach((el) => {
                    const speed = Number(el.getAttribute('data-speed')) || 0.12;
                    el.style.transform = `translateY(${scrolled * speed}px) scale(1.06)`;
                });
                ticking = false;
            });
        }

        global.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        return function dispose() {
            global.clearTimeout(initTimer);
            global.removeEventListener('scroll', onScroll);
            if (observer) {
                observer.disconnect();
            }
        };
    }

    global.WOVI_MOTION = {
        ...(global.WOVI_MOTION || {}),
        init: initMotion
    };
})(window);
