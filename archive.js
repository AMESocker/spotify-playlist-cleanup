// File: archive.js
import fs from 'fs';
import path from 'path';
import { addTracks } from './playlist.js';
import { logInfo } from './logger.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function addTracksToArchive(playlistId, tracks) {
  const uris = tracks.map(t => t.uri);
  const logFile = `archive-log-${playlistId}.json`;
  const logPath = path.resolve(__dirname, logFile);

  let logData = [];
  if (fs.existsSync(logPath)) {
    logData = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  }

  const now = new Date().toISOString();
  const newEntries = tracks.map(t => ({
    id: t.id,
    name: t.name,
    added_at: t.added_at || null,
    archived_at: now
  }));

  logData.push(...newEntries);
  fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));

  await addTracks(playlistId, uris);
  logInfo(`Archived ${uris.length} tracks.`);
}
