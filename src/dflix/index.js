const { extractQuality, titlesMatch, extractYear, resolveTmdbMeta } = require('../utils');
const SOURCE_NAME = 'DFLIX';
const DFLIX_URL = 'https://movies.discoveryftp.net';

const fetchOptions = {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

async function search(query, type) {
    const searchType = type === 'movie' ? 'm' : 's';
    try {
        const body = new URLSearchParams();
        body.append('term', query);
        body.append('types', searchType);
        
        const response = await fetch(`${DFLIX_URL}/search`, {
            method: 'POST',
            ...fetchOptions,
            headers: {
                ...fetchOptions.headers,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body.toString()
        });
        
        if (!response.ok) return [];
        const html = await response.text();
        
        const results = [];
        const itemRegex = /<a href="(\/[ms]\/view\/\d+)"[^>]*>[\s\S]*?<div class="searchtitle"[^>]*>([^<]+)<\/div>[\s\S]*?<div class="searchdetails"[^>]*>([\s\S]*?)<\/div>/gi;
        let match;
        while ((match = itemRegex.exec(html)) !== null) {
            const href = match[1];
            const title = match[2].trim();
            const details = match[3].replace(/<[^>]+>/g, ' ').trim();
            if (title && href) {
                results.push({ title, details, url: DFLIX_URL + href });
            }
        }
        return results;
    } catch { return []; }
}

function extractDownloadLinks(html) {
    const links = [];
    const cdnRegex = /href="(https?:\/\/p?cdn\d*\.discoveryftp\.net[^"]*\.(?:mkv|mp4))"/gi;
    let match;
    while ((match = cdnRegex.exec(html)) !== null) {
        if (!links.includes(match[1])) links.push(match[1]);
    }
    return links;
}

function extractVariantLinks(html, currentPath) {
    const variants = [];
    const variantRegex = /href="(\/m\/view\/\d+)"/gi;
    let match;
    while ((match = variantRegex.exec(html)) !== null) {
        const href = match[1];
        if (href !== currentPath && !variants.includes(href)) variants.push(DFLIX_URL + href);
    }
    return variants;
}

async function getMovieStreams(url) {
    try {
        const response = await fetch(url, fetchOptions);
        if (!response.ok) return [];
        const html = await response.text();
        const currentPath = url.replace(DFLIX_URL, '');
        
        let allLinks = extractDownloadLinks(html);
        const variantUrls = extractVariantLinks(html, currentPath);
        
        if (variantUrls.length > 0) {
            const variantResponses = await Promise.all(
                variantUrls.map(vUrl => fetch(vUrl, fetchOptions).then(res => res.text()).catch(() => null))
            );
            for (const vHtml of variantResponses) {
                if (vHtml) {
                    const variantLinks = extractDownloadLinks(vHtml);
                    for (const link of variantLinks) {
                        if (!allLinks.includes(link)) allLinks.push(link);
                    }
                }
            }
        }
        
        return allLinks.map(link => ({ name: SOURCE_NAME, title: extractQuality(link), url: link }));
    } catch { return []; }
}

async function getSeriesStreams(url, season, episode) {
    try {
        const sPad = String(season).padStart(2, '0');
        const baseViewPath = url.replace(DFLIX_URL, '');
        
        let response = await fetch(url, fetchOptions);
        if (!response.ok) return [];
        let html = await response.text();
        
        const seasonPageMatch = html.match(new RegExp(`href="(${baseViewPath}/${sPad})"`, 'i'));
        if (seasonPageMatch) {
            response = await fetch(DFLIX_URL + seasonPageMatch[1], fetchOptions);
            html = await response.text();
        }
        
        const epRegex = new RegExp(`S${season}\\s*\\|\\s*EP\\s*${episode}\\s*<a\\s+href="([^"]+\\.(?:mkv|mp4))"`, 'gi');
        const directLinks = [];
        let match;
        while ((match = epRegex.exec(html)) !== null) directLinks.push(match[1]);
        if (directLinks.length > 0) {
            return directLinks.map(link => ({ name: SOURCE_NAME, title: extractQuality(link), url: link }));
        }
        
        const cdnMatch = html.match(/href="(https?:\/\/cdn\d*\.discoveryftp\.net\/[^"]+\/)"\s*title="Browse/i);
        if (!cdnMatch) return [];
        const cdnUrl = cdnMatch[1];
        const cdnBase = cdnUrl.match(/^(https?:\/\/[^\/]+)/)[1];
        
        const cdnRes = await fetch(cdnUrl, fetchOptions);
        const cdnHtml = await cdnRes.text();
        
        const seasonMatch = cdnHtml.match(new RegExp(`href="([^"]*[Ss]eason[\\s%20]+0*${season}/)`, 'i'));
        if (!seasonMatch) return [];
        
        const seasonUrl = seasonMatch[1].startsWith('http') ? seasonMatch[1] : cdnBase + seasonMatch[1];
        const seasonRes = await fetch(seasonUrl, fetchOptions);
        const seasonHtml = await seasonRes.text();
        
        const streams = [];
        const fileRegex = /<a href="([^"]*\.(?:mkv|mp4))"/gi;
        while ((match = fileRegex.exec(seasonHtml)) !== null) {
            const filename = decodeURIComponent(match[1].split('/').pop());
            const seMatch = filename.match(/S0*(\d+)\D*E0*(\d+)/i);
            if (seMatch && parseInt(seMatch[1]) === parseInt(season) && parseInt(seMatch[2]) === parseInt(episode)) {
                const fileUrl = match[1].startsWith('http') ? match[1] :
                    match[1].startsWith('/') ? cdnBase + match[1] : seasonUrl + match[1];
                streams.push({ name: SOURCE_NAME, title: extractQuality(filename), url: fileUrl });
            }
        }
        return streams;
    } catch { return []; }
}

async function getStreams(tmdbId, mediaType, season, episode) {
    const meta = await resolveTmdbMeta(tmdbId, mediaType);
    if (!meta || !meta.name) return [];

    const results = await search(meta.name, mediaType);
    if (results.length === 0) return [];
    
    let bestMatch = null;
    let bestScore = 0;
    
    for (const result of results) {
        if (!titlesMatch(result.title, meta.name)) continue;
        let score = 10;
        if (meta.year) {
            const resultYear = extractYear(result.details || result.title);
            if (resultYear) {
                const yearDiff = Math.abs(resultYear - meta.year);
                if (yearDiff === 0) score += 10;
                else if (yearDiff === 1) score += 5;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = result;
        }
    }
    
    if (!bestMatch) return [];
    if (mediaType === 'movie') {
        return await getMovieStreams(bestMatch.url);
    } else {
        return await getSeriesStreams(bestMatch.url, parseInt(season), parseInt(episode));
    }
}

module.exports = { getStreams };
