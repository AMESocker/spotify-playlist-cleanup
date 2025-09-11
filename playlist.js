// File: playlist.js
import { withRetry } from './utils.js';
import { getSpotify } from './auth.js';

export async function fetchAllPlaylistItems(playlistId) {
  const spotify = getSpotify();
  const limit = 100;
  let offset = 0;
  let all = [];
  while (true) {
    const res = await withRetry(() => spotify.getPlaylistTracks(playlistId, {
      limit, offset, fields: 'items(added_at,track(id,name,uri)),next'
    }));
    all = all.concat(res.body.items);
    if (!res.body.next) break;
    offset += limit;
  }
  return all;
}

export async function addTracks(playlistId, uris) {
  const spotify = getSpotify();
  const chunkSize = 100;
  for (let i = 0; i < uris.length; i += chunkSize) {
    const chunk = uris.slice(i, i + chunkSize);
    await withRetry(() => spotify.addTracksToPlaylist(playlistId, chunk));
  }
}

export async function removeTracks(playlistId, tracks) {
  const spotify = getSpotify();
  const chunkSize = 100;
  for (let i = 0; i < tracks.length; i += chunkSize) {
    const chunk = tracks.slice(i, i + chunkSize);
    await withRetry(() => spotify.removeTracksFromPlaylist(playlistId, chunk));
  }
}

export async function getRecentlyPlayedIds() {
  const spotify = getSpotify();
  const res = await withRetry(() => spotify.getMyRecentlyPlayedTracks({ limit: 50 }));
  const ids = new Set();
  res.body.items.forEach(item => {
    if (item.track && item.track.id) {
      ids.add(item.track.id);
    }
  });
  return ids;
}
