const { extractQuality, titlesMatch, resolveTmdbMeta } = require('../utils');

const SOURCE_NAME = 'DHAKAFLIX';
// Define a broader range of DhakaFlix servers on the subnet
const ALL_SERVERS = [
    { url: 'http://172.16.50.4', name: 'DHAKA-FLIX-4' },
    { url: 'http://172.16.50.5', name: 'DHAKA-FLIX-5' },
    { url: 'http://172.16.50.6', name: 'DHAKA-FLIX-6' },
    { url: 'http://172.16.50.7', name: 'DHAKA-FLIX-7' },
    { url: 'http://172.16.50.8', name: 'DHAKA-FLIX-8' },
    { url: 'http://172.16.50.12', name: 'DHAKA-FLIX-12' },
    { url: 'http://172.16.50.13', name: 'DHAKA-FLIX-13' },
    { url: 'http://172.16.50.14', name: 'DHAKA-FLIX-14' },
    { url: 'http://172.16.50.15', name: 'DHAKA-FLIX-15' }
];

function getNameFromPath(href) {
    const decoded = decodeURIComponent(href);
    const parts = decoded.split('/').filter(p => p);
    return parts[parts.length - 1] || '';
}

function extractTitleAndYear(filename) {
    let match = filename.match(/^(.+?)\s*\((\d{4})\)/);
    if (match) return { title: match[1].trim(), year: parseInt(match[2]) };
    match = filename.match(/\b(19\d{2}|20\d{2})\b/);
    if (match) {
        const year = parseInt(match[1]);
        const titleMatch = filename.match(/^(.+?)(?:\s*[\(\[\-\|]|\s+\d{4}|$)/);
        return { title: titleMatch ? titleMatch[1].trim() : filename, year };
    }
    return { title: filename, year: null };
}

function extractSeasonEpisode(filename) {
    const match = filename.match(/S(\d+)\D*E(\d+)/i);
    if (match) return { season: parseInt(match[1]), episode: parseInt(match[2]) };
    return null;
}

async function searchServer(query, server) {
    try {
        const searchUrl = `${server.url}/${server.name}/`;
        const body = JSON.stringify({
            action: 'get',
            search: { href: `/${server.name}/`, pattern: query, ignorecase: true }
        });
        
        // Use a short timeout so offline servers don't block
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(searchUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) return null;
        
        let data;
        try {
            const text = await response.text();
            data = JSON.parse(text);
        } catch (err) {
            return null;
        }
        
        if (!data?.search) return [];
        return data.search
            .filter(item => {
                const href = item.href.toLowerCase();
                return !item.size || href.endsWith('.mkv') || href.endsWith('.mp4');
            })
            .map(item => ({
                href: item.href,
                name: getNameFromPath(item.href),
                isFile: item.size !== null,
                fullUrl: server.url + item.href
            }));
    } catch (e) {
        return null;
    }
}

function findMovieStreams(results, metaName, metaYear) {
    const streams = [];
    const seen = new Set();
    for (const result of results) {
        if (!result.isFile) continue;
        const { title: fileTitle, year: fileYear } = extractTitleAndYear(result.name);
        if (!titlesMatch(fileTitle, metaName)) continue;
        if (metaYear && fileYear && Math.abs(metaYear - fileYear) > 1) continue;
        if (seen.has(result.fullUrl)) continue;
        seen.add(result.fullUrl);
        streams.push({
            name: SOURCE_NAME,
            title: extractQuality(result.name),
            url: result.fullUrl
        });
    }
    return streams;
}

function findSeriesStreams(results, metaName, targetSeason, targetEpisode) {
    const streams = [];
    const seen = new Set();
    for (const result of results) {
        if (!result.isFile) continue;
        const { title: fileTitle } = extractTitleAndYear(result.name);
        if (!titlesMatch(fileTitle, metaName)) continue;
        const seInfo = extractSeasonEpisode(result.name);
        if (!seInfo) continue;
        if (seInfo.season !== targetSeason || seInfo.episode !== targetEpisode) continue;
        if (seen.has(result.fullUrl)) continue;
        seen.add(result.fullUrl);
        streams.push({
            name: SOURCE_NAME,
            title: extractQuality(result.name),
            url: result.fullUrl
        });
    }
    return streams;
}

function getSearchTerms(title) {
    const cleaned = title.replace(/[:\-–—]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = cleaned.split(' ').filter(w => w.length > 2);
    const terms = [];
    if (words.length > 0) terms.push(words[0]);
    if (words.length > 1) terms.push(words.slice(0, 2).join(' '));
    terms.push(cleaned);
    return [...new Set(terms)];
}

async function getStreams(tmdbId, mediaType, season, episode) {
    const meta = await resolveTmdbMeta(tmdbId, mediaType);
    if (!meta || !meta.name) return [];

    const searchTerms = getSearchTerms(meta.name);
    
    let allFoundStreams = [];
    
    for (const term of searchTerms) {
        // Search all servers concurrently for speed
        const serverPromises = ALL_SERVERS.map(server => searchServer(term, server));
        const serverResults = await Promise.all(serverPromises);
        
        let foundAnyInTerm = false;
        
        for (const results of serverResults) {
            if (results && results.length > 0) {
                let streams = [];
                if (mediaType === 'movie') {
                    streams = findMovieStreams(results, meta.name, meta.year);
                } else {
                    streams = findSeriesStreams(results, meta.name, parseInt(season), parseInt(episode));
                }
                
                if (streams.length > 0) {
                    allFoundStreams.push(...streams);
                    foundAnyInTerm = true;
                }
            }
        }
        
        // If we found streams for this term, no need to fallback to broader terms
        if (foundAnyInTerm) break;
    }
    
    return allFoundStreams;
}

module.exports = { getStreams };
