import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Converts media file to target format.
 * Since ffmpeg usually works with files, we'll write temp input and read temp output.
 * @param {Buffer} buffer - Input file buffer.
 * @param {string} inputExt - Input file extension (e.g., 'mp4').
 * @param {string} targetFormat - Target format (e.g., 'mp3').
 * @returns {Promise<Buffer>} - Converted file buffer.
 */
export async function convertMedia(buffer, inputExt, targetFormat) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const tempDir = path.resolve(__dirname, '../temp');

    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    const tempInput = path.join(tempDir, `input_${Date.now()}.${inputExt}`);
    const tempOutput = path.join(tempDir, `output_${Date.now()}.${targetFormat}`);

    // Write buffer to temp file
    fs.writeFileSync(tempInput, buffer);

    return new Promise((resolve, reject) => {
        ffmpeg(tempInput)
            .toFormat(targetFormat)
            .on('end', () => {
                try {
                    const outputBuffer = fs.readFileSync(tempOutput);
                    // Cleanup
                    fs.unlinkSync(tempInput);
                    fs.unlinkSync(tempOutput);
                    resolve(outputBuffer);
                } catch (e) {
                    reject(e);
                }
            })
            .on('error', (err) => {
                // Try cleanup
                if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
                if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
                console.error("FFmpeg error:", err);
                reject(err);
            })
            .save(tempOutput);
    });
}
