// server.js - Versi untuk Vercel + Cloudinary

const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;

// Ambil kunci rahasia dari Environment Variables (akan kita set di Vercel)
const API_KEY = process.env.API_KEY || 'local-fallback-key';

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
    // Tentukan folder berdasarkan fieldname ('music' atau 'video')
    const folder = file.fieldname === 'music' ? 'music' : 'videos';
    return {
      folder: folder,
      resource_type: 'auto', // Biarkan Cloudinary mendeteksi tipe file (audio/video)
      public_id: file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, ''),
    };
  },
});

const upload = multer({ storage });

// Hapus 'app.use('/uploads', ...)' karena file tidak lagi ada di server lokal

// Halaman Depan (Frontend)
app.get('/', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<!-- Frontend HTML Anda tetap sama di sini... -->
<!-- ... tapi kita perlu sedikit mengubah script-nya -->
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Simple Music & Video Repo (Vercel)</title>
<style> /* CSS Anda di sini */ </style>
</head>
<body>
  <main>
    <h1>Simple Music & Video Repository</h1>
    <p>Your API key (set in Vercel environment variables):</p>
    <div id="apiKey">${API_KEY}</div>
    <!-- ... sisa HTML form Anda ... -->
  </main>

  <script>
    // Script Anda, dengan sedikit modifikasi pada displayFiles
    const musicForm = document.getElementById('musicForm');
    // ... deklarasi variabel lain ...

    async function fetchFiles() {
      try {
        const res = await fetch('/api/files?apikey=' + encodeURIComponent(apiKey));
        if (!res.ok) throw new Error('Failed to fetch files');
        const data = await res.json();
        // Perubahan di sini: data sekarang berisi objek {name, url}
        displayFiles(data.music, musicFilesDiv);
        displayFiles(data.videos, videoFilesDiv);
      } catch(e) { console.error(e); }
    }

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
        a.textContent = file.name; // Tampilkan nama asli file
        a.className = 'file-link';
        const div = document.createElement('div');
        div.className = 'file-list-item';
        div.appendChild(a);
        container.appendChild(div);
      });
    }
    
    // ... sisa event listener form Anda (tidak perlu diubah) ...
    
    fetchFiles();
  </script>
</body>
</html>`);
});

function checkApiKey(req, res, next) {
    const keyHeader = req.headers['x-api-key'];
    const keyQuery = req.query.apikey;
    if (keyHeader === API_KEY || keyQuery === API_KEY) {
        next();
    } else {
        res.status(401).send('Unauthorized: Invalid API key');
    }
}

// Gunakan middleware upload yang sudah dikonfigurasi untuk Cloudinary
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
        const musicResult = await cloudinary.api.resources({ type: 'upload', resource_type: 'video', prefix: 'music/', max_results: 50 });
        const videoResult = await cloudinary.api.resources({ type: 'upload', resource_type: 'video', prefix: 'videos/', max_results: 50 });

        // Format data agar sesuai untuk frontend
        const musicFiles = musicResult.resources.map(file => ({ name: file.public_id.replace('music/', ''), url: file.secure_url }));
        const videoFiles = videoResult.resources.map(file => ({ name: file.public_id.replace('videos/', ''), url: file.secure_url }));

        res.json({ music: musicFiles, videos: videoFiles });
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to list files from cloud');
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
