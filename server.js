// server.js (VERSI LENGKAP & FINAL UNTUK VERCEL)

const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;

// Ambil kunci rahasia dari Environment Variables Vercel
const API_KEY = process.env.API_KEY || 'kunci-lokal-jika-perlu';

// Konfigurasi Cloudinary dari Environment Variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Konfigurasi storage Multer untuk mengupload ke Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    // Tentukan folder di Cloudinary berdasarkan fieldname ('music' atau 'video')
    const folder = file.fieldname === 'music' ? 'music' : 'videos';
    const safeName = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    return {
      folder: folder,
      resource_type: 'auto', // Biarkan Cloudinary mendeteksi tipe file (audio/video)
      public_id: Date.now() + '-' + safeName, // Nama unik untuk file
    };
  },
});

const upload = multer({ storage });

// Middleware untuk cek API Key
function checkApiKey(req, res, next) {
    const keyHeader = req.headers['x-api-key'];
    const keyQuery = req.query.apikey;
    if (keyHeader === API_KEY || keyQuery === API_KEY) {
        next();
    } else {
        res.status(401).send('Unauthorized: Invalid API key');
    }
}

// Halaman Depan dengan HTML LENGKAP
app.get('/', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Simple Music & Video Repo</title>
<style>
  body {
    font-family: system-ui, sans-serif; background: #fff; color: #374151; margin: 0; padding: 0; min-height: 100vh;
    display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
  }
  main { max-width: 600px; width: 100%; padding: 2rem; }
  h1 { font-weight: 700; font-size: 2rem; margin-bottom: 0.5rem; }
  label { display: block; margin-top: 1.25rem; font-weight: 600; }
  input[type="file"] { margin-top: 0.25rem; }
  button {
    margin-top: 0.75rem; padding: 0.5rem 1.25rem; font-weight: 600; background: #111827; color: #fff;
    border: none; border-radius: 6px; cursor: pointer; transition: background-color 0.3s ease;
  }
  button:hover { background: #374151; }
  #apiKey {
    margin-top: 1rem; padding: 0.5rem 0; font-family: monospace; background: #f3f4f6;
    border-radius: 6px; text-align: center; user-select: all; word-break: break-all;
  }
  .section { margin-top: 2rem; }
  .file-list { margin-top: 1rem; border-top: 1px solid #e5e7eb; padding-top: 1rem; }
  .file-list-item { margin-bottom: 0.75rem; word-break: break-all; }
  a.file-link { color: #2563eb; text-decoration: none; }
  a.file-link:hover { text-decoration: underline; }
</style>
</head>
<body>
  <main>
    <h1>Simple Music & Video Repository</h1>
    <p>Your API key (set in Vercel environment variables):</p>
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
        displayFiles(data.music, musicFilesDiv);
        displayFiles(data.videos, videoFilesDiv);
      } catch(e) {
        console.error(e);
      }
    }

    // FUNGSI INI DIUBAH untuk menangani respons dari Cloudinary
    function displayFiles(files, container) {
      if (!files || !files.length) {
        container.innerHTML = '<p>No files uploaded yet.</p>';
        return;
      }
      container.innerHTML = '';
      files.forEach(file => {
        const a = document.createElement('a');
        a.href = file.url; // Gunakan URL dari Cloudinary
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = file.name; // Tampilkan nama file
        a.className = 'file-link';
        const div = document.createElement('div');
        div.className = 'file-list-item';
        div.appendChild(a);
        container.appendChild(div);
      });
    }

    async function handleFormSubmit(e, form) {
        e.preventDefault();
        const button = form.querySelector('button');
        button.disabled = true;
        button.textContent = 'Uploading...';
        
        const formData = new FormData(form);
        const endpoint = form.id === 'musicForm' ? '/upload/music' : '/upload/video';
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'x-api-key': apiKey },
                body: formData
            });
            if (!res.ok) {
                const err = await res.text();
                throw new Error('Upload failed: ' + err);
            }
            form.reset();
            fetchFiles();
        } catch(err) {
            alert(err.message);
            console.error(err);
        } finally {
            button.disabled = false;
            button.textContent = form.id === 'musicForm' ? 'Upload Music' : 'Upload Video';
        }
    }

    musicForm.addEventListener('submit', e => handleFormSubmit(e, musicForm));
    videoForm.addEventListener('submit', e => handleFormSubmit(e, videoForm));

    fetchFiles();
  </script>
</body>
</html>`);
});


// Endpoint upload untuk music dan video
app.post('/upload/music', checkApiKey, upload.single('music'), (req, res) => {
  if (!req.file) return res.status(400).send('No music file uploaded');
  res.status(200).json({ message: 'Music uploaded successfully', url: req.file.path });
});
app.post('/upload/video', checkApiKey, upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).send('No video file uploaded');
  res.status(200).json({ message: 'Video uploaded successfully', url: req.file.path });
});

// API endpoint untuk mengambil daftar file dari Cloudinary
app.get('/api/files', checkApiKey, async (req, res) => {
  try {
    // Cari resource di Cloudinary dengan prefix folder yang sesuai
    const musicResult = await cloudinary.api.resources({ type: 'upload', resource_type: 'video', prefix: 'music/', max_results: 100 });
    const videoResult = await cloudinary.api.resources({ type: 'upload', resource_type: 'video', prefix: 'videos/', max_results: 100 });

    // Format data agar sesuai untuk frontend
    const musicFiles = musicResult.resources.map(file => ({ name: file.public_id.replace('music/', ''), url: file.secure_url }));
    const videoFiles = videoResult.resources.map(file => ({ name: file.public_id.replace('videos/', ''), url: file.secure_url }));

    res.json({ music: musicFiles, videos: videoFiles });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to list files from cloud');
  }
});

// Jalankan server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
