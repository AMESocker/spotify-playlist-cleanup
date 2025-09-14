// playlistChecker.js
import 'dotenv/config';
import { getSpotify } from './auth.js';
import { monitoredPlaylists } from './config.js';

/**
 * Fetch the number of tracks in each monitored playlist.
 */
export async function checkPlaylistSizes() {
  const spotify = getSpotify();
  const sizes = [];

  for (const playlistId of monitoredPlaylists) {
    try {
      const data = await spotify.getPlaylist(playlistId);
      const trackCount = data.body.tracks.total;
      sizes.push({ playlistId, trackCount });
    } catch (err) {
      console.error(`Error fetching playlist ${playlistId}:`, err);
    }
  }
  console.log("Playlist sizes:", sizes);
  return sizes;
}
