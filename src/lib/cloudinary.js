const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

/**
 * Configure Cloudinary from environment variables or CLOUDINARY_URL
 */
function initCloudinary() {
    if (process.env.CLOUDINARY_URL) {
        return cloudinary;
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
        cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
            secure: true
        });
        return cloudinary;
    }

    return null;
}

/**
 * Checks if Cloudinary is configured
 */
function isCloudinaryConfigured() {
    return !!(
        process.env.CLOUDINARY_URL ||
        (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
    );
}

/**
 * Uploads a file buffer directly to Cloudinary
 * 
 * @param {Buffer} fileBuffer - The file in memory
 * @param {string} fileName - Original/unique file name
 * @param {string} mimeType - File mimetype
 * @param {string} folder - Destination folder on Cloudinary
 * @returns {Promise<{ secure_url: string, public_id: string, format: string }>}
 */
function uploadToCloudinary(fileBuffer, fileName, mimeType, folder = 'havoc_pilot_admit_cards') {
    return new Promise((resolve, reject) => {
        const cld = initCloudinary();
        if (!cld) {
            return reject(new Error('Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env'));
        }

        const isPdf = mimeType === 'application/pdf' || (fileName && fileName.toLowerCase().endsWith('.pdf'));
        const resourceType = isPdf ? 'raw' : 'image';

        const uploadStream = cld.uploader.upload_stream(
            {
                folder: folder,
                resource_type: resourceType,
                public_id: pathWithoutExt(fileName),
                use_filename: true,
                unique_filename: true
            },
            (error, result) => {
                if (error) {
                    console.error('[Cloudinary Upload Error]:', error);
                    return reject(error);
                }
                console.log(`[Cloudinary] File uploaded successfully: ${result.secure_url}`);
                resolve({
                    secure_url: result.secure_url,
                    public_id: result.public_id,
                    format: result.format
                });
            }
        );

        const stream = new Readable();
        stream.push(fileBuffer);
        stream.push(null);
        stream.pipe(uploadStream);
    });
}

function pathWithoutExt(fileName) {
    if (!fileName) return `file_${Date.now()}`;
    return fileName.replace(/\.[^/.]+$/, "");
}

module.exports = {
    isCloudinaryConfigured,
    uploadToCloudinary
};
