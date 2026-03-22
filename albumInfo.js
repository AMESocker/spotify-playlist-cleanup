// File: albumInfo.js
import { getSpotify } from "./auth.js";
import { logInfo, logError } from "./logger.js";

export async function getAlbumTrackCount(artist, albumName) {
  const spotify = getSpotify();

  try {
    // Ensure access token is fresh
    const tokenData = await spotify.refreshAccessToken();
    spotify.setAccessToken(tokenData.body['access_token']);

    // Strip trailing year e.g. "(1995)" or "(1995)^"
    const cleanAlbum = albumName.replace(/\s*\(\d{4}\)\^?$/, '').trim();

    const searchRes = await spotify.searchAlbums(`${cleanAlbum} artist:${artist}`, { limit: 1 });

    if (!searchRes.body.albums.items.length) {
      logError(`No album found for "${cleanAlbum}" by ${artist}`);
      return null;
    }

    const album = searchRes.body.albums.items[0];
    const albumId = album.id;

    // Fetch album details
    const albumRes = await spotify.getAlbum(albumId);

    return {
      id: albumRes.body.id,
      name: albumRes.body.name,
      release: albumRes.body.release_date,
      totalTracks: albumRes.body.total_tracks,
      url: albumRes.body.external_urls.spotify
    };
  } catch (err) {
    logError("Error fetching album track count", err);
    return null;
  }
}
