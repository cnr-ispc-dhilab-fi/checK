// thumbnail-server.js
const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();
const PORT = 8083; // deve corrispondere all'URL nel fetch

// Abilita CORS per permettere richieste da ATON (es. http://localhost:3000 o 8080)
app.use(cors());

// Cartella dove salvare le thumbnail (per ora neutra, il path lo sistemiamo poi)
const thumbnailsDir = path.join(__dirname, 'thumbnails'); 

if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
}

// Configurazione multer per salvare il file su disco
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, thumbnailsDir);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // mantieni il nome ricevuto dal client
    }
});

const upload = multer({ storage });

// Endpoint per ricevere la thumbnail
app.post('/api/thumbnails', upload.single('thumbnail'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('Nessun file ricevuto');
    }

    console.log('Thumbnail salvata in:', req.file.path);

    res.json({
        success: true,
        filename: req.file.filename,
        path: req.file.path
    });
});

// Avvio del server
app.listen(PORT, () => {
    console.log('Thumbnail server in ascolto su http://localhost:' + PORT);
});
