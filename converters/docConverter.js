import docxConverter from 'docx-pdf';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Converts DOCX to PDF using docx-pdf (requires MS Word/Office).
 * @param {Buffer} buffer - Input DOCX buffer.
 * @returns {Promise<Buffer>} - PDF buffer.
 */
export async function convertDocxToPdf(buffer) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const tempDir = path.resolve(__dirname, '../temp');

    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    const tempInput = path.join(tempDir, `input_${Date.now()}.docx`);
    const tempOutput = path.join(tempDir, `output_${Date.now()}.pdf`);

    fs.writeFileSync(tempInput, buffer);

    return new Promise((resolve, reject) => {
        docxConverter(tempInput, tempOutput, (err, result) => {
            if (err) {
                console.error("DOCX Conversion error:", err);
                // Cleanup input on error
                if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
                reject(err);
                return;
            }

            try {
                const outputBuffer = fs.readFileSync(tempOutput);
                // Cleanup
                fs.unlinkSync(tempInput);
                fs.unlinkSync(tempOutput);
                resolve(outputBuffer);
            } catch (e) {
                reject(e);
            }
        });
    });
}
