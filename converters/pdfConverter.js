import { PDFDocument } from 'pdf-lib';
import { createCanvas, Image } from 'canvas';
import pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import path from 'path';
import { fileURLToPath } from 'url';

const { getDocument } = pdfjsLib;

// Polyfill Image for pdf.js
global.Image = Image;

// ... existing code ...

export async function convertImageToPdf(imageBuffer) {
    try {
        const pdfDoc = await PDFDocument.create();

        let image;
        // Try embedding as JPG first, if fail try PNG
        try {
            image = await pdfDoc.embedJpg(imageBuffer);
        } catch (e) {
            image = await pdfDoc.embedPng(imageBuffer);
        }

        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
        });

        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);
    } catch (err) {
        console.error("Image to PDF failed:", err);
        throw err;
    }
}


class NodeCanvasFactory {
    create(width, height) {
        const canvas = createCanvas(width, height);
        const context = canvas.getContext("2d");
        return {
            canvas: canvas,
            context: context,
        };
    }
    reset(canvasAndContext, width, height) {
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
    }
    destroy(canvasAndContext) {
        canvasAndContext.canvas = null;
        canvasAndContext.context = null;
    }
}

export async function convertPdfToJpegs(dataBuffer) {
    try {
        const data = new Uint8Array(dataBuffer);
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        // Fix for pdfjs-dist v3 loading on Windows
        // In this structure, we are in 'converters/', so node_modules is one level up
        const rootDir = path.resolve(__dirname, '../');

        const standardFontDataUrl = (path.join(rootDir, 'node_modules/pdfjs-dist/standard_fonts/') + path.sep).replace(/\\/g, '/');
        const cMapUrl = (path.join(rootDir, 'node_modules/pdfjs-dist/cmaps/') + path.sep).replace(/\\/g, '/');

        const loadingTask = getDocument({
            data: data,
            cMapUrl: cMapUrl,
            cMapPacked: true,
            standardFontDataUrl: standardFontDataUrl,
        });

        const pdfDocument = await loadingTask.promise;
        const images = [];

        for (let i = 1; i <= pdfDocument.numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvasFactory = new NodeCanvasFactory();
            const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
            const context = canvasAndContext.context;

            // White background
            context.fillStyle = 'white';
            context.fillRect(0, 0, viewport.width, viewport.height);

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
                canvasFactory: canvasFactory,
            };

            await page.render(renderContext).promise;

            const imageBuffer = canvasAndContext.canvas.toBuffer('image/jpeg', { quality: 0.95 });
            images.push({
                buffer: imageBuffer,
                ext: '.jpg'
            });

            page.cleanup();
        }
        return images; // Returns array of { buffer, ext }
    } catch (err) {
        console.error("PDF Conversion failed:", err);
        throw err;
    }
}
