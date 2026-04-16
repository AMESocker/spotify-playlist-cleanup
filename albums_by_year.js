// File: albums_by_year.js
// Integration module for Yearly Albums releases functionality

import fs from "fs";
import { getSpotify, initAuthIfNeeded } from "./auth.js";
import { addTracks } from "./playlist.js";

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_BASE_URL = "https://ws.audioscrobbler.com/2.0/";
const DATA_PATH = "data/albums_by_year_63-25_api.json";

/**
 * Get status of Yearly Albums releases pending years
 */
export function getEditorsChoiceStatus() {
  if (!fs.existsSync(DATA_PATH)) {
    return { available: false, pendingYears: 0, nextYear: null };
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  } catch (err) {
    console.error("❌ Error parsing Editors' Choice JSON:", err.message);
    return { available: false, pendingYears: 0, nextYear: null };
  }

  if (!data.yearlyAlbums || data.yearlyAlbums.length === 0) {
    return { available: false, pendingYears: 0, nextYear: null };
  }

  const nextYear = data.yearlyAlbums[0];
  const enrichedAlbums = nextYear.albums.filter(
    (album) => album.spotifyTrack && album.spotifyTrack.uri && !album.spotifyTrack.error
  ).length;

  return {
    available: true,
    pendingYears: data.yearlyAlbums.length,
    nextYear: {
      year: nextYear.year,
      totalAlbums: nextYear.albums.length,
      enrichedAlbums,
    },
  };
}

async function getLastFmPlayCount(artist, trackName) {
  const url = new URL(LASTFM_BASE_URL);
  url.searchParams.set("method", "track.getInfo");
  url.searchParams.set("api_key", LASTFM_API_KEY);
  url.searchParams.set("artist", artist);
  url.searchParams.set("track", trackName);
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString());
  if (!response.ok) {
    console.log(`   ❌ HTTP error for "${trackName}": ${response.status} ${response.statusText}`);
    return 0;
  }

  const data = await response.json();
  return parseInt(data?.track?.listeners ?? 0, 10);
}

