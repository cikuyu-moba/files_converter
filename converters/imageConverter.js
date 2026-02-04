import sharp from 'sharp';

/**
 * Converts image buffer to target format.
 * @param {Buffer} buffer - Input image buffer.
 * @param {string} format - Target format (jpeg, png, webp).
 * @returns {Promise<Buffer>} - Converted image buffer.
 */
export async function convertImage(buffer, format) {
    try {
        // Map common extensions to sharp format names
        const targetFormat = format.toLowerCase();
        let sharpFormat = targetFormat;
        if (targetFormat === 'jpg') sharpFormat = 'jpeg';

        return await sharp(buffer)
            .toFormat(sharpFormat)
            .toBuffer();
    } catch (err) {
        console.error("Image Conversion failed:", err);
        throw err;
    }
}
