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
    function extractYear2(text) {
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
          const fullTitle = titleMatch[1].replace(/&#8212;.*|—.*|- The Movie Database.*/i, "").trim();
          let title = fullTitle;
          let year = null;
          const yearMatch = fullTitle.match(/(.+?)\s*\((?:TV Series )?(\d{4})(?:-\d{4})?\)$/i) || fullTitle.match(/(.+?)\s*\((\d{4})\)$/);
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
      extractYear: extractYear2,
      resolveTmdbMeta: resolveTmdbMeta2
    };
  }
});

// src/circleftp/index.js
var { extractQuality, titlesMatch, extractYear, resolveTmdbMeta } = require_utils();
var SOURCE_NAME = "CircleFTP";
var API_URL = "http://new.circleftp.net:5000/api";
function extractEpisodeNumber(title) {
  let m = title.match(/S:?\d+[\.:]*E:?(\d+)/i);
  if (!m)
    m = title.match(/Episode[:\s]*(\d+)/i);
  return m ? parseInt(m[1]) : null;
}
function search(query) {
  return __async(this, null, function* () {
    try {
      const response = yield fetch(`${API_URL}/posts?searchTerm=${encodeURIComponent(query)}&order=desc`);
      if (!response.ok)
        return [];
      const data = yield response.json();
      return data.posts || [];
    } catch (e) {
      return [];
    }
  });
}
function getPostDetails(id) {
  return __async(this, null, function* () {
    try {
      const response = yield fetch(`${API_URL}/posts/${id}`);
      if (!response.ok)
        return null;
      return yield response.json();
    } catch (e) {
      return null;
    }
  });
}
function getMovieStreams(name, year) {
  return __async(this, null, function* () {
    const posts = yield search(name);
    const matches = posts.filter((p) => {
      if (p.type !== "singleVideo")
        return false;
      if (!titlesMatch(p.name || p.title, name))
        return false;
      if (year && p.year && Math.abs(parseInt(p.year) - year) > 1)
        return false;
      return true;
    });
    if (matches.length === 0)
      return [];
    const details = yield Promise.all(matches.map((m) => getPostDetails(m.id)));
    const streams = [];
    const seen = /* @__PURE__ */ new Set();
    for (let i = 0; i < matches.length; i++) {
      const detail = details[i];
      if (!detail || !detail.content)
        continue;
      if (seen.has(detail.content))
        continue;
      seen.add(detail.content);
      streams.push({
        name: SOURCE_NAME,
        title: extractQuality(matches[i].quality || matches[i].title || detail.content),
        url: detail.content
      });
    }
    return streams;
  });
}
function getSeriesStreams(name, season, episode) {
  return __async(this, null, function* () {
    const posts = yield search(name);
    const matches = posts.filter((p) => {
      if (p.type !== "series")
        return false;
      if (!titlesMatch(p.name || p.title, name))
        return false;
      return true;
    });
    if (matches.length === 0)
      return [];
    const details = yield Promise.all(matches.map((m) => getPostDetails(m.id)));
    const streams = [];
    const seen = /* @__PURE__ */ new Set();
    for (let i = 0; i < matches.length; i++) {
      const detail = details[i];
      if (!detail || !Array.isArray(detail.content))
        continue;
      const seasonData = detail.content.find((s) => {
        if (!s.seasonName)
          return false;
        const num = parseInt(s.seasonName.replace(/\D/g, ""));
        return num === season;
      });
      if (!seasonData || !seasonData.episodes)
        continue;
      const ep = seasonData.episodes.find((e) => extractEpisodeNumber(e.title) === episode);
      if (!ep || !ep.link)
        continue;
      if (seen.has(ep.link))
        continue;
      seen.add(ep.link);
      streams.push({
        name: SOURCE_NAME,
        title: extractQuality(matches[i].quality || matches[i].title || ep.link),
        url: ep.link
      });
    }
    return streams;
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const meta = yield resolveTmdbMeta(tmdbId, mediaType);
    if (!meta || !meta.name)
      return [];
    if (mediaType === "movie") {
      return yield getMovieStreams(meta.name, meta.year);
    } else {
      return yield getSeriesStreams(meta.name, parseInt(season), parseInt(episode));
    }
  });
}
module.exports = { getStreams };
