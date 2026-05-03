(function (global) {
    const CREATOR_SLUG = 'wovi';
    const NOTE_V2_URL = `https://note.com/api/v2/creators/${CREATOR_SLUG}/contents?kind=note&page=1`;
    const NOTE_V1_URL = `https://note.com/api/v1/creators/${CREATOR_SLUG}/contents?kind=note&page=1`;
    const NOTE_DETAIL_URL = 'https://note.com/api/v2/notes/';
    const RSS_URL = 'https://note.com/wovi/rss';
    const RSS_API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`;
    const CORS_PROXY = 'https://corsproxy.io/?';
    const CACHE_TTL_MS = 5 * 60 * 1000;
    const CACHE_KEY_PREFIX = 'wovi_note_articles_v2';
    const DEFAULT_NOTE_LINK = 'https://note.com/wovi/all';
    const ALLOWED_NOTE_HOSTS = new Set(['note.com', 'www.note.com']);

    const VARIANTS = {
        default: {
            containerClasses: 'wovi-card overflow-hidden',
            containerStyles: {},
            titleTag: 'h3',
            descriptionLimit: 130,
            descriptionClasses: 'line-clamp-3',
            titleClasses: 'line-clamp-2',
            bodyWrapperClasses: 'p-6'
        },
        news: {
            containerClasses: 'article-card overflow-hidden',
            containerStyles: {},
            titleTag: 'h2',
            descriptionLimit: 170,
            descriptionClasses: 'line-clamp-3',
            titleClasses: 'line-clamp-2',
            bodyWrapperClasses: 'p-6'
        }
    };

    function withCacheBust(url) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}_ts=${Date.now()}`;
    }

    function parseHttpsUrl(value) {
        if (typeof value !== 'string') return null;
        const trimmed = value.trim();
        if (!trimmed) return null;

        try {
            const url = new URL(trimmed);
            return url.protocol === 'https:' ? url : null;
        } catch (error) {
            return null;
        }
    }

    function getSafeNoteLink(value, fallback = DEFAULT_NOTE_LINK) {
        const url = parseHttpsUrl(value);
        if (!url || !ALLOWED_NOTE_HOSTS.has(url.hostname)) return fallback;
        if (!url.pathname.startsWith(`/${CREATOR_SLUG}`)) return fallback;
        return url.href;
    }

    function getSafeImageUrl(value) {
        const url = parseHttpsUrl(value);
        return url ? url.href : '';
    }

    function sanitizeText(value, maxLength = 500) {
        return String(value || '').replace(/\s+/g, ' ').trim().substring(0, maxLength);
    }

    function sanitizeNoteKey(value) {
        const key = sanitizeText(value, 120);
        return /^[A-Za-z0-9_-]+$/.test(key) ? key : '';
    }

    function sanitizeArticle(article) {
        if (!article) return null;

        const noteKey = sanitizeNoteKey(article.noteKey);
        const thumbnail = getSafeImageUrl(article.thumbnail);

        return {
            title: sanitizeText(article.title, 160) || 'Wovi note',
            link: getSafeNoteLink(article.link),
            pubDate: sanitizeText(article.pubDate, 80),
            description: sanitizeText(article.description, 320),
            thumbnail,
            isUserProfile: Boolean(article.isUserProfile),
            noteKey,
            needsDetailImage: Boolean(article.needsDetailImage && noteKey && !thumbnail)
        };
    }

    function sanitizeArticles(articles) {
        return (Array.isArray(articles) ? articles : [])
            .map(sanitizeArticle)
            .filter(Boolean);
    }

    function getRequestUrl(url, forceRefresh, useProxy) {
        const targetUrl = forceRefresh ? withCacheBust(url) : url;
        return useProxy ? `${CORS_PROXY}${encodeURIComponent(targetUrl)}` : targetUrl;
    }

    async function safeFetchJson(url, forceRefresh = false, useProxy = true) {
        try {
            const requestUrl = getRequestUrl(url, forceRefresh, useProxy);
            const response = await fetch(requestUrl, { cache: forceRefresh ? 'no-store' : 'default' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.warn(`データ取得失敗 (${url}):`, error);
            return null;
        }
    }

    async function safeFetchText(url, forceRefresh = false, useProxy = true) {
        try {
            const requestUrl = getRequestUrl(url, forceRefresh, useProxy);
            const response = await fetch(requestUrl, { cache: forceRefresh ? 'no-store' : 'default' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.warn(`データ取得失敗 (${url}):`, error);
            return null;
        }
    }

    function buildRssImageMap(rssData) {
        const map = {};
        const items = Array.isArray(rssData) ? rssData : rssData?.items;
        if (!items) return map;
        items.forEach((item) => {
            const link = getSafeNoteLink(item.link, '');
            const thumbnail = getSafeImageUrl(item.thumbnail);
            if (link && thumbnail) {
                map[link] = thumbnail;
            }
        });
        return map;
    }

    function stripHtml(html) {
        return sanitizeText((html || '').replace(/<[^>]*>/g, ' '), 1000);
    }

    function extractImageFromHtml(html) {
        const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
        const image = doc.querySelector('img[src]');
        return getSafeImageUrl(image?.getAttribute('src') || '');
    }

    function truncate(text, limit) {
        if (!text) return '';
        return text.length > limit ? `${text.substring(0, limit)}...` : text;
    }

    function formatDate(value) {
        const date = value ? new Date(value) : new Date();
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString('ja-JP');
    }

    function getNoteKey(item) {
        if (item.key) return sanitizeNoteKey(item.key);

        const url = parseHttpsUrl(item.noteUrl);
        if (url) {
            const parts = url.pathname.split('/').filter(Boolean);
            return sanitizeNoteKey(parts[parts.length - 1]);
        }
        return '';
    }

    function normalizeArticle(item, rssImages) {
        let imageUrl = item.thumbnailExternalUrl ||
            item.eyecatch?.src ||
            item.eyecatch?.url ||
            item.thumbnail?.url ||
            item.thumbnail?.src ||
            item.coverImageUrl ||
            item.image?.url ||
            '';

        if (!imageUrl && item.body) {
            imageUrl = extractImageFromHtml(item.body);
        }

        const safeNoteLink = getSafeNoteLink(item.noteUrl);
        if (!imageUrl && rssImages[safeNoteLink]) {
            imageUrl = rssImages[safeNoteLink];
        }

        let isUserProfile = false;
        if (!imageUrl && item.user?.userProfileImagePath) {
            imageUrl = item.user.userProfileImagePath;
            isUserProfile = true;
        }

        const noteKey = getNoteKey(item);

        return sanitizeArticle({
            title: item.name || '',
            link: safeNoteLink,
            pubDate: item.publishAt,
            description: stripHtml(item.body).substring(0, 260),
            thumbnail: imageUrl,
            isUserProfile,
            noteKey,
            needsDetailImage: !imageUrl && !!noteKey
        });
    }

    function normalizeRssArticle(item) {
        const body = item.description || item.content || '';
        return sanitizeArticle({
            title: item.title || '',
            link: item.link || '',
            pubDate: item.pubDate || item.published || new Date().toISOString(),
            description: stripHtml(body).substring(0, 260),
            thumbnail: item.thumbnail || extractImageFromHtml(body),
            isUserProfile: false,
            noteKey: '',
            needsDetailImage: false
        });
    }

    function getXmlText(node, tagNames) {
        for (const tagName of tagNames) {
            const element = node.getElementsByTagName(tagName)[0];
            const value = element?.textContent?.trim();
            if (value) return value;
        }
        return '';
    }

    function getXmlAttribute(node, tagNames, attributeName) {
        for (const tagName of tagNames) {
            const element = node.getElementsByTagName(tagName)[0];
            const value = element?.getAttribute(attributeName);
            if (value) return value;
        }
        return '';
    }

    function parseRssItems(xmlText) {
        if (!xmlText) return null;
        const rssDocument = new DOMParser().parseFromString(xmlText, 'text/xml');
        if (rssDocument.getElementsByTagName('parsererror').length) {
            return null;
        }

        return Array.from(rssDocument.getElementsByTagName('item')).map((item) => {
            const description = getXmlText(item, ['description', 'content:encoded']);
            return {
                title: getXmlText(item, ['title']),
                link: getXmlText(item, ['link', 'guid']),
                pubDate: getXmlText(item, ['pubDate', 'published']),
                description,
                thumbnail: getXmlAttribute(item, ['media:thumbnail', 'media:content'], 'url') ||
                    extractImageFromHtml(description)
            };
        });
    }

    function getCacheKey(limit) {
        return `${CACHE_KEY_PREFIX}_${limit}`;
    }

    function readCache(limit) {
        try {
            const raw = localStorage.getItem(getCacheKey(limit));
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.articles) || !parsed.cachedAt) return null;
            if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) {
                localStorage.removeItem(getCacheKey(limit));
                return null;
            }
            const articles = sanitizeArticles(parsed.articles);
            return articles.length ? { ...parsed, articles } : null;
        } catch (error) {
            console.warn('noteキャッシュ読み込み失敗:', error);
            return null;
        }
    }

    function writeCache(limit, articles) {
        try {
            const safeArticles = sanitizeArticles(articles);
            if (!safeArticles.length) return;
            const payload = JSON.stringify({
                cachedAt: Date.now(),
                articles: safeArticles
            });
            localStorage.setItem(getCacheKey(limit), payload);
        } catch (error) {
            console.warn('noteキャッシュ保存失敗:', error);
        }
    }

    function clearCache(limit) {
        if (typeof limit === 'number') {
            localStorage.removeItem(getCacheKey(limit));
            return;
        }
        try {
            Object.keys(localStorage)
                .filter((key) => key.startsWith(CACHE_KEY_PREFIX))
                .forEach((key) => localStorage.removeItem(key));
        } catch (error) {
            console.warn('noteキャッシュ削除失敗:', error);
        }
    }

    async function fetchNoteContents(limit, forceRefresh = false) {
        const noteV2Data = await safeFetchJson(NOTE_V2_URL, forceRefresh);
        if (Array.isArray(noteV2Data?.data?.contents)) {
            return noteV2Data.data.contents.slice(0, limit);
        }

        const noteV1Data = await safeFetchJson(NOTE_V1_URL, forceRefresh);
        if (Array.isArray(noteV1Data?.data?.contents)) {
            return noteV1Data.data.contents.slice(0, limit);
        }

        return null;
    }

    async function fetchRssItems(forceRefresh = false) {
        const rssJson = await safeFetchJson(RSS_API_URL, forceRefresh, false);
        if (Array.isArray(rssJson?.items) && rssJson.items.length) {
            return rssJson.items;
        }

        const rssText = await safeFetchText(RSS_URL, forceRefresh);
        return parseRssItems(rssText);
    }

    async function fetchArticles(limit = 3, forceRefresh = false) {
        const rssData = await fetchRssItems(forceRefresh);
        if (Array.isArray(rssData) && rssData.length) {
            return rssData.slice(0, limit).map(normalizeRssArticle);
        }

        const noteContents = await fetchNoteContents(limit, forceRefresh);
        if (Array.isArray(noteContents)) {
            if (!noteContents.length) {
                return [];
            }

            const rssImages = buildRssImageMap(rssData);
            return noteContents.map((item) => normalizeArticle(item, rssImages));
        }

        throw new Error('note APIおよびRSSからデータを取得できませんでした。');
    }

    function createArticleElement(article, variant) {
        const config = VARIANTS[variant] || VARIANTS.default;
        const safeArticle = sanitizeArticle(article);
        const element = document.createElement('div');
        element.className = config.containerClasses;
        Object.entries(config.containerStyles).forEach(([key, value]) => {
            element.style[key] = value;
        });

        const imageWrapper = document.createElement('div');
        imageWrapper.dataset.articleImage = '';

        const bodyWrapper = document.createElement('div');
        bodyWrapper.className = config.bodyWrapperClasses;

        const date = document.createElement('div');
        date.className = 'note-card-date';
        date.textContent = formatDate(safeArticle.pubDate);

        const title = document.createElement(config.titleTag === 'h2' ? 'h2' : 'h3');
        title.className = config.titleClasses;
        title.style.cssText = "margin-top:0.7rem; font-family:var(--font-heading, 'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif); font-size:1.2rem; letter-spacing:0.04em; font-weight:400; line-height:1.5;";
        title.textContent = safeArticle.title;

        const description = document.createElement('p');
        description.className = config.descriptionClasses;
        description.style.cssText = 'margin-top:0.7rem; color:var(--color-muted); line-height:1.8;';
        description.textContent = truncate(safeArticle.description, config.descriptionLimit);

        const link = document.createElement('a');
        link.href = safeArticle.link;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'note-card-link';
        link.style.marginTop = '1rem';
        link.textContent = '記事を読む';

        bodyWrapper.append(date, title, description, link);
        element.append(imageWrapper, bodyWrapper);
        updateImageWrapper(imageWrapper, safeArticle);

        return { element, imageWrapper };
    }

    function updateImageWrapper(wrapper, article, imageUrlOverride) {
        if (!wrapper) return;

        const safeArticle = sanitizeArticle(article);
        const imageUrl = getSafeImageUrl(imageUrlOverride) || safeArticle.thumbnail;
        wrapper.replaceChildren();

        if (imageUrl) {
            wrapper.className = `h-56 ${safeArticle.isUserProfile ? 'flex items-center justify-center' : 'overflow-hidden'}`;
            wrapper.style.backgroundColor = safeArticle.isUserProfile ? 'rgba(255,255,255,0.85)' : '';

            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = safeArticle.title;
            img.className = `${safeArticle.isUserProfile ? '' : 'w-full h-full'} object-cover`.trim();
            img.loading = 'lazy';
            img.decoding = 'async';
            img.style.cssText = safeArticle.isUserProfile
                ? 'max-width:50%; max-height:50%; object-fit:contain;'
                : 'max-width:100%; max-height:100%; object-fit:cover; transition:transform .45s ease;';

            if (!safeArticle.isUserProfile) {
                img.addEventListener('mouseover', () => {
                    img.style.transform = 'scale(1.05)';
                });
                img.addEventListener('mouseout', () => {
                    img.style.transform = 'scale(1)';
                });
            }
            img.addEventListener('error', () => renderFallbackImage(wrapper));
            wrapper.appendChild(img);
        } else {
            renderFallbackImage(wrapper);
        }
    }

    function renderFallbackImage(wrapper) {
        if (!wrapper) return;
        wrapper.className = 'h-56 flex items-center justify-center';
        wrapper.style.backgroundColor = 'var(--color-kurumi-soft)';
        const label = document.createElement('span');
        label.style.cssText = 'letter-spacing:0.2em; font-size:0.68rem; color:var(--color-kurumi); text-transform:uppercase;';
        label.textContent = 'WOVI NOTE';
        wrapper.replaceChildren(label);
    }

    async function requestDetailImage(article, wrapper, forceRefresh = false) {
        const noteKey = sanitizeNoteKey(article?.noteKey);
        if (!noteKey) return;

        const detailData = await safeFetchJson(`${NOTE_DETAIL_URL}${noteKey}`, forceRefresh);
        const detailImage = getSafeImageUrl(detailData?.data?.thumbnailExternalUrl ||
            detailData?.data?.eyecatch?.src ||
            detailData?.data?.eyecatch?.url ||
            '');

        if (detailImage) {
            article.thumbnail = detailImage;
            article.isUserProfile = false;
            updateImageWrapper(wrapper, article, detailImage);
        }
    }

    function createFallbackStateElement() {
        const wrapper = document.createElement('div');
        wrapper.className = 'wovi-card';
        wrapper.style.cssText = 'padding:2rem; text-align:center; grid-column:1 / -1;';

        const title = document.createElement('h3');
        title.style.cssText = "font-family:var(--font-heading, 'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif); font-size:1.35rem; font-weight:400; letter-spacing:0.06em;";
        title.textContent = '最新記事はnoteで公開中';

        const copy = document.createElement('p');
        copy.style.cssText = 'margin-top:0.8rem; color:var(--color-muted); line-height:1.9;';
        copy.textContent = 'Woviの最新情報や活動報告をnoteで発信しています。';

        const link = document.createElement('a');
        link.href = DEFAULT_NOTE_LINK;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'note-card-link';
        link.style.marginTop = '1.2rem';
        link.textContent = 'noteで記事を見る';

        wrapper.append(title, copy, link);
        return wrapper;
    }

    function renderFallbackState(container) {
        if (!container) return;
        container.replaceChildren(createFallbackStateElement());
    }

    function getArticleSignature(articles) {
        return (articles || [])
            .map((article) => `${article.link}|${article.pubDate}|${article.title}`)
            .join('||');
    }

    function renderArticles(container, articles, variant, forceRefreshForDetail = false) {
        const safeArticles = sanitizeArticles(articles);
        container.replaceChildren();
        safeArticles.forEach((article) => {
            const { element, imageWrapper } = createArticleElement(article, variant);
            container.appendChild(element);
            if (article.needsDetailImage) {
                requestDetailImage(article, imageWrapper, forceRefreshForDetail);
            }
        });
    }

    async function loadNoteFeed(options = {}) {
        const {
            containerId = 'note-articles',
            limit = 3,
            variant = 'default',
            forceRefresh = false
        } = options;

        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`IDが${containerId}の要素が見つかりませんでした。`);
            return [];
        }

        try {
            const cachedPayload = forceRefresh ? null : readCache(limit);
            if (cachedPayload?.articles?.length) {
                renderArticles(container, cachedPayload.articles, variant, false);

                // キャッシュ表示後は毎回裏で再取得し、差分があれば即更新（SWR）
                fetchArticles(limit, true).then((freshArticles) => {
                    if (!Array.isArray(freshArticles)) return;
                    if (!freshArticles.length) {
                        renderFallbackState(container);
                        clearCache(limit);
                        return;
                    }
                    if (getArticleSignature(freshArticles) !== getArticleSignature(cachedPayload.articles)) {
                        renderArticles(container, freshArticles, variant, true);
                    }
                    writeCache(limit, freshArticles);
                }).catch((error) => {
                    console.warn('note記事のバックグラウンド更新に失敗しました:', error);
                });

                return cachedPayload.articles;
            }

            const articles = await fetchArticles(limit, forceRefresh);
            if (!articles.length) {
                renderFallbackState(container);
                clearCache(limit);
                return [];
            }

            renderArticles(container, articles, variant, forceRefresh);
            writeCache(limit, articles);
            return articles;
        } catch (error) {
            console.warn('note記事の読み込みに失敗しました:', error);
            renderFallbackState(container);
            return [];
        }
    }

    global.NoteFeed = {
        load: loadNoteFeed,
        fetchArticles,
        clearCache
    };
})(window);
