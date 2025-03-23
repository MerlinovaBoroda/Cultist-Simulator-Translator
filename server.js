require('dotenv').config();
const express = require('express');
const fs = require('fs');
const archiver = require('archiver');
const Dropbox = require('dropbox').Dropbox;
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const PORT = 3000;

const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN, fetch });
// const dropboxFolderPath = '/CultistSimulatorTranslator/Ukrainian';
// const localFolderPath  = path.join(__dirname, 'Download');

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/files', async (req, res) => {
    try {
        
        const response = await dbx.filesListFolder({ path: '/CultistSimulatorTranslator/Original', recursive: true });

        // Filter only JSON files and format the response
        const jsonFiles = response.result.entries
            .filter(file => file[".tag"] === "file" && file.name.endsWith('.json'))
            .map(file => file.path_display.replace('/CultistSimulatorTranslator/Original/', ''));

        jsonFiles.sort();    
        res.json(jsonFiles);
    } catch (error) {
        console.error('Error fetching files from Dropbox:', error);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
});


// Read JSON file (original + Ukrainian version)
app.get('/file', async (req, res) => {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'Missing file path' });

    // Ensure filePath doesn't contain the base folder path again
    const baseOriginalPath = 'CultistSimulatorTranslator/Original/';
    const relativeFilePath = filePath.startsWith(baseOriginalPath) ? filePath.substring(baseOriginalPath.length) : filePath;

    const originalPath = `/CultistSimulatorTranslator/Original/${relativeFilePath}`;
    const ukrainianPath = `/CultistSimulatorTranslator/Ukrainian/${relativeFilePath}`;

    let originalContent;
    let ukrainianContent;

    try {
        // Read original file from Dropbox
        const originalResponse = await dbx.filesDownload({ path: originalPath });
        originalContent = JSON.parse(originalResponse.result.fileBinary.toString('utf8'));
    } catch (error) {
        console.error('Error reading original file:', error);
        return res.status(404).json({ error: 'Original file not found' });
    }

    try {
        // Try reading Ukrainian file from Dropbox
        const ukrainianResponse = await dbx.filesDownload({ path: ukrainianPath });
        ukrainianContent = JSON.parse(ukrainianResponse.result.fileBinary.toString('utf8'));
    } catch (error) {
        console.warn('Ukrainian file not found, creating a new one...');

        // If missing, create Ukrainian file with same content as original
        ukrainianContent = { ...originalContent };

        try {
            await dbx.filesUpload({
                path: ukrainianPath,
                contents: JSON.stringify(ukrainianContent, null, 2),
                mode: { '.tag': 'add' }, // Avoid overwriting
            });
        } catch (uploadError) {
            console.error('Error creating Ukrainian file:', uploadError);
            return res.status(500).json({ error: 'Error creating Ukrainian JSON file' });
        }
    }

    res.json({ original: originalContent, ukrainian: ukrainianContent });
});

// Save updated Ukrainian JSON file
app.post('/update', async (req, res) => {
    const { filePath, newData } = req.body;
    if (!filePath || !newData) return res.status(400).json({ error: 'Missing data' });

    const ukrainianPath = `/CultistSimulatorTranslator/Ukrainian/${filePath}`;

    try {
        // Upload the new data to Dropbox
        const uploadResponse = await dbx.filesUpload({
            path: ukrainianPath,
            contents: JSON.stringify(newData, null, 2),
            mode: { '.tag': 'overwrite' }, // Overwrite the file if it exists
        });

        console.log('File uploaded successfully:', uploadResponse);
        res.json({ success: true, message: 'File updated successfully on Dropbox' });
    } catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).json({ error: 'Failed to upload file to Dropbox' });
    }
});

// app.get('/download-folder', (req, res) => {
//     const folderPath = path.join(__dirname, 'Ukrainian');
//     const output = fs.createWriteStream(path.join(__dirname, 'Ukrainian.zip'));

//     const archive = archiver('zip', {
//         zlib: { level: 9 }
//     });

//     archive.pipe(output);
//     archive.directory(folderPath, false);
//     archive.finalize();

//     output.on('close', () => {
//         res.download(path.join(__dirname, 'Ukrainian.zip'), 'Ukrainian.zip', (err) => {
//             if (err) {
//                 console.error('Download error:', err);
//                 res.status(500).send({ error: 'Error during download' });
//             } else {
//                 fs.unlinkSync(path.join(__dirname, 'Ukrainian.zip'));
//             }
//         });
//     });

//     archive.on('error', (err) => {
//         console.error("Error creating archive:", error);
//         res.status(500).send({ error: err.message });
//     });
// });

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});