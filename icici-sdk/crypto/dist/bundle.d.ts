type EncryptedDataType = {
    requestId: string;
    service: string;
    oaepHashingAlgorithm: string;
    iv: string;
    encryptedKey: string;
    encryptedData: string;
    clientInfo: string;
    optionalParam: string;
};

declare class EncryptedPayloadDTO {
    requestId: string;
    service: string;
    oaepHashingAlgorithm: string;
    iv: string;
    encryptedKey: string;
    encryptedData: string;
    clientInfo: string;
    optionalParam: string;
    constructor(response: EncryptedDataType);
}

declare class Crypto {
    private constructor();
    static encrypt(data: string, moduleName?: string): Promise<EncryptedPayloadDTO>;
    static decrypt(encryptedData: string, encryptedKey: string, moduleName?: string): Promise<string>;
    static generateFingerprint(payload: string, apikey: string, moduleName?: string): Promise<string>;
}

export { Crypto };
