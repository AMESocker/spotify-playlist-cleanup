import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ENV_PATH = path.resolve(__dirname, '.env');
export const REDIRECT_URI = 'http://localhost:8888/callback';
export const SCOPES = [
  'playlist-modify-public',
  'playlist-modify-private'
];

export const monitoredPlaylists = process.env.MONITORED_PLAYLISTS.split(',');
export const archivePlaylists = process.env.ARCHIVE_PLAYLISTS.split(',');