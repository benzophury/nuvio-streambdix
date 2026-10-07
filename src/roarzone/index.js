const { extractQuality, titlesMatch, resolveTmdbMeta } = require('../utils');

const SOURCE_NAME = 'ROARZONE';
const EMBY_URL = 'https://play.roarzone.info';
const USERNAME = 'RoarZone_Guest';

let cachedToken = null;
let tokenExpiry = 0;

async function authenticate() {
    if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
    try {
        const response = await fetch(`${EMBY_URL}/emby/Users/AuthenticateByName`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Emby-Authorization': 'MediaBrowser Client="Nuvio", Device="Nuvio", DeviceId="nuvio-' + Date.now() + '", Version="1.0.0"'
            },
            body: JSON.stringify({ Username: USERNAME, Pw: '' })
        });
        if (!response.ok) return null;
        const data = await response.json();
        cachedToken = data.AccessToken;
        tokenExpiry = Date.now() + (30 * 60 * 1000);
        return cachedToken;
    } catch { return null; }
}

function buildStreamUrl(itemId, token) {
    return `${EMBY_URL}/emby/Videos/${itemId}/stream?Static=true&api_key=${token}`;
}

async function searchMovieByName(name, token) {
    try {
        const searchTerm = name.split(/[:\-–]/)[0].trim();
        const response = await fetch(`${EMBY_URL}/emby/Items?SearchTerm=${encodeURIComponent(searchTerm)}&IncludeItemTypes=Movie&Recursive=true&Fields=MediaSources,ProviderIds,Path&api_key=${token}`);
        if (!response.ok) return [];
        const data = await response.json();
        return (data.Items || []).filter(item => titlesMatch(item.Name, name));
    } catch { return []; }
}

async function searchSeriesByName(name, token) {
    try {
        const searchTerm = name.split(/[:\-–]/)[0].trim();
        const response = await fetch(`${EMBY_URL}/emby/Items?SearchTerm=${encodeURIComponent(searchTerm)}&IncludeItemTypes=Series&Recursive=true&Fields=ProviderIds&api_key=${token}`);
        if (!response.ok) return [];
        const data = await response.json();
        return (data.Items || []).filter(item => titlesMatch(item.Name, name));
    } catch { return []; }
}

async function getEpisodes(seriesId, season, token) {
    try {
        const response = await fetch(`${EMBY_URL}/emby/Shows/${seriesId}/Episodes?Season=${season}&Fields=MediaSources,Path&api_key=${token}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.Items || [];
    } catch { return []; }
}

async function getMovieStreams(name) {
    const token = await authenticate();
    if (!token) return [];
    const movies = await searchMovieByName(name, token);
    if (movies.length === 0) return [];
    
    const streams = [];
    const seen = new Set();
    for (const movie of movies) {
        if (!movie.MediaSources) continue;
        for (const source of movie.MediaSources) {
            const streamUrl = buildStreamUrl(movie.Id, token);
            if (seen.has(streamUrl)) continue;
            seen.add(streamUrl);
            streams.push({ name: SOURCE_NAME, title: extractQuality(source), url: streamUrl });
        }
    }
    return streams;
}

async function getSeriesStreams(name, season, episode) {
    const token = await authenticate();
    if (!token) return [];
    const seriesList = await searchSeriesByName(name, token);
    if (seriesList.length === 0) return [];
    
    const series = seriesList[0];
    const episodes = await getEpisodes(series.Id, season, token);
    const matchingEpisode = episodes.find(ep => ep.IndexNumber === episode);
    if (!matchingEpisode) return [];
    
    const streams = [];
    const seen = new Set();
    if (matchingEpisode.MediaSources) {
        for (const source of matchingEpisode.MediaSources) {
            const streamUrl = buildStreamUrl(matchingEpisode.Id, token);
            if (seen.has(streamUrl)) continue;
            seen.add(streamUrl);
            streams.push({ name: SOURCE_NAME, title: extractQuality(source), url: streamUrl });
        }
    }
    return streams;
}

async function getStreams(tmdbId, mediaType, season, episode) {
    const meta = await resolveTmdbMeta(tmdbId, mediaType);
    if (!meta || !meta.name) return [];
    
    if (mediaType === 'movie') {
        return await getMovieStreams(meta.name);
    } else {
        return await getSeriesStreams(meta.name, parseInt(season), parseInt(episode));
    }
}

module.exports = { getStreams };
