// File: artistGenreStrategy.js
// Selects the next artist to add using genre fairness + lowest listener count priority,
// then adds their Spotify top 10 tracks to the playlist.

import 'dotenv/config';
import fs from "fs";
import { fetchRandomTopTracks } from "./topTracksUtil.js";
import { addTracks } from "./playlist.js";

const DATA_FILE = "data/artistTop10.json";

/* ==================================================
   STATS
================================================== */

/**
 * Calculate how many artists have been added per genre (via the "added" array).
 */
function calculateGenreStats(data) {
  const stats = {};
  for (const [genre, content] of Object.entries(data)) {
    stats[genre] = {
      total: content.not_added.length + content.added.length,
      added: content.added.length,
    };
  }
  return stats;
}

/* ==================================================
   SELECTION
================================================== */

/**
 * Select the next artist to add:
 * 1. Pick the genre with the lowest added-to-total ratio (least % complete)
 * 2. Within that genre, pick a random not_added artist
 *    (non-recommended first, then lowest listener count as tiebreaker)
 */
function selectNextArtist(data) {
  const genreStats = calculateGenreStats(data);

  // Filter to genres that still have artists to add
  const eligibleGenres = Object.entries(genreStats)
    .filter(([genre]) => data[genre].not_added.length > 0)
    .map(([genre, stats]) => ({
      genre,
      addedRatio: stats.total > 0 ? stats.added / stats.total : 0,
      stats,
    }))
    .sort((a, b) => a.addedRatio - b.addedRatio);

  if (eligibleGenres.length === 0) {
    return null;
  }

  const { genre } = eligibleGenres[0];
  const candidates = data[genre].not_added;
  const randomIndex = Math.floor(Math.random() * candidates.length);

  console.log(`🎯 Selected genre: ${genre} - Artist: ${candidates[randomIndex].artist}`);
  return { genre, artist: candidates[randomIndex] };
}

/* ==================================================
   MAIN HANDLER
================================================== */

/**
 * Drop-in handler for curator.js — same return contract as other handlers:
 *   null  → source exhausted, advance to next source
 *   false → failed this round, don't advance
 *   true  → success, advance source
 */
export async function handleArtistGenre(source, wouldExceedLimit, pushHistory, saveData) {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));

  const picks = [selectNextArtist(data), selectNextArtist(data)].filter(Boolean);

  if (picks.length === 0) {
    console.log(`🎉 All genres complete in ${source.name}`);
    return null;
  }

  // Fetch tracks for all picks in parallel
  const results = await Promise.all(
    picks.map(async ({ genre, artist }) => {
      console.log(`🎸 Genre:    ${genre}`);
      console.log(`👤 Artist:   ${artist.artist}`);
      console.log(`👂 Listeners: ${artist.listeners?.toLocaleString() ?? "unknown"}`);
      if (artist.recommended) console.log(`   (recommended artist)`);

      // Remove from not_added before the async fetch so we don't double-add on retry
      data[genre].not_added = data[genre].not_added.filter(a => a.artist !== artist.artist);

      return fetchRandomTopTracks(artist.artist, {
        spotifyId: artist.spotify_id ?? null,
        count: 5,
      }).then(result => ({ genre, artist, result }));
    })
  );

     const totalTracks = results
    .filter(r => r.result.success)
    .reduce((sum, r) => sum + r.result.trackUris.length, 0);

  if (await wouldExceedLimit(totalTracks)) {
    picks.forEach(({ genre, artist }) => data[genre].not_added.unshift(artist));
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return false;
  }

  for (const { genre, artist, result } of results) {
    if (!result.success) {
      data[genre].added.push({
        artist: artist.artist,
        listeners: artist.listeners ?? null,
        spotify_id: artist.spotify_id ?? null,
        recommended: artist.recommended ?? false,
        result: result.reason,
      });
      continue;
    }

    await addTracks(process.env.TARGET_PLAYLIST_ID, result.trackUris);
    console.log(`🎶 Added ${result.trackCount} tracks for ${artist.artist}`);

    data[genre].added.push({
      artist: artist.artist,
      listeners: artist.listeners ?? null,
      spotify_id: artist.spotify_id ?? null,
      recommended: artist.recommended ?? false,
      tracksAdded: result.trackCount,
    });

    pushHistory({
      action: "addArtistGenre",
      genre,
      artist: artist.artist,
      listeners: artist.listeners ?? null,
      tracksAdded: result.trackCount,
      sourceFile: DATA_FILE,
      strategy: source.strategy,
    });

    console.log(`✅ Completed: ${artist.artist}`);
  }

  saveData(DATA_FILE, data);
  return true;
}

/* ==================================================
   DEBUG / PREVIEW (run directly: node artistGenreStrategy.js)
================================================== */

if (process.argv[1].endsWith("artistGenreStrategy.js")) {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const pick = selectNextArtist(data);

    if (!pick) {
      console.log("All genres complete.");
    } else {
      const genreStats = calculateGenreStats(data);
      console.log("\n📊 Genre Progress:");
      Object.entries(genreStats)
        .sort((a, b) => a[1].added / a[1].total - b[1].added / b[1].total)
        .forEach(([genre, s]) => {
          const pct = ((s.added / s.total) * 100).toFixed(1);
          const bar = "█".repeat(Math.round(s.added / s.total * 20)).padEnd(20, "░");
          console.log(`  ${bar} ${pct}%  ${genre} (${s.added}/${s.total})`);
        });

      console.log(`\n🎯 Next pick:`);
      console.log(`   Genre:    ${pick.genre}`);
      console.log(`   Artist:   ${pick.artist.artist}`);
      console.log(`   Listeners: ${pick.artist.listeners?.toLocaleString() ?? "unknown"}`);
      console.log(`   Recommended: ${pick.artist.recommended ?? false}`);
    }
  }