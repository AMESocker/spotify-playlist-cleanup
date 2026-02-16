import fs from "fs";
import fetch from "node-fetch";
import 'dotenv/config';

//TODO: Not finding the most played track correctly

console.log("🎵 Running Spotify track enricher...");

const DATA_PATH = "data/editorsChoiceNew3.json";
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const DELAY_MS = 500; // Delay between API calls to avoid rate limiting

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get Spotify access token using client credentials flow
 */
async function getSpotifyAccessToken() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error(
      "Missing Spotify credentials. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables."
    );
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Search Spotify for an album and return the most popular track
 */
async function findTopTrack(accessToken, artist, albumTitle) {
  try {
    // Search for the album
    const searchQuery = encodeURIComponent(`album:${albumTitle} artist:${artist}`);
    const searchUrl = `https://api.spotify.com/v1/search?q=${searchQuery}&type=album&limit=1`;

    const searchResponse = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!searchResponse.ok) {
      console.error(`   ❌ Search failed: ${searchResponse.statusText}`);
      return null;
    }

    const searchData = await searchResponse.json();

    if (!searchData.albums || searchData.albums.items.length === 0) {
      console.log(`   ⚠️  No album found for "${albumTitle}" by ${artist}`);
      return null;
    }

    const album = searchData.albums.items[0];
    const albumId = album.id;

    // Get album tracks
    await sleep(DELAY_MS / 2); // Small delay between requests
    const tracksUrl = `https://api.spotify.com/v1/albums/${albumId}/tracks`;

    const tracksResponse = await fetch(tracksUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!tracksResponse.ok) {
      console.error(`   ❌ Failed to get tracks: ${tracksResponse.statusText}`);
      return null;
    }

    const tracksData = await tracksResponse.json();

    if (!tracksData.items || tracksData.items.length === 0) {
      console.log(`   ⚠️  No tracks found for album`);
      return null;
    }

    // Get full track details to access popularity
    const trackIds = tracksData.items.map(t => t.id).join(",");
    await sleep(DELAY_MS / 2);
    
    const trackDetailsUrl = `https://api.spotify.com/v1/tracks?ids=${trackIds}`;
    const trackDetailsResponse = await fetch(trackDetailsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!trackDetailsResponse.ok) {
      console.error(`   ❌ Failed to get track details: ${trackDetailsResponse.statusText}`);
      return null;
    }

    const trackDetailsData = await trackDetailsResponse.json();
    const tracks = trackDetailsData.tracks;

    // Find the most popular track
    let topTrack = tracks[0];
    for (const track of tracks) {
      if (track.popularity > topTrack.popularity) {
        topTrack = track;
      }
    }

    console.log(`   ✅ Found: "${topTrack.name}" (popularity: ${topTrack.popularity})`);

    return {
      id: topTrack.id,
      name: topTrack.name,
      uri: topTrack.uri,
      popularity: topTrack.popularity,
      albumName: album.name,
      albumId: album.id,
      foundAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`   ❌ Error searching for track:`, error.message);
    return null;
  }
}

/**
 * Enrich pending weeks with Spotify track data
 */
async function enrichPendingWeeks() {
  // Load existing data
  if (!fs.existsSync(DATA_PATH)) {
    console.error(`❌ Data file not found: ${DATA_PATH}`);
    console.log("💡 Run the scraper first to create the database");
    return;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  } catch (err) {
    console.error("❌ Error parsing JSON:", err.message);
    return;
  }

  if (!data.weeklyAlbums || data.weeklyAlbums.length === 0) {
    console.log("✅ No pending weeks to enrich!");
    return;
  }

  console.log(`📊 Found ${data.weeklyAlbums.length} pending week(s)`);

  // Get Spotify access token
  let accessToken;
  try {
    accessToken = await getSpotifyAccessToken();
    console.log("🔑 Spotify access token obtained\n");
  } catch (error) {
    console.error("❌ Failed to get Spotify access token:", error.message);
    return;
  }

  let totalAlbums = 0;
  let enrichedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  // Process each pending week
  for (const week of data.weeklyAlbums) {
    console.log(`\n📅 Processing week: ${week.date}`);
    console.log(`   Albums: ${week.albums.length}`);

    for (const album of week.albums) {
      totalAlbums++;

      // Skip if already enriched
      if (album.spotifyTrack && album.spotifyTrack.id) {
        console.log(`   ⏭️  "${album.title}" by ${album.artist} - already enriched`);
        skippedCount++;
        continue;
      }

      console.log(`   🔍 Searching: "${album.title}" by ${album.artist}`);
      
      const trackData = await findTopTrack(accessToken, album.artist, album.title);
      
      if (trackData) {
        album.spotifyTrack = trackData;
        enrichedCount++;
      } else {
        album.spotifyTrack = {
          error: "Not found",
          searchedAt: new Date().toISOString(),
        };
        failedCount++;
      }

      // Delay between searches
      await sleep(DELAY_MS);
    }
  }

  // Save updated data
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    console.log(`\n✅ Database updated successfully!`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Total albums processed: ${totalAlbums}`);
    console.log(`   - Newly enriched: ${enrichedCount}`);
    console.log(`   - Already enriched (skipped): ${skippedCount}`);
    console.log(`   - Failed to find: ${failedCount}`);
  } catch (err) {
    console.error("❌ Error saving JSON:", err.message);
  }
}

enrichPendingWeeks().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
