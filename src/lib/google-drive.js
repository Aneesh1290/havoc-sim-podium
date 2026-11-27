const { google } = require('googleapis');
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/drive'];

/**
 * Initializes and returns an authenticated Google Drive client using GoogleAuth
 */
function getDriveClient() {
    let keyFilePath = null;

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        keyFilePath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    } else {
        const defaultLocalKey = path.join(__dirname, '..', '..', 'google-key.json');
        if (fs.existsSync(defaultLocalKey)) {
            keyFilePath = defaultLocalKey;
        }
    }

    if (!keyFilePath || !fs.existsSync(keyFilePath)) {
        return null;
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: SCOPES
    });

    return google.drive({ version: 'v3', auth });
}

/**
 * Gets the designated Google Drive Folder ID
 */
function getGoogleDriveFolderId() {
    return process.env.GOOGLE_DRIVE_FOLDER_ID || '1u2JMwhUM1ZZDB3FbBU-mKTdw_fqEhxbT';
}

/**
 * Checks if Google Drive integration is ready
 */
function isGoogleDriveConfigured() {
    const drive = getDriveClient();
    return !!drive;
}

/**
 * Uploads a file buffer directly to Google Drive
 * 
 * @param {Buffer} fileBuffer - The file buffer in memory
 * @param {string} fileName - Destination file name
 * @param {string} mimeType - File mimetype
 * @returns {Promise<{ fileId: string, webViewLink: string, success: boolean }>}
 */
async function uploadToGoogleDrive(fileBuffer, fileName, mimeType) {
    const drive = getDriveClient();
    const folderId = getGoogleDriveFolderId();

    if (!drive || !folderId) {
        throw new Error('Google Drive client or Folder ID not configured');
    }

    const bufferStream = new Readable();
    bufferStream.push(fileBuffer);
    bufferStream.push(null);

    const fileMetadata = {
        name: fileName,
        parents: [folderId]
    };

    const media = {
        mimeType: mimeType || 'application/octet-stream',
        body: bufferStream
    };

    const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink'
    });

    const file = response.data;
    console.log(`[Google Drive] File uploaded successfully to folder "${folderId}". File ID: ${file.id}`);

    return {
        success: true,
        fileId: file.id,
        webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
        webContentLink: file.webContentLink
    };
}

/**
 * Streams file content from Google Drive for private admin viewing
 * 
 * @param {string} fileId - The Google Drive file ID
 * @returns {Promise<ReadableStream>}
 */
async function getGoogleDriveFileStream(fileId) {
    const drive = getDriveClient();
    if (!drive) throw new Error('Google Drive client not configured');

    const res = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
    );

    return res.data;
}

module.exports = {
    isGoogleDriveConfigured,
    getGoogleDriveFolderId,
    uploadToGoogleDrive,
    getGoogleDriveFileStream
};
