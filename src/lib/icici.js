const crypto = require('crypto');

function generateIciciHash(payload, secretKey) {
    const key = secretKey || process.env.ICICI_SECRET_KEY || 'db06cca0-838b-4e01-8b20-6ac446ffb6bd';
    const sortedKeys = Object.keys(payload).sort();
    let plainText = '';
    for (const k of sortedKeys) {
        if (k !== 'secureHash' && payload[k] !== null && payload[k] !== undefined) {
            plainText += payload[k];
        }
    }
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(plainText);
    return hmac.digest('hex');
}

function getIciciCommandUrl(env) {
    const environment = env || process.env.ICICI_ENV || 'live';
    return environment === 'live'
        ? (process.env.ICICI_COMMAND_URL || 'https://pgpay.icicibank.com/pg/api/command')
        : (process.env.ICICI_UAT_COMMAND_URL || 'https://pgpayuat.icicibank.com/tsp/pg/api/command');
}

/**
 * ICICI S2S Status Inquiry API (Pull)
 * Calls ICICI command endpoint via application/x-www-form-urlencoded POST
 */
async function checkIciciPaymentStatus(merchantTxnNo, originalTxnNo, options) {
    const merchantId = (options && options.merchantId) || process.env.ICICI_MERCHANT_ID || '100000000531583';
    const aggregatorId = (options && options.aggregatorId) || process.env.ICICI_AGGREGATOR_ID || '100000000531582';
    const secretKey = (options && options.secretKey) || process.env.ICICI_SECRET_KEY || 'db06cca0-838b-4e01-8b20-6ac446ffb6bd';
    const env = (options && options.env) || process.env.ICICI_ENV || 'live';
    const commandUrl = (options && options.commandUrl) || getIciciCommandUrl(env);

    const payload = {
        merchantId,
        transactionType: 'STATUS',
        merchantTxnNo
    };

    if (aggregatorId) {
        payload.aggregatorID = aggregatorId;
    }

    if (originalTxnNo) {
        payload.originalTxnNo = originalTxnNo;
    }

    payload.secureHash = generateIciciHash(payload, secretKey);

    const formBody = new URLSearchParams();
    for (const [k, v] of Object.entries(payload)) {
        if (v !== undefined && v !== null) {
            formBody.append(k, String(v));
        }
    }

    const maxRetries = 2;
    let lastError = null;

    const urlsToTry = [commandUrl];
    if (env === 'live' && commandUrl.includes('pgpay.icicibank.com')) {
        urlsToTry.push('https://pgpay.icici.bank.in/pg/api/command');
    } else if (env === 'live' && commandUrl.includes('pgpay.icici.bank.in')) {
        urlsToTry.push('https://pgpay.icicibank.com/pg/api/command');
    }

    for (const targetUrl of urlsToTry) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(targetUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json, text/plain, */*'
                    },
                    body: formBody.toString()
                });

                const rawText = await response.text();
                let data = {};
                try {
                    data = JSON.parse(rawText);
                } catch {
                    const parsed = new URLSearchParams(rawText);
                    const obj = {};
                    parsed.forEach((val, key) => { obj[key] = val; });
                    if (Object.keys(obj).length > 0) {
                        data = obj;
                    }
                }

                const responseCode = data.responseCode || data.respCode || (data.responseParams && data.responseParams.responseCode) || null;
                const status = (data.status || (data.responseParams && data.responseParams.status) || '').toUpperCase();
                const txnID = data.txnID || data.paymentID || (data.responseParams && (data.responseParams.txnID || data.responseParams.paymentID)) || null;
                const amount = data.amount || (data.responseParams && data.responseParams.amount) || null;
                const description = data.respDescription || data.statusMsg || (data.responseParams && data.responseParams.respDescription) || null;

                const isPaid = responseCode === '0000' || responseCode === '000' || status === 'SUC';

                return {
                    success: true,
                    isPaid,
                    txnID,
                    amount,
                    responseCode,
                    description,
                    rawResponse: data
                };
            } catch (err) {
                lastError = err;
                console.warn(`[ICICI S2S] Status check attempt ${attempt} failed on ${targetUrl}:`, err.message || err);
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 600));
                }
            }
        }
    }

    return {
        success: false,
        isPaid: false,
        txnID: null,
        amount: null,
        responseCode: null,
        description: lastError ? String(lastError.message || lastError) : 'Network error or timeout',
        rawResponse: null
    };
}

module.exports = {
    generateIciciHash,
    getIciciCommandUrl,
    checkIciciPaymentStatus
};
