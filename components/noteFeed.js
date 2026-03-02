(function (global) {
    const CREATOR_SLUG = 'wovi';
    const NOTE_V2_URL = `https://note.com/api/v2/creators/${CREATOR_SLUG}/contents?kind=note&page=1`;
    const NOTE_V1_URL = `https://note.com/api/v1/creators/${CREATOR_SLUG}/contents?kind=note&page=1`;
    const NOTE_DETAIL_URL = 'https://note.com/api/v2/notes/';
    const RSS_URL = 'https://note.com/wovi/rss';
    const RSS_API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`;
    const CORS_PROXY = 'https://corsproxy.io/?';
    const RSS_TIMEOUT_MS = 1500;
    const CACHE_TTL_MS = 5 * 60 * 1000;
    const CACHE_KEY_PREFIX = 'wovi_note_articles_v2';

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

    function withProxy(url) {
        return `${CORS_PROXY}${encodeURIComponent(url)}`;
    }

    function withCacheBust(url) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}_ts=${Date.now()}`;
    }

    async function safeFetchJson(url, forceRefresh = false) {
        try {
            const requestUrl = forceRefresh ? withCacheBust(url) : url;
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

    function buildRssImageMap(rssData) {
        const map = {};
        if (rssData?.items) {
            rssData.items.forEach((item) => {
                if (item.link && item.thumbnail) {
                    map[item.link] = item.thumbnail;
                }
            });
        }
        return map;
    }

    function stripHtml(html) {
        return (html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    function truncate(text, limit) {
        if (!text) return '';
        return text.length > limit ? `${text.substring(0, limit)}...` : text;
    }

    function formatDate(value) {
        const date = value ? new Date(value) : new Date();
        return date.toLocaleDateString('ja-JP');
    }

    function getNoteKey(item) {
        if (item.key) return item.key;
        if (item.noteUrl) {
            const parts = item.noteUrl.split('/');
            return parts[parts.length - 1];
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
            const imgMatch = item.body.match(/<img[^>]+src=\"([^\"]+)\"/);
            if (imgMatch) {
                imageUrl = imgMatch[1];
            }
        }

        if (!imageUrl && item.noteUrl && rssImages[item.noteUrl]) {
            imageUrl = rssImages[item.noteUrl];
        }

        let isUserProfile = false;
        if (!imageUrl && item.user?.userProfileImagePath) {
            imageUrl = item.user.userProfileImagePath;
            isUserProfile = true;
        }

        const noteKey = getNoteKey(item);

        return {
            title: item.name || '',
            link: item.noteUrl || '',
            pubDate: item.publishAt,
            description: stripHtml(item.body).substring(0, 260),
            thumbnail: imageUrl,
            isUserProfile,
            noteKey,
            needsDetailImage: !imageUrl && !!noteKey
        };
    }

    function normalizeRssArticle(item) {
        return {
            title: item.title || '',
            link: item.link || '',
            pubDate: item.pubDate || item.published || new Date().toISOString(),
            description: stripHtml(item.description).substring(0, 260),
            thumbnail: item.thumbnail || '',
            isUserProfile: false,
            noteKey: '',
            needsDetailImage: false
        };
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
            return parsed;
        } catch (error) {
            console.warn('noteキャッシュ読み込み失敗:', error);
            return null;
        }
    }

    function writeCache(limit, articles) {
        try {
            const payload = JSON.stringify({
                cachedAt: Date.now(),
                articles
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
        const noteV2Data = await safeFetchJson(withProxy(NOTE_V2_URL), forceRefresh);
        if (noteV2Data?.data?.contents?.length) {
            return noteV2Data.data.contents.slice(0, limit);
        }

        const noteV1Data = await safeFetchJson(withProxy(NOTE_V1_URL), forceRefresh);
        if (noteV1Data?.data?.contents?.length) {
            return noteV1Data.data.contents.slice(0, limit);
        }

        return null;
    }

    async function fetchArticles(limit = 3, forceRefresh = false) {
        const rssPromise = safeFetchJson(RSS_API_URL, forceRefresh);
        const noteContents = await fetchNoteContents(limit, forceRefresh);

        if (noteContents?.length) {
            const rssData = await Promise.race([
                rssPromise,
                new Promise((resolve) => setTimeout(() => resolve(null), RSS_TIMEOUT_MS))
            ]);
            const rssImages = buildRssImageMap(rssData);
            return noteContents.map((item) => normalizeArticle(item, rssImages));
        }

        const rssData = await rssPromise;
        if (rssData?.items?.length) {
            return rssData.items.slice(0, limit).map(normalizeRssArticle);
        }

        throw new Error('note APIおよびRSSからデータを取得できませんでした。');
    }

    function createArticleElement(article, variant) {
        const config = VARIANTS[variant] || VARIANTS.default;
        const element = document.createElement('div');
        element.className = config.containerClasses;
        Object.entries(config.containerStyles).forEach(([key, value]) => {
            element.style[key] = value;
        });

        const titleTag = config.titleTag;
        element.innerHTML = `
            <div data-article-image></div>
            <div class="${config.bodyWrapperClasses}">
                <div class="note-card-date">
                    ${formatDate(article.pubDate)}
                </div>
                <${titleTag} class="${config.titleClasses}" style="margin-top:0.7rem; font-family:var(--font-heading, 'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif); font-size:1.2rem; letter-spacing:0.04em; font-weight:400; line-height:1.5;">
                    ${article.title}
                </${titleTag}>
                <p class="${config.descriptionClasses}" style="margin-top:0.7rem; color:var(--color-muted); line-height:1.8;">
                    ${truncate(article.description, config.descriptionLimit)}
                </p>
                <a href="${article.link}" target="_blank" rel="noopener noreferrer" class="note-card-link" style="margin-top:1rem;">
                    記事を読む
                </a>
            </div>
        `;

        const imageWrapper = element.querySelector('[data-article-image]');
        updateImageWrapper(imageWrapper, article);

        return { element, imageWrapper };
    }

    function updateImageWrapper(wrapper, article, imageUrlOverride) {
        if (!wrapper) return;

        const imageUrl = imageUrlOverride || article.thumbnail;
        if (imageUrl) {
            wrapper.className = `h-56 ${article.isUserProfile ? 'flex items-center justify-center' : 'overflow-hidden'}`;
            wrapper.style.backgroundColor = article.isUserProfile ? 'rgba(255,255,255,0.85)' : '';
            wrapper.innerHTML = `
                <img src="${imageUrl}" alt="${article.title}"
                     class="${article.isUserProfile ? '' : 'w-full h-full'} object-cover"
                     style="${article.isUserProfile ? 'max-width: 50%; max-height: 50%; object-fit: contain;' : 'max-width:100%; max-height:100%; object-fit:cover; transition:transform .45s ease;'}"
                     loading="lazy">
            `;
            const img = wrapper.querySelector('img');
            if (img) {
                if (!article.isUserProfile) {
                    img.addEventListener('mouseover', () => {
                        img.style.transform = 'scale(1.05)';
                    });
                    img.addEventListener('mouseout', () => {
                        img.style.transform = 'scale(1)';
                    });
                }
                img.addEventListener('error', () => renderFallbackImage(wrapper));
            }
        } else {
            renderFallbackImage(wrapper);
        }
    }

    function renderFallbackImage(wrapper) {
        if (!wrapper) return;
        wrapper.className = 'h-56 flex items-center justify-center';
        wrapper.style.backgroundColor = 'var(--color-kurumi-soft)';
        wrapper.innerHTML = '<span style="letter-spacing:0.2em; font-size:0.68rem; color:var(--color-kurumi); text-transform:uppercase;">WOVI NOTE</span>';
    }

    async function requestDetailImage(article, wrapper, forceRefresh = false) {
        if (!article?.noteKey) return;

        const detailData = await safeFetchJson(withProxy(`${NOTE_DETAIL_URL}${article.noteKey}`), forceRefresh);
        const detailImage = detailData?.data?.thumbnailExternalUrl ||
            detailData?.data?.eyecatch?.src ||
            detailData?.data?.eyecatch?.url;

        if (detailImage) {
            article.thumbnail = detailImage;
            article.isUserProfile = false;
            updateImageWrapper(wrapper, article, detailImage);
        }
    }

    function renderFallbackState() {
        return `
            <div class="wovi-card" style="padding:2rem; text-align:center; grid-column:1 / -1;">
                <h3 style="font-family:var(--font-heading, 'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif); font-size:1.35rem; font-weight:400; letter-spacing:0.06em;">最新記事はnoteで公開中</h3>
                <p style="margin-top:0.8rem; color:var(--color-muted); line-height:1.9;">
                    Woviの最新情報や活動報告をnoteで発信しています。
                </p>
                <a href="https://note.com/wovi/all" target="_blank" rel="noopener noreferrer" class="note-card-link" style="margin-top:1.2rem;">
                    noteで記事を見る
                </a>
            </div>
        `;
    }

    function getArticleSignature(articles) {
        return (articles || [])
            .map((article) => `${article.link}|${article.pubDate}|${article.title}`)
            .join('||');
    }

    function renderArticles(container, articles, variant, forceRefreshForDetail = false) {
        container.innerHTML = '';
        articles.forEach((article) => {
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
                    if (!freshArticles?.length) return;
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
                container.innerHTML = renderFallbackState();
                return [];
            }

            renderArticles(container, articles, variant, forceRefresh);
            writeCache(limit, articles);
            return articles;
        } catch (error) {
            console.warn('note記事の読み込みに失敗しました:', error);
            container.innerHTML = renderFallbackState();
            return [];
        }
    }

    global.NoteFeed = {
        load: loadNoteFeed,
        fetchArticles,
        clearCache
    };
})(window);
