type DecryptData = {
    requestId?: string;
    service?: string;
    encryptedKey: string;
    oaepHashingAlgorithm?: string;
    iv?: string;
    encryptedData: string;
    clientInfo?: string;
    optionalParam?: string;
};

declare class SdkClient {
    static readonly execute: <T>(apiId: string, module: string, payload: {
        [key: string]: any;
    }) => Promise<T>;
    static readonly decryptCallback: <T>(data: DecryptData, moduleName: string) => Promise<T>;
    static readonly encryptEcollection: <T>(data: DecryptData, moduleName: string) => Promise<T>;
}

export { SdkClient };
