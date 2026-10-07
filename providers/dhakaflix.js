var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/utils.js
var require_utils = __commonJS({
  "src/utils.js"(exports2, module2) {
    var QUALITY_MAP = [
      [["2160p", "4k"], "4K"],
      [["1080p"], "1080p"],
      [["720p"], "720p"],
      [["480p"], "480p"]
    ];
    var SOURCE_MAP = [
      [["imax"], "IMAX"],
      [["hmax", "hbo max"], "HMAX"],
      [["bluray", "blu-ray"], "BluRay"],
      [["brrip", "bdrip"], "BRRip"],
      [["web-dl", "webdl"], "WEB-DL"],
      [["webrip"], "WEBRip"],
      [["hdrip"], "HDRip"],
      [["hdtv"], "HDTV"],
      [["dvdrip"], "DVDRip"],
      [["hdr"], "HDR"],
      [["sdr"], "SDR"],
      [["ddp5", "ddp5.1", "dd5.1", "dd5", "eac3", "dolby atmos", "5.1", "7.1"], "Dolby Atmos"],
      [["aac"], "AAC"],
      [["amzn", "amazon"], "AMZN"]
    ];
    function extractQuality2(text) {
      var _a, _b;
      const t = (typeof text === "string" ? text : (text == null ? void 0 : text.Name) || (text == null ? void 0 : text.Path) || "").toLowerCase();
      const q = ((_a = QUALITY_MAP.find(([keys]) => keys.some((k) => t.includes(k)))) == null ? void 0 : _a[1]) || "";
      const s = ((_b = SOURCE_MAP.find(([keys]) => keys.some((k) => t.includes(k)))) == null ? void 0 : _b[1]) || "";
      return (q + (s ? " " + s : "")).trim() || "Unknown";
    }
    function normalize(s) {
      return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    }
    function titlesMatch2(a, b) {
      const n1 = normalize(a), n2 = normalize(b);
      return n1.includes(n2) || n2.includes(n1);
    }
    function extractYear(text) {
      const m = (text || "").match(/\b(19\d{2}|20\d{2})\b/);
      return m ? parseInt(m[1]) : null;
    }
    var TMDB_API_KEY = "";
    function resolveTmdbMeta2(tmdbId, mediaType) {
      return __async(this, null, function* () {
        if (TMDB_API_KEY) {
          try {
            const url2 = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
            const res = yield fetch(url2);
            if (res.ok) {
              const text = yield res.text();
              try {
                const data = JSON.parse(text);
                const title = data.title || data.name;
                const releaseDate = data.release_date || data.first_air_date;
                const year = releaseDate ? parseInt(releaseDate.split("-")[0]) : null;
                if (title)
                  return { name: title, year };
              } catch (e) {
                console.error("TMDB API JSON parse error", e);
              }
            }
          } catch (e) {
            console.error("TMDB API error", e);
          }
        }
        const url = `https://www.themoviedb.org/${mediaType}/${tmdbId}`;
        try {
          const res = yield fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept-Language": "en-US,en;q=0.9",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
            }
          });
          if (!res.ok)
            return null;
          const html = yield res.text();
          const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
          if (!titleMatch)
            return null;
          const fullTitle = titleMatch[1].replace(/&#8212;.*| - The Movie Database.*/i, "").trim();
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
      });
    }
    module2.exports = {
      extractQuality: extractQuality2,
      normalize,
      titlesMatch: titlesMatch2,
      extractYear,
      resolveTmdbMeta: resolveTmdbMeta2
    };
  }
});

// src/dhakaflix/index.js
var { extractQuality, titlesMatch, resolveTmdbMeta } = require_utils();
var SOURCE_NAME = "DHAKAFLIX";
var SERVERS = {
  movie: { url: "http://172.16.50.14", name: "DHAKA-FLIX-14" },
  tv: { url: "http://172.16.50.12", name: "DHAKA-FLIX-12" }
};
function getNameFromPath(href) {
  const decoded = decodeURIComponent(href);
  const parts = decoded.split("/").filter((p) => p);
  return parts[parts.length - 1] || "";
}
function extractTitleAndYear(filename) {
  let match = filename.match(/^(.+?)\s*\((\d{4})\)/);
  if (match)
    return { title: match[1].trim(), year: parseInt(match[2]) };
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
  if (match)
    return { season: parseInt(match[1]), episode: parseInt(match[2]) };
  return null;
}
function searchServer(query, server) {
  return __async(this, null, function* () {
    try {
      const searchUrl = `${server.url}/${server.name}/`;
      const body = JSON.stringify({
        action: "get",
        search: { href: `/${server.name}/`, pattern: query, ignorecase: true }
      });
      const response = yield fetch(searchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      });
      if (!response.ok)
        return null;
      let data;
      try {
        const text = yield response.text();
        data = JSON.parse(text);
      } catch (err) {
        console.error("Failed to parse JSON from DhakaFlix:", err);
        return null;
      }
      if (!(data == null ? void 0 : data.search))
        return [];
      return data.search.filter((item) => {
        const href = item.href.toLowerCase();
        return !item.size || href.endsWith(".mkv") || href.endsWith(".mp4");
      }).map((item) => ({
        href: item.href,
        name: getNameFromPath(item.href),
        isFile: item.size !== null,
        fullUrl: server.url + item.href
      }));
    } catch (e) {
      return null;
    }
  });
}
function findMovieStreams(results, metaName, metaYear) {
  const streams = [];
  const seen = /* @__PURE__ */ new Set();
  for (const result of results) {
    if (!result.isFile)
      continue;
    const { title: fileTitle, year: fileYear } = extractTitleAndYear(result.name);
    if (!titlesMatch(fileTitle, metaName))
      continue;
    if (metaYear && fileYear && Math.abs(metaYear - fileYear) > 1)
      continue;
    if (seen.has(result.fullUrl))
      continue;
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
  const seen = /* @__PURE__ */ new Set();
  for (const result of results) {
    if (!result.isFile)
      continue;
    const { title: fileTitle } = extractTitleAndYear(result.name);
    if (!titlesMatch(fileTitle, metaName))
      continue;
    const seInfo = extractSeasonEpisode(result.name);
    if (!seInfo)
      continue;
    if (seInfo.season !== targetSeason || seInfo.episode !== targetEpisode)
      continue;
    if (seen.has(result.fullUrl))
      continue;
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
  const cleaned = title.replace(/[:\-–—]/g, " ").replace(/\s+/g, " ").trim();
  const words = cleaned.split(" ").filter((w) => w.length > 2);
  const terms = [];
  if (words.length > 0)
    terms.push(words[0]);
  if (words.length > 1)
    terms.push(words.slice(0, 2).join(" "));
  terms.push(cleaned);
  return [...new Set(terms)];
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const meta = yield resolveTmdbMeta(tmdbId, mediaType);
    if (!meta || !meta.name)
      return [];
    const server = mediaType === "movie" ? SERVERS.movie : SERVERS.tv;
    const searchTerms = getSearchTerms(meta.name);
    for (const term of searchTerms) {
      const results = yield searchServer(term, server);
      if (results === null)
        return [];
      if (results.length > 0) {
        if (mediaType === "movie") {
          return findMovieStreams(results, meta.name, meta.year);
        } else {
          return findSeriesStreams(results, meta.name, parseInt(season), parseInt(episode));
        }
      }
    }
    return [];
  });
}
module.exports = { getStreams };
