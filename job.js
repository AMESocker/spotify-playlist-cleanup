// File: job.js
import { getSpotify } from './auth.js';
import { fetchAllPlaylistItems, removeTracks, getRecentlyPlayedIds } from './playlist.js';
import { addTracksToArchive } from './archive.js';
import { monitoredPlaylists, archivePlaylists } from './config.js';
import { logInfo, logError } from './logger.js';

export async function runJob() {
  try {
    const spotify = getSpotify();
    const tokenData = await spotify.refreshAccessToken();
    spotify.setAccessToken(tokenData.body['access_token']);

    const recentlyPlayed = await getRecentlyPlayedIds();
    logInfo(`Found ${recentlyPlayed.size} tracks played in last 24h.`);

    for (let i = 0; i < monitoredPlaylists.length; i++) {
      const playlistId = monitoredPlaylists[i].trim();
      const archiveId = archivePlaylists[i].trim();

      logInfo(`Processing playlist: ${playlistId}`);

      const items = await fetchAllPlaylistItems(playlistId);
      const archiveTracks = [];
      const removals = [];

      items.forEach((item, idx) => {
        if (item.track && recentlyPlayed.has(item.track.id)) {
          archiveTracks.push({ ...item.track, added_at: item.added_at });
          removals.push({ uri: item.track.uri, positions: [idx] });
        }
      });

      if (archiveTracks.length > 0) {
        logInfo(`Archiving ${archiveTracks.length} tracks to playlist ${archiveId}...`);
        await addTracksToArchive(archiveId, archiveTracks);

        logInfo(`Removing ${removals.length} tracks from playlist ${playlistId}...`);
        await removeTracks(playlistId, removals);
      } else {
        logInfo(`No recently played tracks to remove for playlist ${playlistId}.`);
      }
    }

  } catch (err) {
    logError('Error in job', err);
  }
}
