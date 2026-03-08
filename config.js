//File: config.js
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ENV_PATH = path.resolve(__dirname, '.env');
export const REDIRECT_URI = 'http://localhost:8888/callback';
export const SCOPES = [
  'playlist-modify-public',
  'playlist-modify-private'
];

const monitored = process.env.MONITORED_PLAYLISTS;
if (!monitored) {
  throw new Error("Missing MONITORED_PLAYLISTS in .env");
}

export const monitoredPlaylists = monitored.split(",").map((id) => id.trim());
export const archivePlaylists = process.env.ARCHIVE_PLAYLISTS.split(',');
export const staleArchivePlaylistId = '7aPl4nirnGASnecnaLxYAu';