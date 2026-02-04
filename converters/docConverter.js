import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import util from 'util';

const execPromise = util.promisify(exec);

/**
 * Converts DOCX to PDF using LibreOffice (soffice).
 * Requires LibreOffice to be installed and in PATH.
 * @param {Buffer} buffer - Input DOCX buffer.
 * @returns {Promise<Buffer>} - PDF buffer.
 */
export async function convertDocxToPdf(buffer) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const tempDir = path.resolve(__dirname, '../temp');

    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    const timestamp = Date.now();
    const tempInput = path.join(tempDir, `input_${timestamp}.docx`);
    // LibreOffice places output in outdir with same basename.
    // We expect input_TIMESTAMP.pdf
    const tempOutput = path.join(tempDir, `input_${timestamp}.pdf`);

    fs.writeFileSync(tempInput, buffer);

    try {
        // Command to convert. Works on Linux (Render) and Windows (if in PATH)
        // On Windows, you might need to add full path to soffice.exe if not in PATH
        // --headless is required for server environments
        let command = `soffice --headless --convert-to pdf --outdir "${tempDir}" "${tempInput}"`;

        console.log(`Executing: ${command}`);
        await execPromise(command);

        if (fs.existsSync(tempOutput)) {
            const outputBuffer = fs.readFileSync(tempOutput);
            // Cleanup
            try {
                fs.unlinkSync(tempInput);
                fs.unlinkSync(tempOutput);
            } catch (e) { console.error("Cleanup warning:", e); }

            return outputBuffer;
        } else {
            throw new Error('PDF output file was not created by LibreOffice.');
        }

    } catch (err) {
        // Cleanup input if exists
        try {
            if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
        } catch (e) {
            console.error("Cleanup error:", e);
        }
        console.error("DOCX Conversion error:", err);
        throw new Error("Conversion failed. Please ensure LibreOffice is installed and 'soffice' is in your PATH.");
    }
}
