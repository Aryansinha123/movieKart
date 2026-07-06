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

async function run() {
  // Let's check details of TV show 2328
  const prShow = await getJson(`${BASE_URL}/tv/2328`);
  console.log("TV Show 2328:", prShow.name, "Number of Seasons:", prShow.number_of_seasons);
  if (prShow.seasons) {
    prShow.seasons.forEach(s => {
      console.log(`Season ${s.season_number}: ${s.name} (${s.air_date}) - ID: ${s.id} - ${s.episode_count} eps`);
    });
  }

  // Let's also search specifically for "Mighty Morphin Power Rangers" to see if there is another ID (like 2288 or similar)
  const searchMMPR = await getJson(`${BASE_URL}/search/tv?query=Mighty%20Morphin%20Power%20Rangers`);
  console.log("\nSearch MMPR results:");
  searchMMPR.results.slice(0, 5).forEach(r => {
    console.log(`ID: ${r.id} | Name: ${r.name} | First Air: ${r.first_air_date}`);
  });
}

run();
