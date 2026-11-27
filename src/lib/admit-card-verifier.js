const crypto = require('crypto');
const Tesseract = require('tesseract.js');
let pdfParse = null;
try {
    pdfParse = require('pdf-parse');
} catch (e) {
    console.warn('[AdmitCardVerifier] pdf-parse not available, falling back to regex scanner');
}

let Jimp = null;
try {
    const jimpPkg = require('jimp');
    Jimp = jimpPkg.Jimp || jimpPkg;
} catch (e) {
    console.warn('[AdmitCardVerifier] Jimp not available:', e.message);
}

/**
 * Normalizes document identifier extracted from admit card:
 * Strips whitespace, special chars, uppercase only
 */
function normalizeIdentifier(rawId) {
    if (!rawId) return '';
    return String(rawId).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Computes deterministic SHA-256 hash of normalized document identifier
 */
function hashIdentifier(normalizedId) {
    return crypto.createHash('sha256').update(normalizedId).digest('hex');
}

/**
 * Compute Levenshtein distance between two strings
 */
function levenshteinDistance(s1, s2) {
    const m = s1.length, n = s2.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[m][n];
}

/**
 * Match an entered name token against words found in document OCR text
 * Allows tolerance for single-character or two-character OCR distortions on blurry photos
 */
function matchNameTokenFuzzy(token, docWords) {
    if (docWords.includes(token)) return true;
    for (const word of docWords) {
        if (Math.abs(word.length - token.length) <= 1) {
            const dist = levenshteinDistance(token, word);
            const maxAllowed = token.length <= 4 ? 1 : 2;
            if (dist <= maxAllowed) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Quick text scanner across buffer to find strings (ASCII and basic UTF-8/UTF-16)
 */
function extractAsciiStrings(buffer) {
    const textPieces = [];
    let current = [];
    for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i];
        if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
            current.push(String.fromCharCode(byte));
        } else {
            if (current.length >= 3) {
                textPieces.push(current.join(''));
            }
            current = [];
        }
    }
    if (current.length >= 3) {
        textPieces.push(current.join(''));
    }
    return textPieces.join(' ');
}

/**
 * Extract text from PDF buffer using pdf-parse with fallback
 */
async function extractPdfText(buffer) {
    if (pdfParse) {
        try {
            const data = await pdfParse(buffer);
            if (data && data.text && data.text.trim().length > 10) {
                return data.text;
            }
        } catch (err) {
            console.warn('[AdmitCardVerifier] pdf-parse error, falling back:', err.message);
        }
    }

    const rawStr = buffer.toString('binary');
    const chunks = [];
    const literalMatches = rawStr.match(/\(([^()]{2,150})\)/g);
    if (literalMatches) {
        literalMatches.forEach(m => {
            const inner = m.substring(1, m.length - 1);
            chunks.push(inner);
        });
    }
    chunks.push(extractAsciiStrings(buffer));
    return chunks.join(' ');
}

/**
 * Multi-pass OCR for images:
 * Pass 1: Raw image recognition
 * Pass 2: Upscaled (2x-2.5x), greyscaled, normalized, high-contrast enhanced image (salvages blurry/low-res photos)
 */
async function extractImageTextWithEnhancement(imageBuffer) {
    let combinedText = '';

    // Pass 1: standard OCR
    try {
        const res1 = await Tesseract.recognize(imageBuffer, 'eng');
        if (res1 && res1.data && res1.data.text) {
            combinedText += '\n' + res1.data.text;
        }
    } catch (e1) {
        console.warn('[AdmitCardVerifier] Standard OCR pass failed:', e1.message);
    }

    // Pass 2: Enhanced image via Jimp (upscaling, greyscale, contrast, normalize)
    if (Jimp) {
        try {
            const img = await Jimp.read(imageBuffer);
            const origW = img.bitmap.width;
            // Scale up if width is under 1800px to sharpen blurry characters
            const scaleFactor = origW < 1200 ? 2.5 : (origW < 1800 ? 1.8 : 1.2);
            img.resize({ w: Math.round(origW * scaleFactor) });
            img.greyscale();
            img.contrast(0.25);
            img.normalize();

            const enhancedBuf = await img.getBuffer('image/png');
            const res2 = await Tesseract.recognize(enhancedBuf, 'eng');
            if (res2 && res2.data && res2.data.text) {
                combinedText += '\n' + res2.data.text;
            }
        } catch (e2) {
            console.warn('[AdmitCardVerifier] Enhanced Jimp OCR pass failed:', e2.message);
        }
    }

    if (!combinedText.trim()) {
        combinedText = extractAsciiStrings(imageBuffer);
    }

    return combinedText;
}

/**
 * Automated Admit Card Verification
 * Supports both digital PDFs and photo/scanned images (JPEG, PNG, WebP) via OCR.
 * Checks candidate name against extracted document text with fuzzy tolerance.
 * Provides distinct feedback when image is too blurry to read.
 */
async function verifyAdmitCardDocument(fileBuffer, mimeType, originalName, userProvidedRollNo = null, enteredName = null) {
    const isPdf = (mimeType === 'application/pdf') || (originalName && originalName.toLowerCase().endsWith('.pdf'));
    const isImage = (mimeType && mimeType.startsWith('image/')) ||
        (originalName && /\.(png|jpe?g|webp|bmp)$/i.test(originalName));

    if (!isPdf && !isImage) {
        return {
            isValid: false,
            error: 'Invalid file format. Please upload a PDF or an Image (JPG, PNG) of your Pilot Admit Card.'
        };
    }

    let textContent = '';

    if (isPdf) {
        const header = fileBuffer.slice(0, 5).toString('ascii');
        if (!header.startsWith('%PDF')) {
            return {
                isValid: false,
                error: 'The uploaded file does not appear to be a valid PDF document.'
            };
        }
        textContent = await extractPdfText(fileBuffer);
    } else {
        textContent = await extractImageTextWithEnhancement(fileBuffer);
    }

    const upperText = (textContent || '').toUpperCase();

    // Key identifying markers for Pilot Exam Admit Card (DGCA / Airline / Pilot Examination)
    const requiredTitleKeywords = [
        'ADMIT CARD',
        'HALL TICKET',
        'EXAMINATION ADMIT',
        'PROVISIONAL ADMIT CARD',
        'EXAMINATION CALL LETTER',
        'CENTRAL EXAMINATION',
        'PILOT LICENCE'
    ];

    const pilotContextKeywords = [
        'PILOT',
        'DGCA',
        'CIVIL AVIATION',
        'CPL',
        'ATPL',
        'PPL',
        'AIR REGULATION',
        'AVIATION METEOROLOGY',
        'AIR NAVIGATION',
        'TECHNICAL GENERAL',
        'TECHNICAL SPECIFIC',
        'FLIGHT CREW',
        'COMMERCIAL PILOT',
        'DIRECTORATE GENERAL',
        'PARIKSHA'
    ];

    const hasAdmitCardMarker = requiredTitleKeywords.some(kw => upperText.includes(kw));
    const hasPilotMarker = pilotContextKeywords.some(kw => upperText.includes(kw));

    // Blurry / unreadable document detection
    if (upperText.trim().length < 25 || (!hasAdmitCardMarker && !hasPilotMarker)) {
        return {
            isValid: false,
            error: 'The uploaded image appears blurry, low-resolution, or unreadable. Please upload a clearer photo or the original PDF of your official Pilot Admit Card.'
        };
    }

    if (!hasAdmitCardMarker) {
        return {
            isValid: false,
            error: 'Uploaded document is missing "Admit Card" header. If the image is blurry, please upload a clearer photo or PDF.'
        };
    }

    if (!hasPilotMarker) {
        return {
            isValid: false,
            error: 'Uploaded document is not a recognized DGCA Pilot examination admit card.'
        };
    }

    // Look for identifier patterns in OCR/PDF text:
    let rawIdentifier = null;

    const idRegexes = [
        // 1. Roll number patterns including OCR typo variations (e.g. "Mall Namber", "Roil Number", "Roll No")
        /(?:(?:ROLL|ROIL|R0LL|MALL|POLL)\s*(?:NO|NUMBER|NAMBER|NUMSER|#)?\s*[:.-]?\s*\[?\s*)([A-Z0-9\/-]{5,25})/i,
        
        // 2. Computer number pattern (e.g. "Computer No", "Computer Numser")
        /(?:(?:COMPUTER|COMPUTOR)\s*(?:NO|NUMBER|NAMBER|NUMSER|#)?\s*[:.-]?\s*\[?\s*)([A-Z0-9\/-]{5,25})/i,
        
        // 3. Registration / Application / Candidate ID
        /(?:(?:REGISTRATION|APPLICATION|CANDIDATE)\s*(?:ID|NO|NUMBER|NAMBER|NUMSER)?\s*[:.-]?\s*\[?\s*)([A-Z0-9\/-]{5,25})/i,
        
        // 4. Standard DGCA Computer Number (e.g. P-18459173 or P17453579)
        /\b(P[- ]?\d{6,10})\b/i,
        
        // 5. 7 to 9 digit numeric Roll Number (standard Indian DGCA roll number format e.g. 30250062, 40319482)
        /\b(\d{7,9})\b/
    ];

    const commonEnglishWords = new Set([
        'DATE', 'NAME', 'TIME', 'VENUE', 'CENTRE', 'CENTER', 'DETAILS', 'NUMBER', 'CATEGORY',
        'QPREF', 'PAPER', 'SUBJECT', 'WILL', 'WITH', 'FROM', 'THIS', 'THAT', 'THEIR', 'THEY',
        'CANDIDATE', 'EXAMINATION', 'INSTRUCTION', 'INSTRUCTIONS', 'FAILURE', 'APPEAR', 'REPORT'
    ]);

    for (const re of idRegexes) {
        const m = upperText.match(re);
        if (m && m[1]) {
            const candidate = m[1].replace(/[^A-Z0-9\/-]/g, '').trim();
            const hasDigit = /\d/.test(candidate);
            if (candidate.length >= 5 && hasDigit && !commonEnglishWords.has(candidate)) {
                rawIdentifier = candidate;
                break;
            }
        } else if (m && m[0]) {
            const candidate = m[0].replace(/[^A-Z0-9\/-]/g, '').trim();
            const hasDigit = /\d/.test(candidate);
            if (candidate.length >= 5 && hasDigit && !commonEnglishWords.has(candidate)) {
                rawIdentifier = candidate;
                break;
            }
        }
    }

    if (!rawIdentifier && userProvidedRollNo) {
        const cleanUserRoll = String(userProvidedRollNo).trim();
        if (cleanUserRoll.length >= 4) {
            rawIdentifier = cleanUserRoll;
        }
    }

    // Name verification check with fuzzy distance tolerance (handles blurry letters like B/S, O/D, etc.)
    if (enteredName && typeof enteredName === 'string') {
        const cleanEntered = enteredName
            .replace(/^(CAPT\.?|CAPTAIN|MR\.?|MS\.?|MRS\.?)\s+/i, '')
            .trim()
            .toUpperCase();

        const nameTokens = cleanEntered
            .split(/[\s,.-]+/)
            .filter(t => t.length >= 2);

        if (nameTokens.length > 0) {
            const docWords = upperText
                .replace(/[^A-Z0-9\s]/g, ' ')
                .split(/\s+/)
                .filter(w => w.length >= 2);

            // Check how many parts of the entered name are present (with fuzzy tolerance)
            const matchedTokens = nameTokens.filter(token => matchNameTokenFuzzy(token, docWords));

            // For multi-word names, require at least 1 key word (if 2 words) or 2 words (if 3+ words)
            const minRequiredMatches = nameTokens.length === 1 ? 1 : (nameTokens.length === 2 ? 1 : 2);
            const isNameFound = matchedTokens.length >= minRequiredMatches;

            if (!isNameFound) {
                return {
                    isValid: false,
                    error: `The entered name ("${enteredName}") could not be verified on the uploaded admit card. Please ensure your name matches the admit card, or upload a clearer, unblurred photo/PDF.`
                };
            }
        }
    }

    // Fallback identifier if text is heavily redacted
    if (!rawIdentifier) {
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex').substring(0, 16).toUpperCase();
        rawIdentifier = `DOC-${fileHash}`;
    }

    const normalizedId = normalizeIdentifier(rawIdentifier);
    const docHash = hashIdentifier(normalizedId);

    return {
        isValid: true,
        rawIdentifier,
        normalizedId,
        docHash,
        documentType: 'PILOT_ADMIT_CARD',
        detectedMarkers: {
            hasAdmitCardMarker,
            hasPilotMarker,
            extractedTextSnippet: upperText.substring(0, 150)
        }
    };
}

module.exports = {
    normalizeIdentifier,
    hashIdentifier,
    verifyAdmitCardDocument
};
