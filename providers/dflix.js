var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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

// src/dflix/index.js
var { extractQuality, titlesMatch, extractYear, resolveTmdbMeta } = require_utils();
var SOURCE_NAME = "DFLIX";
var DFLIX_URL = "https://movies.discoveryftp.net";
var fetchOptions = {
  headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
};
function search(query, type) {
  return __async(this, null, function* () {
    const searchType = type === "movie" ? "m" : "s";
    try {
      const body = new URLSearchParams();
      body.append("term", query);
      body.append("types", searchType);
      const response = yield fetch(`${DFLIX_URL}/search`, __spreadProps(__spreadValues({
        method: "POST"
      }, fetchOptions), {
        headers: __spreadProps(__spreadValues({}, fetchOptions.headers), {
          "Content-Type": "application/x-www-form-urlencoded"
        }),
        body: body.toString()
      }));
      if (!response.ok)
        return [];
      const html = yield response.text();
      const results = [];
      const itemRegex = /<a href="(\/[ms]\/view\/\d+)"[^>]*>[\s\S]*?<div class="searchtitle"[^>]*>([^<]+)<\/div>[\s\S]*?<div class="searchdetails"[^>]*>([\s\S]*?)<\/div>/gi;
      let match;
      while ((match = itemRegex.exec(html)) !== null) {
        const href = match[1];
        const title = match[2].trim();
        const details = match[3].replace(/<[^>]+>/g, " ").trim();
        if (title && href) {
          results.push({ title, details, url: DFLIX_URL + href });
        }
      }
      return results;
    } catch (e) {
      return [];
    }
  });
}
function extractDownloadLinks(html) {
  const links = [];
  const cdnRegex = /href="(https?:\/\/p?cdn\d*\.discoveryftp\.net[^"]*\.(?:mkv|mp4))"/gi;
  let match;
  while ((match = cdnRegex.exec(html)) !== null) {
    if (!links.includes(match[1]))
      links.push(match[1]);
  }
  return links;
}
function extractVariantLinks(html, currentPath) {
  const variants = [];
  const variantRegex = /href="(\/m\/view\/\d+)"/gi;
  let match;
  while ((match = variantRegex.exec(html)) !== null) {
    const href = match[1];
    if (href !== currentPath && !variants.includes(href))
      variants.push(DFLIX_URL + href);
  }
  return variants;
}
function getMovieStreams(url) {
  return __async(this, null, function* () {
    try {
      const response = yield fetch(url, fetchOptions);
      if (!response.ok)
        return [];
      const html = yield response.text();
      const currentPath = url.replace(DFLIX_URL, "");
      let allLinks = extractDownloadLinks(html);
      const variantUrls = extractVariantLinks(html, currentPath);
      if (variantUrls.length > 0) {
        const variantResponses = yield Promise.all(
          variantUrls.map((vUrl) => fetch(vUrl, fetchOptions).then((res) => res.text()).catch(() => null))
        );
        for (const vHtml of variantResponses) {
          if (vHtml) {
            const variantLinks = extractDownloadLinks(vHtml);
            for (const link of variantLinks) {
              if (!allLinks.includes(link))
                allLinks.push(link);
            }
          }
        }
      }
      return allLinks.map((link) => ({ name: SOURCE_NAME, title: extractQuality(link), url: link }));
    } catch (e) {
      return [];
    }
  });
}
function getSeriesStreams(url, season, episode) {
  return __async(this, null, function* () {
    try {
      const sPad = String(season).padStart(2, "0");
      const baseViewPath = url.replace(DFLIX_URL, "");
      let response = yield fetch(url, fetchOptions);
      if (!response.ok)
        return [];
      let html = yield response.text();
      const seasonPageMatch = html.match(new RegExp(`href="(${baseViewPath}/${sPad})"`, "i"));
      if (seasonPageMatch) {
        response = yield fetch(DFLIX_URL + seasonPageMatch[1], fetchOptions);
        html = yield response.text();
      }
      const epRegex = new RegExp(`S${season}\\s*\\|\\s*EP\\s*${episode}\\s*<a\\s+href="([^"]+\\.(?:mkv|mp4))"`, "gi");
      const directLinks = [];
      let match;
      while ((match = epRegex.exec(html)) !== null)
        directLinks.push(match[1]);
      if (directLinks.length > 0) {
        return directLinks.map((link) => ({ name: SOURCE_NAME, title: extractQuality(link), url: link }));
      }
      const cdnMatch = html.match(/href="(https?:\/\/cdn\d*\.discoveryftp\.net\/[^"]+\/)"\s*title="Browse/i);
      if (!cdnMatch)
        return [];
      const cdnUrl = cdnMatch[1];
      const cdnBase = cdnUrl.match(/^(https?:\/\/[^\/]+)/)[1];
      const cdnRes = yield fetch(cdnUrl, fetchOptions);
      const cdnHtml = yield cdnRes.text();
      const seasonMatch = cdnHtml.match(new RegExp(`href="([^"]*[Ss]eason[\\s%20]+0*${season}/)`, "i"));
      if (!seasonMatch)
        return [];
      const seasonUrl = seasonMatch[1].startsWith("http") ? seasonMatch[1] : cdnBase + seasonMatch[1];
      const seasonRes = yield fetch(seasonUrl, fetchOptions);
      const seasonHtml = yield seasonRes.text();
      const streams = [];
      const fileRegex = /<a href="([^"]*\.(?:mkv|mp4))"/gi;
      while ((match = fileRegex.exec(seasonHtml)) !== null) {
        const filename = decodeURIComponent(match[1].split("/").pop());
        const seMatch = filename.match(/S0*(\d+)\D*E0*(\d+)/i);
        if (seMatch && parseInt(seMatch[1]) === parseInt(season) && parseInt(seMatch[2]) === parseInt(episode)) {
          const fileUrl = match[1].startsWith("http") ? match[1] : match[1].startsWith("/") ? cdnBase + match[1] : seasonUrl + match[1];
          streams.push({ name: SOURCE_NAME, title: extractQuality(filename), url: fileUrl });
        }
      }
      return streams;
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
    const results = yield search(meta.name, mediaType);
    if (results.length === 0)
      return [];
    let bestMatch = null;
    let bestScore = 0;
    for (const result of results) {
      if (!titlesMatch(result.title, meta.name))
        continue;
      let score = 10;
      if (meta.year) {
        const resultYear = extractYear(result.details || result.title);
        if (resultYear) {
          const yearDiff = Math.abs(resultYear - meta.year);
          if (yearDiff === 0)
            score += 10;
          else if (yearDiff === 1)
            score += 5;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = result;
      }
    }
    if (!bestMatch)
      return [];
    if (mediaType === "movie") {
      return yield getMovieStreams(bestMatch.url);
    } else {
      return yield getSeriesStreams(bestMatch.url, parseInt(season), parseInt(episode));
    }
  });
}
module.exports = { getStreams };
