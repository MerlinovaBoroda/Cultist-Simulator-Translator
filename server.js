const express = require('express');
const fs = require('fs');
const archiver = require('archiver');
const path = require('path');
const app = express();
const PORT = 3000;

const ORIGINAL_DIR = path.join(__dirname, 'Original');
const UKRAINIAN_DIR = path.join(__dirname, 'Ukrainian');

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get list of JSON files
app.get('/files', (req, res) => {
    function getFiles(dir, relativePath = '') {
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            const filePath = path.join(dir, file);
            const relativeFilePath = path.join(relativePath, file);
            const stat = fs.statSync(filePath);
            if (stat && stat.isDirectory()) {
                results = results.concat(getFiles(filePath, relativeFilePath));
            } else if (file.endsWith('.json')) {
                results.push(relativeFilePath);
            }
        });
        return results;
    }
    res.json(getFiles(ORIGINAL_DIR));
});

// Read JSON file (original + Ukrainian version)
app.get('/file', (req, res) => {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'Missing file path' });
    
    const originalPath = path.join(ORIGINAL_DIR, filePath);
    const ukrainianPath = path.join(UKRAINIAN_DIR, filePath);
    
    if (!fs.existsSync(originalPath)) {
        return res.status(404).json({ error: 'Original file not found' });
    }
    
    let originalContent;
    let ukrainianContent;
    
    try {
        originalContent = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
    } catch (error) {
        return res.status(500).json({ error: 'Error parsing original JSON file' });
    }
    
    if (fs.existsSync(ukrainianPath)) {
        try {
            ukrainianContent = JSON.parse(fs.readFileSync(ukrainianPath, 'utf8'));
        } catch (error) {
            return res.status(500).json({ error: 'Error parsing Ukrainian JSON file' });
        }
    } else {
        ukrainianContent = { ...originalContent }; // Copy original if missing
        fs.writeFileSync(ukrainianPath, JSON.stringify(ukrainianContent, null, 2));
    }
    
    res.json({ original: originalContent, ukrainian: ukrainianContent });
});

// Save updated Ukrainian JSON file
app.post('/update', (req, res) => {
    const { filePath, newData } = req.body;
    if (!filePath || !newData) return res.status(400).json({ error: 'Missing data' });

    const ukrainianPath = path.join(UKRAINIAN_DIR, filePath);

    if (!fs.existsSync(ukrainianPath)) {
        return res.status(404).json({ error: 'Ukrainian file not found' });
    }

    try {
        fs.writeFileSync(ukrainianPath, JSON.stringify(newData, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error("Error writing file:", error);
        res.status(500).json({ error: 'Failed to write file' });
    }
});

app.get('/download-folder', (req, res) => {
    const folderPath = path.join(__dirname, 'Ukrainian');
    const output = fs.createWriteStream(path.join(__dirname, 'Ukrainian.zip'));

    const archive = archiver('zip', {
        zlib: { level: 9 }
    });

    archive.pipe(output);
    archive.directory(folderPath, false);
    archive.finalize();

    output.on('close', () => {
        res.download(path.join(__dirname, 'Ukrainian.zip'), 'Ukrainian.zip', (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(500).send({ error: 'Error during download' });
            } else {
                fs.unlinkSync(path.join(__dirname, 'Ukrainian.zip'));
            }
        });
    });

    archive.on('error', (err) => {
        console.error("Error creating archive:", error);
        res.status(500).send({ error: err.message });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
