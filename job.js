// File: job.js
import { getSpotify } from './auth.js';
import { fetchAllPlaylistItems, removeTracks, getRecentlyPlayedIds } from './playlist.js';
import { addTracksToArchive } from './archive.js';
import { monitoredPlaylists, archivePlaylists } from './config.js';
import { logInfo, logError } from './logger.js';

//? Main job function to manage playlist cleanup and archiving
export async function runJob() {
  try {
    //? Get an authenticated Spotify API client
    const spotify = getSpotify();

    //? Refresh the access token to ensure API calls succeed
    const tokenData = await spotify.refreshAccessToken();
    spotify.setAccessToken(tokenData.body['access_token']);

    //? Fetch IDs of tracks played in the last 24 hours
    const recentlyPlayed = await getRecentlyPlayedIds();
    logInfo(`Found ${recentlyPlayed.size} tracks played in last 24h.`);

    //? Loop through each monitored playlist and its corresponding archive playlist
    for (let i = 0; i < monitoredPlaylists.length; i++) {
      const playlistId = monitoredPlaylists[i].trim();
      const archiveId = archivePlaylists[i].trim();

      logInfo(`Processing playlist: ${playlistId}`);

      //? Fetch all items from the current playlist
      const items = await fetchAllPlaylistItems(playlistId);

      //? Arrays to hold tracks that should be archived and removed
      const archiveTracks = [];
      const removals = [];

      //? Check each track in the playlist
      items.forEach((item, idx) => {
        //? If the track was played recently, mark it for archiving and removal
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
