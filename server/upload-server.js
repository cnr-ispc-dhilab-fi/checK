// server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

const app = express();
const PORT = 3001;

// Cartella base uploads
const uploadBaseDir = path.join(__dirname, 'uploads');
const glbDir   = path.join(uploadBaseDir, 'glb');
const thumbDir = path.join(uploadBaseDir, 'thumb');
// Unico JSON con tutti i metadati
const metadataFile = path.join(uploadBaseDir, 'upload.json');

// Creiamo le cartelle se non esistono
[uploadBaseDir, glbDir, thumbDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configurazione Multer: sceglie la sotto-cartella in base al campo
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'glb') {
      cb(null, glbDir);
    } else if (file.fieldname === 'thumb') {
      cb(null, thumbDir);
    } else {
      cb(null, uploadBaseDir);
    }
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${timestamp}_${safeName}`);
  }
});

const upload = multer({ storage });

// CORS per sviluppo
app.use(cors());

// Serviamo tutto /uploads come /files
app.use('/files', express.static(uploadBaseDir));

// Endpoint di test
app.get('/', (req, res) => {
  res.send('Upload server attivo');
});

/**
 * Endpoint "semplice" /upload (se vuoi tenerlo per altri usi)
 */
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nessun file caricato' });
  }

  const fileUrl = `/files/${req.file.filename}`;

  res.json({
    message: 'File caricato con successo',
    field: req.file.fieldname,
    filename: req.file.filename,
    originalname: req.file.originalname,
    path: req.file.path,
    url: fileUrl
  });
});

/**
 * Endpoint per:
 *  - glb (campo "glb" → uploads/glb)
 *  - thumbnail (campo "thumb" → uploads/thumb)
 * e aggiorna un unico upload.json con struttura:
 * {
 *   "id1": { "glb": {...}, "thumb": {...} },
 *   "id2": { "glb": {...}, "thumb": {...} }
 * }
 */
app.post(
  '/upload-model',
  upload.fields([
    { name: 'glb',   maxCount: 1 },
    { name: 'thumb', maxCount: 1 }
  ]),
  (req, res) => {
    const glbFile   = req.files['glb']   ? req.files['glb'][0]   : null;
    const thumbFile = req.files['thumb'] ? req.files['thumb'][0] : null;

    if (!glbFile && !thumbFile) {
      return res.status(400).json({ error: 'Nessun file ricevuto' });
    }

    // ID passato dal frontend (FormData.append('id', ...))
    const itemId = (req.body.id && req.body.id.trim()) || Date.now().toString();

    const entry = {};

    if (glbFile) {
      entry.glb = {
        filename: glbFile.filename,
        originalname: glbFile.originalname,
        url: `/files/glb/${glbFile.filename}`,
        path: glbFile.path
      };
    }

    if (thumbFile) {
      entry.thumb = {
        filename: thumbFile.filename,
        originalname: thumbFile.originalname,
        url: `/files/thumb/${thumbFile.filename}`,
        path: thumbFile.path
      };
    }

    // Leggi e aggiorna l'unico JSON
    updateMetadata(itemId, entry, (err, fullMetadata) => {
      if (err) {
        console.error('Errore nel salvataggio di upload.json:', err);
        return res.status(500).json({
          message: 'Upload eseguito, ma errore nel salvataggio del JSON',
          id: itemId,
          entry
        });
      }

      res.json({
        message: 'Upload eseguito',
        id: itemId,
        entry: fullMetadata[itemId] || entry
      });
    });
  }
);

// DELETE /asset/:id → cancella glb, thumb, e voce da upload.json
app.delete('/asset/:id', async (req, res) => {
  const itemId = req.params.id;

  try {
    const result = await deleteAssetById(itemId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.reason || 'Elemento non trovato'
      });
    }

    res.json({
      success: true,
      message: `Asset ${itemId} cancellato`
    });
  } catch (err) {
    console.error('Errore durante deleteAssetById:', err);
    res.status(500).json({
      success: false,
      message: 'Errore interno durante la cancellazione'
    });
  }
});

// Funzione di utilità: legge/aggiorna upload.json
function updateMetadata(itemId, entry, callback) {
  // Leggi il file esistente (se c'è)
  fs.readFile(metadataFile, 'utf8', (err, data) => {
    let metadata = {};

    if (!err && data) {
      try {
        metadata = JSON.parse(data);
      } catch (parseErr) {
        console.warn('upload.json danneggiato o vuoto, lo rigenero:', parseErr);
        metadata = {};
      }
    }

    // aggiorna/crea la voce per l'ID
    metadata[itemId] = {
      ...(metadata[itemId] || {}),
      ...entry
    };

    fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2), 'utf8', (writeErr) => {
      if (writeErr) return callback(writeErr);
      callback(null, metadata);
    });
  });
}

async function deleteAssetById(itemId) {
  // Leggi upload.json
  let metadata = {};
  try {
    const data = await fsPromises.readFile(metadataFile, 'utf8');
    if (data) {
      metadata = JSON.parse(data);
    }
  } catch (err) {
    // Se il file non esiste, niente da cancellare
    if (err.code === 'ENOENT') {
      return { success: false, reason: 'upload.json non trovato' };
    }
    throw err;
  }

  const entry = metadata[itemId];
  if (!entry) {
    return { success: false, reason: 'ID non presente in upload.json' };
  }

  const filesToDelete = [];

  if (entry.glb && entry.glb.path) {
    filesToDelete.push(entry.glb.path);
  }
  if (entry.thumb && entry.thumb.path) {
    filesToDelete.push(entry.thumb.path);
  }

  // Cancella i file (ignora ENOENT)
  for (const filePath of filesToDelete) {
    try {
      await fsPromises.unlink(filePath);
      console.log('File cancellato:', filePath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.warn('Errore cancellando file:', filePath, err);
      }
    }
  }

  // Rimuovi l'entry dal JSON
  delete metadata[itemId];

  await fsPromises.writeFile(metadataFile, JSON.stringify(metadata, null, 2), 'utf8');
  return { success: true };
}

// Avvio server
app.listen(PORT, () => {
  console.log(`Upload server in ascolto su http://localhost:${PORT}`);
});
