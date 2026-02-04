// File: index.js
import 'dotenv/config';
import { initAuthIfNeeded } from './auth.js';
import { runJob } from './job.js';
import { scheduleDaily } from './scheduler.js';
import { logInfo } from './logger.js';
import { addNextAlbum } from './curator.js';
import { checkPlaylistSizes } from './playlistChecker.js';

(async () => {
  const ready = await initAuthIfNeeded();
  if (!ready) return;
  
  if (process.env.RUN_MODE === 'once') {
    await runJob();
    
    // Keep adding albums until playlist is full
    const targetPlaylistId = process.env.TARGET_PLAYLIST_ID;
    let albumsAdded = 0;
    const MAX_ALBUMS = 50; // Safety limit to prevent infinite loops
    
    while (albumsAdded < MAX_ALBUMS) {
      // Check current playlist size
      const sizes = await checkPlaylistSizes();
      const playlistSize = sizes.find(p => p.playlistId === targetPlaylistId);
      
      if (!playlistSize) {
        logInfo('Could not find target playlist size');
        break;
      }
      
      logInfo(`Current playlist size: ${playlistSize.trackCount}/200`);
      
      // If playlist is getting close to full, stop
      if (playlistSize.trackCount >= 180) {
        logInfo(`Playlist nearly full (${playlistSize.trackCount} tracks). Stopping.`);
        break;
      }
      
      // Try to add next album
      const success = await addNextAlbum();
      
      // If addNextAlbum returns false, it means it couldn't add (skipped, not found, etc.)
      if (!success) {
        logInfo('Could not add album, stopping.');
        break;
      }
      
      albumsAdded++;
      logInfo(`Albums added this run: ${albumsAdded}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    logInfo(`Finished: Added ${albumsAdded} albums total`);
    
  } else {
    scheduleDaily(runJob);
    logInfo('Scheduled daily cleanup job.');
  }
})();