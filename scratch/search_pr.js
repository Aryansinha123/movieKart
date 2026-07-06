const https = require('https');

const TMDB_API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxMDYzZTVmNjY2OTYxY2JiYmNkNDE2MGEzOWI5MjRjZCIsIm5iZiI6MTc3ODQ2NTgzMC4xNTYsInN1YiI6IjZhMDEzYzI2NWQzZGFkNTJmYWE4ZGVjZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.7d_YDjnugQtjaggkGws0SLVcpypzPJAa11zJFmC_8NY";
const BASE_URL = "https://api.themoviedb.org/3";

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        Authorization: `Bearer ${TMDB_API_KEY}`,
        accept: 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function search(query, type = 'tv') {
  const url = `${BASE_URL}/search/${type}?query=${encodeURIComponent(query)}`;
  try {
    const res = await getJson(url);
    return res.results || [];
  } catch (err) {
    console.error(`Error searching for ${query}:`, err.message);
    return [];
  }
}

const queries = [
  { name: "Mighty Morphin Power Rangers", type: "tv" },
  { name: "Mighty Morphin Power Rangers: The Movie", type: "movie" },
  { name: "Mighty Morphin Alien Rangers", type: "tv" },
  { name: "Power Rangers Zeo", type: "tv" },
  { name: "Power Rangers Turbo", type: "tv" },
  { name: "Turbo: A Power Rangers Movie", type: "movie" },
  { name: "Power Rangers in Space", type: "tv" },
  { name: "Power Rangers Lost Galaxy", type: "tv" },
  { name: "Power Rangers Lightspeed Rescue", type: "tv" },
  { name: "Power Rangers Time Force", type: "tv" },
  { name: "Power Rangers Wild Force", type: "tv" },
  { name: "Power Rangers Ninja Storm", type: "tv" },
  { name: "Power Rangers Dino Thunder", type: "tv" },
  { name: "Power Rangers S.P.D.", type: "tv" },
  { name: "Power Rangers Mystic Force", type: "tv" },
  { name: "Power Rangers Operation Overdrive", type: "tv" },
  { name: "Power Rangers Jungle Fury", type: "tv" },
  { name: "Power Rangers RPM", type: "tv" },
  { name: "Power Rangers Samurai", type: "tv" },
  { name: "Power Rangers Super Samurai", type: "tv" },
  { name: "Power Rangers Megaforce", type: "tv" },
  { name: "Power Rangers Super Megaforce", type: "tv" },
  { name: "Power Rangers Dino Charge", type: "tv" },
  { name: "Power Rangers Dino Super Charge", type: "tv" },
  { name: "Power Rangers", type: "movie", year: 2017 },
  { name: "Power Rangers Ninja Steel", type: "tv" },
  { name: "Power Rangers Super Ninja Steel", type: "tv" },
  { name: "Power Rangers Beast Morphers", type: "tv" },
  { name: "Power Rangers Dino Fury", type: "tv" },
  { name: "Power Rangers Cosmic Fury", type: "tv" },
  { name: "Mighty Morphin Power Rangers: Once & Always", type: "movie" }
];

async function run() {
  const results = [];
  for (const q of queries) {
    const res = await search(q.name, q.type);
    let matched = null;
    if (q.year) {
      matched = res.find(r => {
        const date = r.release_date || r.first_air_date;
        return date && date.startsWith(String(q.year));
      });
    } else {
      matched = res[0];
    }
    if (matched) {
      results.push({
        query: q.name,
        type: q.type,
        matchedTitle: matched.name || matched.title,
        id: q.type === 'tv' ? -matched.id : matched.id,
        release_date: matched.release_date || matched.first_air_date,
        overview: matched.overview
      });
    } else {
      results.push({
        query: q.name,
        type: q.type,
        error: "NOT FOUND"
      });
    }
  }
  console.log(JSON.stringify(results, null, 2));
}

run();
