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
    function normalize2(s) {
      return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    }
    function titlesMatch(a, b) {
      const n1 = normalize2(a), n2 = normalize2(b);
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
      normalize: normalize2,
      titlesMatch,
      extractYear,
      resolveTmdbMeta: resolveTmdbMeta2
    };
  }
});

// src/iccftp/index.js
var { extractQuality, normalize, resolveTmdbMeta } = require_utils();
var SOURCE_NAME = "ICC FTP";
var BASE = "http://10.16.100.244";
var TIMEOUT = 5e3;
function getContext() {
  return __async(this, null, function* () {
    var _a, _b;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
      const response = yield fetch(`${BASE}/advancedsrch.php?modal=1`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok)
        return {};
      const data = yield response.text();
      const token = (_a = data.match(/name="token" value="([^"]+)"/)) == null ? void 0 : _a[1];
      const key = (_b = data.match(/id="q_x_name" value="([^"]+)"/)) == null ? void 0 : _b[1];
      return { token, key };
    } catch (e) {
      return {};
    }
  });
}
function autosuggest(query, key) {
  return __async(this, null, function* () {
    if (!query || !key)
      return [];
    try {
      const body = new URLSearchParams();
      body.append("type", "autosuggest");
      body.append("name", "x_name");
      body.append("s", key);
      body.append("q", query);
      body.append("rnd", Math.random().toString());
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
      const response = yield fetch(`${BASE}/ewlookup11.php`, {
        method: "POST",
        body: body.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok)
        return [];
      const data = yield response.json();
      return Array.isArray(data) ? data.map((i) => i[0]) : [];
    } catch (e) {
      return [];
    }
  });
}
function searchIndex(title, token) {
  return __async(this, null, function* () {
    if (!token)
      return [];
    try {
      const body = `token=${encodeURIComponent(token)}&psearch=${encodeURIComponent(title)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
      const response = yield fetch(`${BASE}/index.php`, {
        method: "POST",
        body,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok)
        return [];
      const data = yield response.text();
      const results = [];
      const regex = /play=(\d+)"[^>]*><img[^>]*alt="([^"]+)"/gi;
      let m;
      while (m = regex.exec(data))
        results.push({ id: m[1], name: m[2].trim() });
      return results;
    } catch (e) {
      return [];
    }
  });
}
function extractStreams(id) {
  return __async(this, null, function* () {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
      const response = yield fetch(`${BASE}/player.php?play=${id}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok)
        return [];
      const data = yield response.text();
      const streams = [];
      const re = /<source\s+src='([^']+)'(?:\s+title='([^']*)')?/gi;
      let m;
      while (m = re.exec(data)) {
        const url = m[1];
        if (!/\.(rar|zip|iso|txt|srt|nfo)$/i.test(url))
          streams.push({ url, title: m[2] || "" });
      }
      return streams;
    } catch (e) {
      return [];
    }
  });
}
function searchCommand(query) {
  return __async(this, null, function* () {
    try {
      const body = `cSearch=${encodeURIComponent(query)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
      const response = yield fetch(`${BASE}/command.php`, {
        method: "POST",
        body,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok)
        return [];
      const data = yield response.json();
      if (Array.isArray(data))
        return data.map((item) => ({ id: item.id, name: item.name }));
      return [];
    } catch (e) {
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const meta = yield resolveTmdbMeta(tmdbId, mediaType);
    if (!meta || !meta.name)
      return [];
    try {
      const { token, key } = yield getContext();
      if (!token)
        return [];
      let cleanName = meta.name.replace(/[:"']/g, "").replace(/\s+/g, " ").trim();
      const queries = [meta.name, cleanName, cleanName.split(" ").sort((a, b) => b.length - a.length)[0]];
      const uniqueQueries = [...new Set(queries)];
      let suggestions = /* @__PURE__ */ new Set();
      yield Promise.all(uniqueQueries.map((q) => __async(this, null, function* () {
        const res = yield autosuggest(q, key);
        res.forEach((t) => suggestions.add(t));
      })));
      const normTitle = normalize(meta.name);
      const validTitles = [...suggestions].filter((t) => normalize(t).startsWith(normTitle));
      const processedIds = /* @__PURE__ */ new Set();
      const finalStreams = [];
      const seenUrls = /* @__PURE__ */ new Set();
      const titlesToSearch = validTitles.length ? validTitles : [meta.name];
      const indexPromises = titlesToSearch.map((t) => searchIndex(t, token));
      const commandPromises = uniqueQueries.map((q) => searchCommand(q));
      const allResults = yield Promise.all([...indexPromises, ...commandPromises]);
      const flattenedResults = allResults.flat();
      for (const item of flattenedResults) {
        const nt = normalize(item.name);
        if (!nt.startsWith(normTitle))
          continue;
        if (processedIds.has(item.id))
          continue;
        processedIds.add(item.id);
        const streams = yield extractStreams(item.id);
        for (const s of streams) {
          if (seenUrls.has(s.url))
            continue;
          if (mediaType === "movie" && meta.year) {
            const url = decodeURIComponent(s.url);
            if (/S\d+E\d+/i.test(url))
              continue;
            const urlYearM = url.match(/(19|20)\d{2}/);
            if (urlYearM) {
              const urlYear = parseInt(urlYearM[0]);
              const metaYear = parseInt(meta.year);
              if (Math.abs(urlYear - metaYear) > 1)
                continue;
            } else
              continue;
          }
          if (mediaType === "tv") {
            const epRe = new RegExp(`S0?${season}E0?${episode}(?![0-9])`, "i");
            if (!epRe.test(s.url))
              continue;
          }
          seenUrls.add(s.url);
          finalStreams.push({ name: SOURCE_NAME, title: extractQuality(s.url), url: s.url });
        }
      }
      return finalStreams;
    } catch (e) {
      return [];
    }
  });
}
module.exports = { getStreams };
