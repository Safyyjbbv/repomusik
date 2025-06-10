/**
 * Minimal music & video repository server with upload and API key.
 * Run: npm install express multer
 * Start: node server.js
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Simple API key - in real usage, use env or secure storage.
const API_KEY = 'my-secret-api-key-12345';

// Storage folders for uploads
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const MUSIC_DIR = path.join(UPLOAD_DIR, 'music');
const VIDEO_DIR = path.join(UPLOAD_DIR, 'videos');

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR);
if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR);

// Multer storage config - different folder per file type
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'music') cb(null, MUSIC_DIR);
    else if (file.fieldname === 'video') cb(null, VIDEO_DIR);
    else cb(new Error('Invalid fieldname'));
  },
  filename: function (req, file, cb) {
    // Save with timestamp + original name to avoid collisions
    const safeName = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, Date.now() + '-' + safeName);
  }
});
const upload = multer({ storage });

// Serve static uploaded files
app.use('/uploads', express.static(UPLOAD_DIR));

// Serve main page with embedded frontend
app.get('/', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Simple Music & Video Repo</title>
<style>
  body {
    font-family: system-ui, sans-serif;
    background: #fff;
    color: #374151;
    margin: 0; padding: 0; min-height: 100vh;
    display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
  }
  main {
    max-width: 600px;
    width: 100%;
    padding: 2rem;
  }
  h1 {
    font-weight: 700;
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }
  label {
    display: block;
    margin-top: 1.25rem;
    font-weight: 600;
  }
  input[type="file"] {
    margin-top: 0.25rem;
  }
  button {
    margin-top: 0.75rem;
    padding: 0.5rem 1.25rem;
    font-weight: 600;
    background: #111827;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }
  button:hover {
    background: #374151;
  }
  #apiKey {
    margin-top: 1rem;
    padding: 0.5rem 0;
    font-family: monospace;
    background: #f3f4f6;
    border-radius: 6px;
    text-align: center;
    user-select: all;
  }
  .section {
    margin-top: 2rem;
  }
  .file-list {
    margin-top: 1rem;
    border-top: 1px solid #e5e7eb;
    padding-top: 1rem;
  }
  .file-list-item {
    margin-bottom: 0.75rem;
    word-break: break-all;
  }
  a.file-link {
    color: #2563eb;
    text-decoration: none;
  }
  a.file-link:hover {
    text-decoration: underline;
  }
</style>
</head>
<body>
  <main>
    <h1>Simple Music & Video Repository</h1>
    <p>Your API key (use to access /api/files?apikey=YOUR_API_KEY):</p>
    <div id="apiKey">${API_KEY}</div>

    <section class="section" aria-labelledby="uploadMusicLabel">
      <h2 id="uploadMusicLabel">Upload Music</h2>
      <form id="musicForm" enctype="multipart/form-data">
        <input type="file" name="music" accept="audio/*" required />
        <button type="submit">Upload Music</button>
      </form>
      <div id="musicFiles" class="file-list"></div>
    </section>

    <section class="section" aria-labelledby="uploadVideoLabel">
      <h2 id="uploadVideoLabel">Upload Video</h2>
      <form id="videoForm" enctype="multipart/form-data">
        <input type="file" name="video" accept="video/*" required />
        <button type="submit">Upload Video</button>
      </form>
      <div id="videoFiles" class="file-list"></div>
    </section>
  </main>

  <script>
    const musicForm = document.getElementById('musicForm');
    const videoForm = document.getElementById('videoForm');
    const musicFilesDiv = document.getElementById('musicFiles');
    const videoFilesDiv = document.getElementById('videoFiles');
    const apiKey = document.getElementById('apiKey').textContent;

    async function fetchFiles() {
      try {
        const res = await fetch('/api/files?apikey=' + encodeURIComponent(apiKey));
        if (!res.ok) throw new Error('Failed to fetch files, status '+ res.status);
        const data = await res.json();
        displayFiles(data.music, musicFilesDiv, '/uploads/music/');
        displayFiles(data.videos, videoFilesDiv, '/uploads/videos/');
      } catch(e) {
        console.error(e);
      }
    }

    function displayFiles(files, container, basePath) {
      if (!files.length) {
        container.innerHTML = '<p>No files uploaded yet.</p>';
        return;
      }
      container.innerHTML = '';
      files.forEach(file => {
        const a = document.createElement('a');
        a.href = basePath + encodeURIComponent(file);
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = file;
        a.className = 'file-link';
        const div = document.createElement('div');
        div.className = 'file-list-item';
        div.appendChild(a);
        container.appendChild(div);
      });
    }

    musicForm.addEventListener('submit', async e => {
      e.preventDefault();
      const formData = new FormData(musicForm);
      try {
        const res = await fetch('/upload/music', {
          method: 'POST',
          headers: { 'x-api-key': apiKey },
          body: formData
        });
        if (!res.ok) {
          const err = await res.text();
          alert('Upload failed: ' + err);
          return;
        }
        musicForm.reset();
        fetchFiles();
      } catch(err) {
        alert('Upload error');
        console.error(err);
      }
    });

    videoForm.addEventListener('submit', async e => {
      e.preventDefault();
      const formData = new FormData(videoForm);
      try {
        const res = await fetch('/upload/video', {
          method: 'POST',
          headers: { 'x-api-key': apiKey },
          body: formData
        });
        if (!res.ok) {
          const err = await res.text();
          alert('Upload failed: ' + err);
          return;
        }
        videoForm.reset();
        fetchFiles();
      } catch(err) {
        alert('Upload error');
        console.error(err);
      }
    });

    // Initial fetch of uploaded files
    fetchFiles();
  </script>
</body>
</html>`);
});

// Middleware to check API key for POST upload and API list
function checkApiKey(req, res, next) {
  const keyHeader = req.headers['x-api-key'];
  const keyQuery = req.query.apikey;
  if (keyHeader === API_KEY || keyQuery === API_KEY) {
    next();
  } else {
    res.status(401).send('Unauthorized: Invalid API key');
  }
}

// Upload endpoints for music and video
app.post('/upload/music', checkApiKey, upload.single('music'), (req, res) => {
  if (!req.file) return res.status(400).send('No music file uploaded');
  res.status(200).send('Music uploaded successfully');
});
app.post('/upload/video', checkApiKey, upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).send('No video file uploaded');
  res.status(200).send('Video uploaded successfully');
});

// API endpoint to list files by category
app.get('/api/files', checkApiKey, (req, res) => {
  try {
    const musicFiles = fs.readdirSync(MUSIC_DIR);
    const videoFiles = fs.readdirSync(VIDEO_DIR);
    res.json({
      music: musicFiles,
      videos: videoFiles
    });
  } catch (err) {
    res.status(500).send('Failed to list files');
  }
});

// Start server
const initializeServer = async () => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}. Ready to handle chat requests.`));
};

initializeServer();