async function findTopTrack(artist, albumTitle) {
  try {
    const isAuthed = await initAuthIfNeeded();
    if (!isAuthed) {
      console.error("❌ Authentication failed or not completed");
      return null;
    }

    const spotify = getSpotify();

    const searchData = await spotify.searchAlbums(
      `album:${albumTitle} artist:${artist}`,
      { limit: 1 }
    );

    if (!searchData.body.albums?.items.length) {
      console.log(`   ⚠️  No album found for "${albumTitle}" by ${artist}`);
      return null;
    }

    const album = searchData.body.albums.items[0];

    const tracksData = await spotify.getAlbumTracks(album.id);

    if (!tracksData.body.items?.length) {
      console.log(`   ⚠️  No tracks found for album`);
      return null;
    }

    const tracks = tracksData.body.items;
    const listenerCounts = await Promise.all(
      tracks.map((track) => getLastFmPlayCount(artist, track.name))
    );

    let topIndex = 0;
    for (let i = 1; i < tracks.length; i++) {
      if (listenerCounts[i] > listenerCounts[topIndex]) {
        topIndex = i;
      }
    }

    const topTrack = tracks[topIndex];
    const topPlayCount = listenerCounts[topIndex];

    return {
      id: topTrack.id,
      name: topTrack.name,
      uri: topTrack.uri,
      playCount: topPlayCount,
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
 * Process one batch of 10 random albums from across all years.
 * Returns result object with success status and details.
 */
export async function processAlbumsByYear() {
  if (!fs.existsSync(DATA_PATH)) {
    return { success: false, reason: "DATA FILE NOT FOUND" };
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  } catch (err) {
    return { success: false, reason: "JSON PARSE ERROR", error: err.message };
  }

  if (!data.yearlyAlbums || data.yearlyAlbums.length === 0) {
    return { success: false, reason: "NO PENDING YEARS" };
  }

  // BUG 1 + 2 + 4 FIX:
  // Track the last picked year/album outside the loop so markProcessed and the
  // return statements can reference them reliably.  markProcessed is also moved
  // outside the loop so it closes over `data` (the mutable JSON) rather than
  // stale per-iteration bindings.
  let lastYearEntry = null;
  let lastAlbum = null;

  // BUG 1 FIX: markProcessed no longer calls .shift() on a plain object.
  // Instead it records the picked album in an addedAlbums array on the year
  // entry, mirrors the year to addedYears when it's fully drained, and
  // persists the updated JSON.
  function markProcessed(picks) {
  data.addedAlbums = Array.isArray(data.addedAlbums) ? data.addedAlbums : [];

  for (const { yearEntry, album } of picks) {
    const idx = yearEntry.albums.findIndex((a) => a.album === album.album);
    if (idx !== -1) {
      const [removed] = yearEntry.albums.splice(idx, 1);
      data.addedAlbums.push({ ...removed, year: yearEntry.year });
    }

    if (yearEntry.albums.length === 0) {
      yearEntry.addedToPlaylist = new Date().toISOString();
      yearEntry.playlistId = process.env.TARGET_PLAYLIST_ID || "UNKNOWN";
      if (!data.addedYears) data.addedYears = [];
      data.addedYears.unshift(yearEntry);
      data.yearlyAlbums = data.yearlyAlbums.filter((y) => y.year !== yearEntry.year);
    }
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

  const trackUris = [];
  const trackDetails = [];
  let skippedCount = 0;
const successfulPicks = [];

for (let i = 0; i < 10; i++) {
  const randomYearIndex = Math.floor(Math.random() * data.yearlyAlbums.length);
  lastYearEntry = data.yearlyAlbums[randomYearIndex];

  const randomAlbumIndex = Math.floor(Math.random() * lastYearEntry.albums.length);
  lastAlbum = lastYearEntry.albums[randomAlbumIndex];

  console.log(`📅 Year: ${lastYearEntry.year} 🎵 Album: ${lastAlbum.album} by ${lastAlbum.artist}`);

  const topTrack = await findTopTrack(lastAlbum.artist, lastAlbum.album);
  if (topTrack) {
    trackUris.push(topTrack.uri);
    trackDetails.push({ artist: lastAlbum.artist, album: lastAlbum.album, track: topTrack.name });
    successfulPicks.push({ yearEntry: lastYearEntry, album: lastAlbum });
  } else {
    console.log(`   ⏭️  Skipping "${lastAlbum.album}" by ${lastAlbum.artist} - no track data`);
    skippedCount++;
  }
}

  if (trackUris.length === 0) {
    try {
      markProcessed(successfulPicks);
    } catch (err) {
      return { success: false, reason: "SAVE ERROR", error: err.message };
    }

    return {
      success: false,
      reason: "NO TRACKS AVAILABLE",
      albumYear: lastYearEntry?.year,
      tracksAdded: 0,
      tracksSkipped: skippedCount,
    };
  }

  console.log(`   🎵 Found ${trackUris.length} track(s) to add:`);
  trackDetails.forEach((t) => {
    console.log(`      • ${t.artist} - ${t.track}`);
  });

  try {
    const targetPlaylistId = process.env.TARGET_PLAYLIST_ID;
    await addTracks(targetPlaylistId, trackUris);
    console.log(`   ✅ Added ${trackUris.length} tracks to playlist`);

    markProcessed(successfulPicks);

    // BUG 3 FIX: this return was commented out, causing curator.js to always
    // receive undefined and treat every run as a failure.
    return {
      success: true,
      albumYear: lastYearEntry?.year,
      tracksAdded: trackUris.length,
      tracksSkipped: skippedCount,
    };
  } catch (error) {
    console.error(`   ❌ Error adding tracks:`, error.message);

    return {
      success: false,
      reason: "PLAYLIST ADD ERROR",
      error: error.message,
      albumYear: lastYearEntry?.year,
    };
  }
}

/**
 * Standalone function to process multiple batches.
 * (for use outside of curator.js workflow if needed)
 */
export async function processMultipleYears(yearsToProcess = 1) {
  let processedCount = 0;
  let totalTracksAdded = 0;
  let totalTracksSkipped = 0;

  for (let i = 0; i < yearsToProcess; i++) {
    const status = getEditorsChoiceStatus();
    if (!status.available || status.pendingYears === 0) {
      console.log(`✅ No more years to process (processed ${processedCount} years)`);
      break;
    }

    const result = await processAlbumsByYear();

    if (result.success) {
      processedCount++;
      totalTracksAdded += result.tracksAdded;
      totalTracksSkipped += result.tracksSkipped;
      console.log(`✅ Year ${result.albumYear} processed successfully\n`);
    } else if (result.reason === "NO TRACKS AVAILABLE") {
      processedCount++;
      totalTracksSkipped += result.tracksSkipped;
      console.log(`⚠️  Year ${result.albumYear} had no tracks to add\n`);
    } else {
      console.log(`❌ Failed to process year: ${result.reason}\n`);
      break;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   - Years processed: ${processedCount}`);
  console.log(`   - Tracks added: ${totalTracksAdded}`);
  console.log(`   - Tracks skipped: ${totalTracksSkipped}`);

  return { processedCount, totalTracksAdded, totalTracksSkipped };
}

// processAlbumsByYear();
