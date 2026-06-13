/**
 * Maps TMDB watch provider IDs to dedicated OTT platform URLs.
 * TMDB does not expose per-provider deep links — search URLs are used instead.
 */

function enc(value) {
  return encodeURIComponent(value || "");
}

function primeVideoUrl(title) {
  return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${enc(title)}`;
}

/** @type {Record<number, (title: string) => string>} */
const PROVIDER_URL_BUILDERS = {
  8: (title) => `https://www.netflix.com/search?q=${enc(title)}`,
  9: primeVideoUrl,
  10: primeVideoUrl,
  119: primeVideoUrl,
  337: (title) => `https://www.disneyplus.com/search?q=${enc(title)}`,
  350: (title) => `https://tv.apple.com/search?term=${enc(title)}`,
  2: (title) => `https://tv.apple.com/search?term=${enc(title)}`,
  384: (title) => `https://www.max.com/search?q=${enc(title)}`,
  1899: (title) => `https://www.max.com/search?q=${enc(title)}`,
  531: (title) => `https://www.paramountplus.com/search/?q=${enc(title)}`,
  386: (title) => `https://www.peacocktv.com/search?q=${enc(title)}`,
  15: (title) => `https://www.hulu.com/search?q=${enc(title)}`,
  122: (title) => `https://www.hotstar.com/in/search?q=${enc(title)}`,
  532: (title) => `https://www.jiocinema.com/search/${enc(title)}`,
  613: (title) => `https://www.zee5.com/search?q=${enc(title)}`,
  1773: (title) => `https://www.sonyliv.com/search?query=${enc(title)}`,
  592: (title) => `https://www.aha.video/search?q=${enc(title)}`,
  283: (title) => `https://www.crunchyroll.com/search?q=${enc(title)}`,
  526: (title) => `https://www.crunchyroll.com/search?q=${enc(title)}`,
  3: (title) => `https://play.google.com/store/search?q=${enc(title)}&c=movies`,
  192: (title) => `https://www.youtube.com/results?search_query=${enc(title)}`,
  437: (title) => `https://www.hungama.com/search/${enc(title)}`,
  441: (title) => `https://www.mubi.com/search/films?search=${enc(title)}`,
  2336: (title) => `https://www.netflix.com/search?q=${enc(title)}`,
  2472: (title) => `https://www.max.com/search?q=${enc(title)}`,
};

const NAME_FALLBACKS = [
  { pattern: /prime\s*video|amazon\s*prime/i, build: primeVideoUrl },
  { pattern: /netflix/i, build: (t) => `https://www.netflix.com/search?q=${enc(t)}` },
  { pattern: /hotstar|jio\s*hotstar/i, build: (t) => `https://www.hotstar.com/in/search?q=${enc(t)}` },
  { pattern: /disney\+?/i, build: (t) => `https://www.disneyplus.com/search?q=${enc(t)}` },
  { pattern: /jiocinema|jio\s*cinema/i, build: (t) => `https://www.jiocinema.com/search/${enc(t)}` },
  { pattern: /zee5/i, build: (t) => `https://www.zee5.com/search?q=${enc(t)}` },
  { pattern: /sony\s*l/i, build: (t) => `https://www.sonyliv.com/search?query=${enc(t)}` },
  { pattern: /apple\s*tv/i, build: (t) => `https://tv.apple.com/search?term=${enc(t)}` },
  { pattern: /\bmax\b|hbo/i, build: (t) => `https://www.max.com/search?q=${enc(t)}` },
  { pattern: /hulu/i, build: (t) => `https://www.hulu.com/search?q=${enc(t)}` },
  { pattern: /paramount/i, build: (t) => `https://www.paramountplus.com/search/?q=${enc(t)}` },
  { pattern: /peacock/i, build: (t) => `https://www.peacocktv.com/search?q=${enc(t)}` },
  { pattern: /crunchyroll/i, build: (t) => `https://www.crunchyroll.com/search?q=${enc(t)}` },
  { pattern: /google\s*play/i, build: (t) => `https://play.google.com/store/search?q=${enc(t)}&c=movies` },
  { pattern: /youtube/i, build: (t) => `https://www.youtube.com/results?search_query=${enc(t)}` },
  { pattern: /\baha\b/i, build: (t) => `https://www.aha.video/search?q=${enc(t)}` },
];

/**
 * @param {number} providerId
 * @param {string} providerName
 * @param {string} title
 * @returns {string|null}
 */
export function getOttProviderUrl(providerId, providerName, title) {
  const builder = PROVIDER_URL_BUILDERS[providerId];
  if (builder) return builder(title);

  const nameMatch = NAME_FALLBACKS.find(({ pattern }) => pattern.test(providerName || ""));
  if (nameMatch) return nameMatch.build(title);

  return null;
}

/**
 * @param {Array<{ provider_id: number, provider_name: string, logo_path: string }>} providers
 * @param {{ title: string }} options
 */
export function enrichWatchProviders(providers, { title }) {
  return providers.map((provider) => ({
    ...provider,
    watchUrl: getOttProviderUrl(provider.provider_id, provider.provider_name, title),
  }));
}

/**
 * @param {object|null} watchProvidersRes
 * @param {string} title
 */
export function parseWatchProviders(watchProvidersRes, title) {
  if (!watchProvidersRes?.results) {
    return { providers: [], watchLink: null };
  }

  const country =
    watchProvidersRes.results.IN ||
    watchProvidersRes.results.US ||
    watchProvidersRes.results.GB ||
    Object.values(watchProvidersRes.results)[0];

  if (!country) {
    return { providers: [], watchLink: null };
  }

  const raw = [
    ...(country.flatrate || []),
    ...(country.rent || []),
    ...(country.buy || []),
  ];
  const unique = Array.from(new Map(raw.map((p) => [p.provider_id, p])).values());
  const watchLink = country.link || null;

  return {
    providers: enrichWatchProviders(unique, { title }),
    watchLink,
  };
}
