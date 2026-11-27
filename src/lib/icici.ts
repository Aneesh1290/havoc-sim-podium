import crypto from 'crypto';

export interface IciciPaymentStatusResult {
    success: boolean;
    isPaid: boolean;
    txnID: string | null;
    amount: string | null;
    responseCode: string | null;
    description: string | null;
    rawResponse?: any;
}

export interface IciciStatusPayload {
    merchantId: string;
    aggregatorID?: string;
    transactionType: 'STATUS';
    merchantTxnNo: string;
    originalTxnNo?: string;
    secureHash?: string;
    [key: string]: any;
}

export function generateIciciHash(payload: Record<string, any>, secretKey: string): string {
    const sortedKeys = Object.keys(payload).sort();
    let plainText = '';
    for (const key of sortedKeys) {
        if (key !== 'secureHash' && payload[key] !== null && payload[key] !== undefined) {
            plainText += payload[key];
        }
    }
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(plainText);
    return hmac.digest('hex');
}

export function getIciciCommandUrl(env: string = process.env.ICICI_ENV || 'live'): string {
    return env === 'live'
        ? (process.env.ICICI_COMMAND_URL || 'https://pgpay.icicibank.com/pg/api/command')
        : (process.env.ICICI_UAT_COMMAND_URL || 'https://pgpayuat.icicibank.com/tsp/pg/api/command');
}

/**
 * ICICI S2S Status Inquiry API (Pull)
 * Calls ICICI command endpoint via application/x-www-form-urlencoded POST
 */
export async function checkIciciPaymentStatus(
    merchantTxnNo: string,
    originalTxnNo?: string,
    options?: {
        merchantId?: string;
        aggregatorId?: string;
        secretKey?: string;
        env?: string;
        commandUrl?: string;
    }
): Promise<IciciPaymentStatusResult> {
    const merchantId = options?.merchantId || process.env.ICICI_MERCHANT_ID || '100000000531583';
    const aggregatorId = options?.aggregatorId || process.env.ICICI_AGGREGATOR_ID || '100000000531582';
    const secretKey = options?.secretKey || process.env.ICICI_SECRET_KEY || 'db06cca0-838b-4e01-8b20-6ac446ffb6bd';
    const env = options?.env || process.env.ICICI_ENV || 'live';
    const commandUrl = options?.commandUrl || getIciciCommandUrl(env);

    const payload: IciciStatusPayload = {
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
    let lastError: any = null;

    // List of possible command URL endpoints (primary live, fallback domain)
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
                let data: any = {};
                try {
                    data = JSON.parse(rawText);
                } catch {
                    // Try parsing as urlencoded if JSON parsing fails
                    const parsed = new URLSearchParams(rawText);
                    const obj: Record<string, string> = {};
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
            } catch (err: any) {
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
