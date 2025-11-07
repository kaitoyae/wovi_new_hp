(function(global) {
    const CREATOR_SLUG = 'wovi';
    const NOTE_V2_URL = `https://note.com/api/v2/creators/${CREATOR_SLUG}/contents?kind=note&page=1`;
    const NOTE_V1_URL = `https://note.com/api/v1/creators/${CREATOR_SLUG}/contents?kind=note&page=1`;
    const NOTE_DETAIL_URL = 'https://note.com/api/v2/notes/';
    const RSS_URL = 'https://note.com/wovi/rss';
    const RSS_API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`;
    const CORS_PROXY = 'https://corsproxy.io/?';
    const RSS_TIMEOUT_MS = 1500;

    const VARIANTS = {
        default: {
            containerClasses: 'rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300',
            containerStyles: {
                background: 'rgba(255, 255, 255, 0.4)',
                backdropFilter: 'blur(8px)',
                webkitBackdropFilter: 'blur(8px)'
            },
            titleTag: 'h5',
            descriptionLimit: 150,
            descriptionClasses: 'text-gray-600 text-sm leading-relaxed mb-4',
            titleClasses: 'text-lg font-semibold font-jp mb-3 line-clamp-2'
        },
        news: {
            containerClasses: 'article-card rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300',
            containerStyles: {},
            titleTag: 'h3',
            descriptionLimit: 120,
            descriptionClasses: 'text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3',
            titleClasses: 'text-lg font-semibold font-jp mb-3 line-clamp-2'
        }
    };

    function withProxy(url) {
        return `${CORS_PROXY}${encodeURIComponent(url)}`;
    }

    async function safeFetchJson(url) {
        try {
            const response = await fetch(url);
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
            rssData.items.forEach(item => {
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
            description: stripHtml(item.body).substring(0, 240),
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
            description: stripHtml(item.description).substring(0, 240),
            thumbnail: item.thumbnail || '',
            isUserProfile: false,
            noteKey: '',
            needsDetailImage: false
        };
    }

    async function fetchNoteContents(limit) {
        const noteV2Data = await safeFetchJson(withProxy(NOTE_V2_URL));
        if (noteV2Data?.data?.contents?.length) {
            return noteV2Data.data.contents.slice(0, limit);
        }

        const noteV1Data = await safeFetchJson(withProxy(NOTE_V1_URL));
        if (noteV1Data?.data?.contents?.length) {
            return noteV1Data.data.contents.slice(0, limit);
        }

        return null;
    }

    async function fetchArticles(limit = 3) {
        const rssPromise = safeFetchJson(RSS_API_URL);
        const noteContents = await fetchNoteContents(limit);

        if (noteContents?.length) {
            const rssData = await Promise.race([
                rssPromise,
                new Promise(resolve => setTimeout(() => resolve(null), RSS_TIMEOUT_MS))
            ]);
            const rssImages = buildRssImageMap(rssData);
            return noteContents.map(item => normalizeArticle(item, rssImages));
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

        const TitleTag = config.titleTag;
        element.innerHTML = `
            <div data-article-image></div>
            <div class="p-6">
                <div class="text-sm text-gray-500 mb-2">
                    ${formatDate(article.pubDate)}
                </div>
                <${TitleTag} class="${config.titleClasses}">
                    ${article.title}
                </${TitleTag}>
                <p class="${config.descriptionClasses}">
                    ${truncate(article.description, config.descriptionLimit)}
                </p>
                <a href="${article.link}" target="_blank" rel="noopener noreferrer" class="inline-block text-sm font-medium py-2 px-4 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors duration-200">
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
            wrapper.className = `h-48 ${article.isUserProfile ? 'flex items-center justify-center' : 'overflow-hidden'}`;
            wrapper.style.backgroundColor = article.isUserProfile ? 'white' : '';
            wrapper.innerHTML = `
                <img src="${imageUrl}" alt="${article.title}"
                     class="${article.isUserProfile ? '' : 'w-full h-full'} object-cover hover:scale-105 transition-transform duration-300"
                     style="${article.isUserProfile ? 'max-width: 50%; max-height: 50%; object-fit: contain;' : 'max-width: 100%; max-height: 100%; object-fit: cover;'}"
                     loading="lazy">
            `;
            const img = wrapper.querySelector('img');
            if (img) {
                img.addEventListener('error', () => renderFallbackImage(wrapper));
            }
        } else {
            renderFallbackImage(wrapper);
        }
    }

    function renderFallbackImage(wrapper) {
        if (!wrapper) return;
        wrapper.className = 'h-48 flex items-center justify-center';
        wrapper.style.backgroundColor = 'var(--wovi-green)';
        wrapper.innerHTML = '';
    }

    async function requestDetailImage(article, wrapper) {
        if (!article?.noteKey) return;

        const detailData = await safeFetchJson(withProxy(`${NOTE_DETAIL_URL}${article.noteKey}`));
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
            <div class="col-span-full text-center">
                <div class="rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300" style="background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);">
                    <div class="h-48 flex items-center justify-center" style="background-color: var(--wovi-green);"></div>
                    <div class="p-6">
                        <h5 class="text-lg font-semibold font-jp mb-3">
                            最新記事はnoteで公開中
                        </h5>
                        <p class="text-gray-600 text-sm leading-relaxed mb-4">
                            Woviの最新情報や活動報告をnoteで発信しています。
                        </p>
                        <a href="https://note.com/wovi/all" target="_blank" rel="noopener noreferrer" class="inline-block text-sm font-medium py-2 px-4 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors duration-200">
                            noteで記事を見る
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    async function loadNoteFeed(options = {}) {
        const {
            containerId = 'note-articles',
            limit = 3,
            variant = 'default'
        } = options;

        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`IDが${containerId}の要素が見つかりませんでした。`);
            return [];
        }

        try {
            const articles = await fetchArticles(limit);
            if (!articles.length) {
                container.innerHTML = renderFallbackState();
                return [];
            }

            container.innerHTML = '';

            articles.forEach(article => {
                const { element, imageWrapper } = createArticleElement(article, variant);
                container.appendChild(element);
                if (article.needsDetailImage) {
                    requestDetailImage(article, imageWrapper);
                }
            });

            return articles;
        } catch (error) {
            console.warn('note記事の読み込みに失敗しました:', error);
            container.innerHTML = renderFallbackState();
            return [];
        }
    }

    global.NoteFeed = {
        load: loadNoteFeed,
        fetchArticles
    };
})(window);
