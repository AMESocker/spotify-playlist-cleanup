# Spotify Playlist Cleanup & Archiver

This project automates the cleanup of Spotify playlists by moving recently played tracks into archive playlists. It ensures your monitored playlists stay fresh while still keeping a record of what you’ve listened to.

---

## ✨ Features

* **Automatic cleanup**: Removes tracks from selected playlists if they’ve been played in the last 24 hours.
* **Archiving**: Moves removed tracks into dedicated archive playlists so you never lose history.
* **Token refresh**: Automatically refreshes your Spotify access token for uninterrupted operation.
* **Configurable**: Easily adjust which playlists to monitor and where to archive them.

---

## 📂 Project Structure

```
.
├── job.js            # Main job runner
├── auth.js           # Spotify authentication logic
├── playlist.js       # Playlist management functions (fetch, remove, etc.)
├── archive.js        # Handles adding tracks to archive playlists
├── config.js         # Configuration (monitored + archive playlists)
├── logger.js         # Logging utility
```

---

## ⚙️ How It Works

1. **Authenticate with Spotify** using `auth.js`.
2. **Get recently played tracks** from the last 24 hours.
3. For each monitored playlist:

   * Fetch all tracks.
   * Identify tracks that were recently played.
   * Add those tracks to the archive playlist.
   * Remove them from the monitored playlist.

---

## 🔧 Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/spotify-playlist-cleanup.git
cd spotify-playlist-cleanup
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure your playlists

Edit **`config.js`** and set:

```js
export const monitoredPlaylists = [
  'YOUR_MONITORED_PLAYLIST_ID_1',
  'YOUR_MONITORED_PLAYLIST_ID_2',
];
export const archivePlaylists = [
  'YOUR_ARCHIVE_PLAYLIST_ID_1',
  'YOUR_ARCHIVE_PLAYLIST_ID_2',
];
```

### 4. Add Spotify API credentials

Make sure you have a Spotify Developer account and set environment variables for your credentials:

```bash
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REFRESH_TOKEN=your_refresh_token
```

---

## ▶️ Running the Job

To run the cleanup job manually:

```bash
node job.js
```

You can also schedule it using **cron** or a task scheduler to run daily.

---

## 📝 Example Log Output

```
Found 12 tracks played in last 24h.
Processing playlist: 123abcPlaylistID
Archiving 4 tracks to playlist 456xyzArchiveID...
Removing 4 tracks from playlist 123abcPlaylistID...
No recently played tracks to remove for playlist 789defPlaylistID.
```

---

## 🚀 Future Improvements

* Web dashboard for monitoring cleanup activity.
* Web dashboard for adding/removing artists to/from a blacklist.
* Adding music from multiple sources. 
* Keeping artists discography up to date.
---


## 📜 License

MIT License.


