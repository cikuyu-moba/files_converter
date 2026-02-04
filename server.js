import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

// Import Converters
import { convertPdfToJpegs, convertImageToPdf } from './converters/pdfConverter.js';
import { convertImage } from './converters/imageConverter.js';
import { convertMedia } from './converters/avConverter.js';
import { convertDocxToPdf } from './converters/docConverter.js';

// ESM directory name shim
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Setup Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Serve static files
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Unified Upload Handler with STREAMING RESPONSE
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file uploaded.');

        const category = req.body.category;
        const targetFormat = req.body.format;
        const buffer = req.file.buffer;
        const originalName = req.file.originalname;
        const ext = path.extname(originalName).toLowerCase().replace('.', '');
        const baseName = path.basename(originalName, `.${ext}`);

        console.log(`Processing Stream: ${originalName} -> ${targetFormat}`);

        // 1. PDF -> JPG (Multiple Files -> ZIP)
        if (category === 'document' && ext === 'pdf' && targetFormat === 'jpg') {
            const images = await convertPdfToJpegs(buffer);

            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${baseName}_images.zip"`);

            const archive = archiver('zip', { zlib: { level: 9 } });

            archive.on('error', (err) => {
                throw err;
            });

            // Pipe archive data to the response
            archive.pipe(res);

            // Append each image buffer to the archive
            images.forEach((imgObj, index) => {
                const fileName = `${baseName}_page_${index + 1}${imgObj.ext}`;
                archive.append(imgObj.buffer, { name: fileName });
            });

            await archive.finalize();
            return;
        }

        // For Single File Outputs, we prepare buffer then send
        let resultBuffer;
        let outputFilename;
        let mimeType = 'application/octet-stream';

        if (category === 'document' && ext === 'docx' && targetFormat === 'pdf') {
            // DOCX -> PDF
            resultBuffer = await convertDocxToPdf(buffer);
            outputFilename = `${baseName}.pdf`;
            mimeType = 'application/pdf';

        } else if (category === 'image') {
            if (targetFormat === 'pdf') {
                // Image -> PDF
                resultBuffer = await convertImageToPdf(buffer);
                outputFilename = `${baseName}.pdf`;
                mimeType = 'application/pdf';
            } else {
                // Image -> Image
                resultBuffer = await convertImage(buffer, targetFormat);
                outputFilename = `${baseName}.${targetFormat}`;
                mimeType = `image/${targetFormat}`;
            }

        } else if (category === 'av') {
            // Audio/Video
            resultBuffer = await convertMedia(buffer, ext, targetFormat);
            outputFilename = `${baseName}.${targetFormat}`;
            // Simplified mime mapping
            if (['mp3', 'wav'].includes(targetFormat)) mimeType = `audio/${targetFormat}`;
            else if (['mp4'].includes(targetFormat)) mimeType = `video/${targetFormat}`;
            else mimeType = 'application/octet-stream';
        } else {
            return res.status(400).send('Unsupported combination.');
        }

        // Send Single File
        if (resultBuffer) {
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
            res.send(resultBuffer);
        } else {
            res.status(500).send('Conversion produced no output.');
        }

    } catch (error) {
        console.error('Error processing upload:', error);
        if (!res.headersSent) {
            res.status(500).send('Error during conversion: ' + error.message);
        }
    }
});

const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT. Closing server...');
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
