const QUALITY_MAP = [
    [['2160p', '4k'], '4K'],
    [['1080p'], '1080p'],
    [['720p'], '720p'],
    [['480p'], '480p']
];

const SOURCE_MAP = [
    [['imax'], 'IMAX'],
    [['hmax', 'hbo max'], 'HMAX'],
    [['bluray', 'blu-ray'], 'BluRay'],
    [['brrip', 'bdrip'], 'BRRip'],
    [['web-dl', 'webdl'], 'WEB-DL'],
    [['webrip'], 'WEBRip'],
    [['hdrip'], 'HDRip'],
    [['hdtv'], 'HDTV'],
    [['dvdrip'], 'DVDRip'],
    [['hdr'], 'HDR'],
    [['sdr'], 'SDR'],
    [['ddp5', 'ddp5.1', 'dd5.1', 'dd5', 'eac3', 'dolby atmos', '5.1', '7.1'], 'Dolby Atmos'],
    [['aac'], 'AAC'],
    [['amzn', 'amazon'], 'AMZN'],
];

function extractQuality(text) {
    const t = (typeof text === 'string' ? text : text?.Name || text?.Path || '').toLowerCase();
    const q = QUALITY_MAP.find(([keys]) => keys.some(k => t.includes(k)))?.[1] || '';
    const s = SOURCE_MAP.find(([keys]) => keys.some(k => t.includes(k)))?.[1] || '';
    return (q + (s ? ' ' + s : '')).trim() || 'Unknown';
}

function normalize(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function titlesMatch(a, b) {
    const n1 = normalize(a), n2 = normalize(b);
    return n1.includes(n2) || n2.includes(n1);
}

function extractYear(text) {
    const m = (text || '').match(/\b(19\d{2}|20\d{2})\b/);
    return m ? parseInt(m[1]) : null;
}

// Optional: Set your TMDB API key here if the scraper is blocked by Cloudflare
const TMDB_API_KEY = '';

/**
 * Resolves TMDB ID to { title, year } by scraping TMDB website or using API.
 */
async function resolveTmdbMeta(tmdbId, mediaType) {
    if (TMDB_API_KEY) {
        try {
            const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                const title = data.title || data.name;
                const releaseDate = data.release_date || data.first_air_date;
                const year = releaseDate ? parseInt(releaseDate.split('-')[0]) : null;
                if (title) return { name: title, year };
            }
        } catch (e) {
            console.error('TMDB API error', e);
        }
    }

    // Fallback to web scraping (works on Android OkHttp, might 403 on Node)
    const url = `https://www.themoviedb.org/${mediaType}/${tmdbId}`;
    try {
        const res = await fetch(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            }
        });
        if (!res.ok) return null;
        const html = await res.text();
        
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (!titleMatch) return null;
        
        const fullTitle = titleMatch[1].replace(/&#8212;.*| - The Movie Database.*/i, '').trim();
        
        let title = fullTitle;
        let year = null;
        
        const yearMatch = fullTitle.match(/(.+?)\s*\((\d{4})\)$/);
        if (yearMatch) {
            title = yearMatch[1].trim();
            year = parseInt(yearMatch[2]);
        }
        
        return { name: title, year };
    } catch (e) {
        return null;
    }
}

module.exports = {
    extractQuality,
    normalize,
    titlesMatch,
    extractYear,
    resolveTmdbMeta
};
