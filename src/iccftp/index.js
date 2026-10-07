const { extractQuality, normalize, resolveTmdbMeta } = require('../utils');

const SOURCE_NAME = 'ICC FTP';
const BASE = 'http://10.16.100.244';
const TIMEOUT = 5000;

async function getContext() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
        const response = await fetch(`${BASE}/advancedsrch.php?modal=1`, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) return {};
        const data = await response.text();
        const token = data.match(/name="token" value="([^"]+)"/)?.[1];
        const key = data.match(/id="q_x_name" value="([^"]+)"/)?.[1];
        return { token, key };
    } catch { return {}; }
}

async function autosuggest(query, key) {
    if (!query || !key) return [];
    try {
        const body = new URLSearchParams();
        body.append('type', 'autosuggest');
        body.append('name', 'x_name');
        body.append('s', key);
        body.append('q', query);
        body.append('rnd', Math.random().toString());
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
        const response = await fetch(`${BASE}/ewlookup11.php`, {
            method: 'POST',
            body: body.toString(),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data.map(i => i[0]) : [];
    } catch { return []; }
}

async function searchIndex(title, token) {
    if (!token) return [];
    try {
        const body = `token=${encodeURIComponent(token)}&psearch=${encodeURIComponent(title)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
        const response = await fetch(`${BASE}/index.php`, {
            method: 'POST',
            body: body,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) return [];
        const data = await response.text();
        const results = [];
        const regex = /play=(\d+)"[^>]*><img[^>]*alt="([^"]+)"/gi;
        let m;
        while ((m = regex.exec(data))) results.push({ id: m[1], name: m[2].trim() });
        return results;
    } catch { return []; }
}

async function extractStreams(id) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
        const response = await fetch(`${BASE}/player.php?play=${id}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) return [];
        const data = await response.text();
        
        const streams = [];
        const re = /<source\s+src='([^']+)'(?:\s+title='([^']*)')?/gi;
        let m;
        while ((m = re.exec(data))) {
            const url = m[1];
            if (!/\.(rar|zip|iso|txt|srt|nfo)$/i.test(url)) streams.push({ url, title: m[2] || '' });
        }
        return streams;
    } catch { return []; }
}

async function searchCommand(query) {
    try {
        const body = `cSearch=${encodeURIComponent(query)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
        const response = await fetch(`${BASE}/command.php`, {
            method: 'POST',
            body: body,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) return [];
        const data = await response.json();
        if (Array.isArray(data)) return data.map(item => ({ id: item.id, name: item.name }));
        return [];
    } catch { return []; }
}

async function getStreams(tmdbId, mediaType, season, episode) {
    const meta = await resolveTmdbMeta(tmdbId, mediaType);
    if (!meta || !meta.name) return [];
    
    try {
        const { token, key } = await getContext();
        if (!token) return [];
        
        let cleanName = meta.name.replace(/[:"']/g, '').replace(/\s+/g, ' ').trim();
        const queries = [meta.name, cleanName, cleanName.split(' ').sort((a, b) => b.length - a.length)[0]];
        const uniqueQueries = [...new Set(queries)];
        
        let suggestions = new Set();
        await Promise.all(uniqueQueries.map(async q => {
            const res = await autosuggest(q, key);
            res.forEach(t => suggestions.add(t));
        }));
        
        const normTitle = normalize(meta.name);
        const validTitles = [...suggestions].filter(t => normalize(t).startsWith(normTitle));
        const processedIds = new Set();
        const finalStreams = [];
        const seenUrls = new Set();
        
        const titlesToSearch = validTitles.length ? validTitles : [meta.name];
        const indexPromises = titlesToSearch.map(t => searchIndex(t, token));
        const commandPromises = uniqueQueries.map(q => searchCommand(q));
        
        const allResults = await Promise.all([...indexPromises, ...commandPromises]);
        const flattenedResults = allResults.flat();
        
        for (const item of flattenedResults) {
            const nt = normalize(item.name);
            if (!nt.startsWith(normTitle)) continue;
            if (processedIds.has(item.id)) continue;
            processedIds.add(item.id);
            
            const streams = await extractStreams(item.id);
            for (const s of streams) {
                if (seenUrls.has(s.url)) continue;
                if (mediaType === 'movie' && meta.year) {
                    const url = decodeURIComponent(s.url);
                    if (/S\d+E\d+/i.test(url)) continue;
                    const urlYearM = url.match(/(19|20)\d{2}/);
                    if (urlYearM) {
                        const urlYear = parseInt(urlYearM[0]);
                        const metaYear = parseInt(meta.year);
                        if (Math.abs(urlYear - metaYear) > 1) continue;
                    } else continue;
                }
                if (mediaType === 'tv') {
                    const epRe = new RegExp(`S0?${season}E0?${episode}(?![0-9])`, 'i');
                    if (!epRe.test(s.url)) continue;
                }
                seenUrls.add(s.url);
                finalStreams.push({ name: SOURCE_NAME, title: extractQuality(s.url), url: s.url });
            }
        }
        return finalStreams;
    } catch (e) {
        return [];
    }
}

module.exports = { getStreams };
