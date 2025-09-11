// File: auth.js
import express from 'express';
import open from 'open';
import SpotifyWebApi from 'spotify-web-api-node';
import { saveEnvVar } from './utils.js';
import { SCOPES, REDIRECT_URI } from './config.js';
import { logInfo, logError } from './logger.js';

const spotify = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: REDIRECT_URI
});

export async function initAuthIfNeeded() {
  if (!process.env.SPOTIFY_REFRESH_TOKEN) {
    const app = express();

    app.get('/login', (req, res) => {
      const authURL = spotify.createAuthorizeURL(SCOPES, 'state123');
      res.redirect(authURL);
    });

    app.get('/callback', async (req, res) => {
      const { code } = req.query;
      try {
        const data = await spotify.authorizationCodeGrant(code);
        const refreshToken = data.body.refresh_token;
        saveEnvVar('SPOTIFY_REFRESH_TOKEN', refreshToken);
        spotify.setRefreshToken(refreshToken);
        res.send('<h2>Refresh token saved!</h2><p>You can close this window.</p>');
        logInfo('Refresh token saved to .env');
        setTimeout(() => process.exit(0), 2000);
      } catch (err) {
        logError('Error getting tokens', err);
        res.send('Error getting tokens.');
      }
    });

    app.listen(8888, () => {
      logInfo('Auth server started: http://localhost:8888/login');
      open('http://localhost:8888/login');
    });

    return false;
  } else {
    spotify.setRefreshToken(process.env.SPOTIFY_REFRESH_TOKEN);
    return true;
  }
}

export function getSpotify() {
  return spotify;
}