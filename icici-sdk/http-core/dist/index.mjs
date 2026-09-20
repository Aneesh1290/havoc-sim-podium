import winston from 'winston';
import fs, { promises } from 'fs';
import path, { join } from 'path';
import require$$1 from 'os';
import require$$3, { createHash, createPublicKey, createCipheriv, publicEncrypt, constants, createDecipheriv } from 'crypto';
import forge from 'node-forge';
import axios from 'axios';
import { IsNotEmpty, IsString, IsOptional, MaxLength, ValidateIf, IsObject, validateSync } from 'class-validator';
import { __decorate, __metadata } from 'tslib';

class EncryptedPayloadDTO {
    constructor(response) {
        Object.defineProperty(this, "requestId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "service", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "oaepHashingAlgorithm", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "iv", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "encryptedKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "encryptedData", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "clientInfo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "optionalParam", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.requestId = response.requestId || "";
        this.service = response.service || "";
        this.oaepHashingAlgorithm = response.oaepHashingAlgorithm || "";
        this.iv = response.iv || "";
        this.encryptedKey = response.encryptedKey || "";
        this.encryptedData = response.encryptedData || "";
        this.clientInfo = response.clientInfo || "";
        this.optionalParam = response.optionalParam || "";
    }
}

function getDefaultExportFromCjs$1 (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var esDirname$1;
var hasRequiredEsDirname$1;

function requireEsDirname$1 () {
	if (hasRequiredEsDirname$1) return esDirname$1;
	hasRequiredEsDirname$1 = 1;
	const _dirname = path.dirname;
	const { platform } = require$$1;

	esDirname$1 = () => {
	  try {
	    ShadowsAlwaysDieTwice;
	  } catch (e) {
	    const initiator = e.stack.split('\n').slice(2, 3)[0];
	    let path = /(?<path>[^\(\s]+):[0-9]+:[0-9]+/.exec(initiator).groups.path;
	    if (path.indexOf('file') >= 0) {
	      path = new URL(path).pathname;
	    }
	    let dirname = _dirname(path);
	    if (dirname[0] === '/' && platform() === 'win32') {
	      dirname = dirname.slice(1);
	    }
	    return dirname
	  }
	};
	return esDirname$1;
}

var esDirnameExports$1 = requireEsDirname$1();
var directory$1 = /*@__PURE__*/getDefaultExportFromCjs$1(esDirnameExports$1);

var main$1 = {exports: {}};

var version$1 = "16.6.1";
var require$$4$1 = {
	version: version$1};

var hasRequiredMain$1;

function requireMain$1 () {
	if (hasRequiredMain$1) return main$1.exports;
	hasRequiredMain$1 = 1;
	const fs$1 = fs;
	const path$1 = path;
	const os = require$$1;
	const crypto = require$$3;
	const packageJson = require$$4$1;

	const version = packageJson.version;

	const LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;

	// Parse src into an Object
	function parse (src) {
	  const obj = {};

	  // Convert buffer to string
	  let lines = src.toString();

	  // Convert line breaks to same format
	  lines = lines.replace(/\r\n?/mg, '\n');

	  let match;
	  while ((match = LINE.exec(lines)) != null) {
	    const key = match[1];

	    // Default undefined or null to empty string
	    let value = (match[2] || '');

	    // Remove whitespace
	    value = value.trim();

	    // Check if double quoted
	    const maybeQuote = value[0];

	    // Remove surrounding quotes
	    value = value.replace(/^(['"`])([\s\S]*)\1$/mg, '$2');

	    // Expand newlines if double quoted
	    if (maybeQuote === '"') {
	      value = value.replace(/\\n/g, '\n');
	      value = value.replace(/\\r/g, '\r');
	    }

	    // Add to object
	    obj[key] = value;
	  }

	  return obj
	}

	function _parseVault (options) {
	  options = options || {};

	  const vaultPath = _vaultPath(options);
	  options.path = vaultPath; // parse .env.vault
	  const result = DotenvModule.configDotenv(options);
	  if (!result.parsed) {
	    const err = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`);
	    err.code = 'MISSING_DATA';
	    throw err
	  }

	  // handle scenario for comma separated keys - for use with key rotation
	  // example: DOTENV_KEY="dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=prod,dotenv://:key_7890@dotenvx.com/vault/.env.vault?environment=prod"
	  const keys = _dotenvKey(options).split(',');
	  const length = keys.length;

	  let decrypted;
	  for (let i = 0; i < length; i++) {
	    try {
	      // Get full key
	      const key = keys[i].trim();

	      // Get instructions for decrypt
	      const attrs = _instructions(result, key);

	      // Decrypt
	      decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key);

	      break
	    } catch (error) {
	      // last key
	      if (i + 1 >= length) {
	        throw error
	      }
	      // try next key
	    }
	  }

	  // Parse decrypted .env string
	  return DotenvModule.parse(decrypted)
	}

	function _warn (message) {
	  console.log(`[dotenv@${version}][WARN] ${message}`);
	}

	function _debug (message) {
	  console.log(`[dotenv@${version}][DEBUG] ${message}`);
	}

	function _log (message) {
	  console.log(`[dotenv@${version}] ${message}`);
	}

	function _dotenvKey (options) {
	  // prioritize developer directly setting options.DOTENV_KEY
	  if (options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0) {
	    return options.DOTENV_KEY
	  }

	  // secondary infra already contains a DOTENV_KEY environment variable
	  if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {
	    return process.env.DOTENV_KEY
	  }

	  // fallback to empty string
	  return ''
	}

	function _instructions (result, dotenvKey) {
	  // Parse DOTENV_KEY. Format is a URI
	  let uri;
	  try {
	    uri = new URL(dotenvKey);
	  } catch (error) {
	    if (error.code === 'ERR_INVALID_URL') {
	      const err = new Error('INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development');
	      err.code = 'INVALID_DOTENV_KEY';
	      throw err
	    }

	    throw error
	  }

	  // Get decrypt key
	  const key = uri.password;
	  if (!key) {
	    const err = new Error('INVALID_DOTENV_KEY: Missing key part');
	    err.code = 'INVALID_DOTENV_KEY';
	    throw err
	  }

	  // Get environment
	  const environment = uri.searchParams.get('environment');
	  if (!environment) {
	    const err = new Error('INVALID_DOTENV_KEY: Missing environment part');
	    err.code = 'INVALID_DOTENV_KEY';
	    throw err
	  }

	  // Get ciphertext payload
	  const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`;
	  const ciphertext = result.parsed[environmentKey]; // DOTENV_VAULT_PRODUCTION
	  if (!ciphertext) {
	    const err = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`);
	    err.code = 'NOT_FOUND_DOTENV_ENVIRONMENT';
	    throw err
	  }

	  return { ciphertext, key }
	}

	function _vaultPath (options) {
	  let possibleVaultPath = null;

	  if (options && options.path && options.path.length > 0) {
	    if (Array.isArray(options.path)) {
	      for (const filepath of options.path) {
	        if (fs$1.existsSync(filepath)) {
	          possibleVaultPath = filepath.endsWith('.vault') ? filepath : `${filepath}.vault`;
	        }
	      }
	    } else {
	      possibleVaultPath = options.path.endsWith('.vault') ? options.path : `${options.path}.vault`;
	    }
	  } else {
	    possibleVaultPath = path$1.resolve(process.cwd(), '.env.vault');
	  }

	  if (fs$1.existsSync(possibleVaultPath)) {
	    return possibleVaultPath
	  }

	  return null
	}

	function _resolveHome (envPath) {
	  return envPath[0] === '~' ? path$1.join(os.homedir(), envPath.slice(1)) : envPath
	}

	function _configVault (options) {
	  const debug = Boolean(options && options.debug);
	  const quiet = options && 'quiet' in options ? options.quiet : true;

	  if (debug || !quiet) {
	    _log('Loading env from encrypted .env.vault');
	  }

	  const parsed = DotenvModule._parseVault(options);

	  let processEnv = process.env;
	  if (options && options.processEnv != null) {
	    processEnv = options.processEnv;
	  }

	  DotenvModule.populate(processEnv, parsed, options);

	  return { parsed }
	}

	function configDotenv (options) {
	  const dotenvPath = path$1.resolve(process.cwd(), '.env');
	  let encoding = 'utf8';
	  const debug = Boolean(options && options.debug);
	  const quiet = options && 'quiet' in options ? options.quiet : true;

	  if (options && options.encoding) {
	    encoding = options.encoding;
	  } else {
	    if (debug) {
	      _debug('No encoding is specified. UTF-8 is used by default');
	    }
	  }

	  let optionPaths = [dotenvPath]; // default, look for .env
	  if (options && options.path) {
	    if (!Array.isArray(options.path)) {
	      optionPaths = [_resolveHome(options.path)];
	    } else {
	      optionPaths = []; // reset default
	      for (const filepath of options.path) {
	        optionPaths.push(_resolveHome(filepath));
	      }
	    }
	  }

	  // Build the parsed data in a temporary object (because we need to return it).  Once we have the final
	  // parsed data, we will combine it with process.env (or options.processEnv if provided).
	  let lastError;
	  const parsedAll = {};
	  for (const path of optionPaths) {
	    try {
	      // Specifying an encoding returns a string instead of a buffer
	      const parsed = DotenvModule.parse(fs$1.readFileSync(path, { encoding }));

	      DotenvModule.populate(parsedAll, parsed, options);
	    } catch (e) {
	      if (debug) {
	        _debug(`Failed to load ${path} ${e.message}`);
	      }
	      lastError = e;
	    }
	  }

	  let processEnv = process.env;
	  if (options && options.processEnv != null) {
	    processEnv = options.processEnv;
	  }

	  DotenvModule.populate(processEnv, parsedAll, options);

	  if (debug || !quiet) {
	    const keysCount = Object.keys(parsedAll).length;
	    const shortPaths = [];
	    for (const filePath of optionPaths) {
	      try {
	        const relative = path$1.relative(process.cwd(), filePath);
	        shortPaths.push(relative);
	      } catch (e) {
	        if (debug) {
	          _debug(`Failed to load ${filePath} ${e.message}`);
	        }
	        lastError = e;
	      }
	    }

	    _log(`injecting env (${keysCount}) from ${shortPaths.join(',')}`);
	  }

	  if (lastError) {
	    return { parsed: parsedAll, error: lastError }
	  } else {
	    return { parsed: parsedAll }
	  }
	}

	// Populates process.env from .env file
	function config (options) {
	  // fallback to original dotenv if DOTENV_KEY is not set
	  if (_dotenvKey(options).length === 0) {
	    return DotenvModule.configDotenv(options)
	  }

	  const vaultPath = _vaultPath(options);

	  // dotenvKey exists but .env.vault file does not exist
	  if (!vaultPath) {
	    _warn(`You set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}. Did you forget to build it?`);

	    return DotenvModule.configDotenv(options)
	  }

	  return DotenvModule._configVault(options)
	}

	function decrypt (encrypted, keyStr) {
	  const key = Buffer.from(keyStr.slice(-64), 'hex');
	  let ciphertext = Buffer.from(encrypted, 'base64');

	  const nonce = ciphertext.subarray(0, 12);
	  const authTag = ciphertext.subarray(-16);
	  ciphertext = ciphertext.subarray(12, -16);

	  try {
	    const aesgcm = crypto.createDecipheriv('aes-256-gcm', key, nonce);
	    aesgcm.setAuthTag(authTag);
	    return `${aesgcm.update(ciphertext)}${aesgcm.final()}`
	  } catch (error) {
	    const isRange = error instanceof RangeError;
	    const invalidKeyLength = error.message === 'Invalid key length';
	    const decryptionFailed = error.message === 'Unsupported state or unable to authenticate data';

	    if (isRange || invalidKeyLength) {
	      const err = new Error('INVALID_DOTENV_KEY: It must be 64 characters long (or more)');
	      err.code = 'INVALID_DOTENV_KEY';
	      throw err
	    } else if (decryptionFailed) {
	      const err = new Error('DECRYPTION_FAILED: Please check your DOTENV_KEY');
	      err.code = 'DECRYPTION_FAILED';
	      throw err
	    } else {
	      throw error
	    }
	  }
	}

	// Populate process.env with parsed values
	function populate (processEnv, parsed, options = {}) {
	  const debug = Boolean(options && options.debug);
	  const override = Boolean(options && options.override);

	  if (typeof parsed !== 'object') {
	    const err = new Error('OBJECT_REQUIRED: Please check the processEnv argument being passed to populate');
	    err.code = 'OBJECT_REQUIRED';
	    throw err
	  }

	  // Set process.env
	  for (const key of Object.keys(parsed)) {
	    if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
	      if (override === true) {
	        processEnv[key] = parsed[key];
	      }

	      if (debug) {
	        if (override === true) {
	          _debug(`"${key}" is already defined and WAS overwritten`);
	        } else {
	          _debug(`"${key}" is already defined and was NOT overwritten`);
	        }
	      }
	    } else {
	      processEnv[key] = parsed[key];
	    }
	  }
	}

	const DotenvModule = {
	  configDotenv,
	  _configVault,
	  _parseVault,
	  config,
	  decrypt,
	  parse,
	  populate
	};

	main$1.exports.configDotenv = DotenvModule.configDotenv;
	main$1.exports._configVault = DotenvModule._configVault;
	main$1.exports._parseVault = DotenvModule._parseVault;
	main$1.exports.config = DotenvModule.config;
	main$1.exports.decrypt = DotenvModule.decrypt;
	main$1.exports.parse = DotenvModule.parse;
	main$1.exports.populate = DotenvModule.populate;

	main$1.exports = DotenvModule;
	return main$1.exports;
}

var mainExports$1 = requireMain$1();
var dotenv$1 = /*@__PURE__*/getDefaultExportFromCjs$1(mainExports$1);

const rootDir = path.resolve(__dirname, "../../");
dotenv$1.config({ path: join(rootDir, ".env") });
const dirname$1$1 = directory$1();
const logDirectory$1 = join(dirname$1$1, "..", "..", "logs");
const logFile$1 = join(logDirectory$1, "sdk.log");
if (!fs.existsSync(logDirectory$1)) {
    fs.mkdirSync(logDirectory$1, { recursive: true });
}
const isLoggerEnabled$1 = process.env.IS_LOGGER_ENABLE === "true";
const transports$1 = [];
if (isLoggerEnabled$1) {
    transports$1.push(new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }), new winston.transports.File({
        filename: logFile$1,
        level: "info",
        maxsize: 5 * 1024 * 1024,
        tailable: true,
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }));
}
const logger$1 = winston.createLogger({
    level: "info",
    silent: !isLoggerEnabled$1,
    format: winston.format.combine(winston.format.timestamp(), winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level}]: ${message}`;
    })),
    transports: transports$1,
});
function cleanupOldLogs$1() {
    if (!fs.existsSync(logFile$1))
        return;
    const data = fs.readFileSync(logFile$1, "utf8").trim();
    if (!data)
        return;
    const lines = data.split("\n");
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const filteredLines = lines.filter((line) => {
        try {
            const entry = JSON.parse(line);
            const ts = new Date(entry.timestamp).getTime();
            return ts >= sevenDaysAgo;
        }
        catch {
            return true;
        }
    });
    fs.writeFileSync(logFile$1, filteredLines.join("\n") + "\n", "utf8");
}
setInterval(cleanupOldLogs$1, 24 * 60 * 60 * 1000);
cleanupOldLogs$1();

var _a$2;
const dirname$2 = directory$1();
const envPath$1 = path.resolve(__dirname, "../../.env");
mainExports$1.config({ path: envPath$1 });
let UtilsService$1 = class UtilsService {
    static safeJsonParse(jsonString) {
        try {
            return JSON.parse(jsonString);
        }
        catch (error) {
            logger$1.error("JSON parse error:" + error?.message);
            return null;
        }
    }
    static getPublicFilePath(fileName) {
        const basePath = path.resolve(dirname$2);
        console.log(basePath, "basepath");
        let publicDir = path.join(basePath, "..", "..", "config");
        console.log(publicDir, "publicDir");
        if (process.env.NODE_ENV === "development") {
            publicDir = path.join(basePath, "..", "config");
        }
        return path.join(publicDir, fileName);
    }
    static getKeyStoreConfig(name) {
        if (!name) {
            throw new Error("moduleName not provided.");
        }
        const config = this.keystorePath[name];
        if (!config) {
            throw new Error(`Keystore configuration for '${name}' not found`);
        }
        if (!config.alias || !config.password) {
            throw new Error(`Incomplete keystore configuration for '${name}'`);
        }
        return {
            keystorePath: config.keystorepath || "",
            alias: config.alias,
            keystorePassword: config.password,
            pempath: config.pempath || "",
        };
    }
};
_a$2 = UtilsService$1;
Object.defineProperty(UtilsService$1, "readFileFromPath", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: async (filePath) => {
        try {
            const data = await promises.readFile(filePath, "utf-8");
            return data;
        }
        catch (error) {
            logger$1.error("Unable to read file from given path" + error?.message);
            return null;
        }
    }
});
Object.defineProperty(UtilsService$1, "getServerPublicKey", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: async (moduleName) => {
        let filePath = "";
        if (moduleName === "default") {
            filePath = _a$2.getPublicFilePath("server-public-key.pem");
        }
        else {
            filePath =
                process.env.ENV_TYPE?.toLowerCase() === "uat"
                    ? _a$2.getPublicFilePath(`${moduleName}-server-public-key.pem`)
                    : _a$2.getPublicFilePath(`${moduleName}-server-public-key-prod.pem`);
        }
        const file = await _a$2.readFileFromPath(filePath);
        if (file) {
            return file;
        }
        return null;
    }
});
Object.defineProperty(UtilsService$1, "keystorePath", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: {
        corporate: {
            keystorepath: process.env.CIB_KEYSTORE_PATH,
            alias: process.env.CIB_KEYSTORE_ALIAS,
            password: process.env.CIB_KEYSTORE_PASSWORD,
            pempath: process.env.CIB_PRIVATE_PEM_PATH,
        },
        eazypay: {
            keystorepath: process.env.EAZYPAY_KEYSTORE_PATH || "",
            alias: process.env.EAZYPAY_KEYSTORE_ALIAS,
            password: process.env.EAZYPAY_KEYSTORE_PASSWORD,
            pempath: process.env.EAZYPAY_PRIVATE_PEM_PATH || "",
        },
        composite: {
            keystorepath: process.env.COMPOSITE_KEYSTORE_PATH,
            alias: process.env.COMPOSITE_KEYSTORE_ALIAS,
            password: process.env.COMPOSITE_KEYSTORE_PASSWORD,
            pempath: process.env.COMPOSITE_PRIVATE_PEM_PATH,
        },
        cibbulk: {
            keystorepath: process.env.CIBBULK_KEYSTORE_PATH,
            alias: process.env.CIBBULK_KEYSTORE_ALIAS,
            password: process.env.CIBBULK_KEYSTORE_PASSWORD,
            pempath: process.env.CIBBULK_PRIVATE_PEM_PATH,
        },
        ecollection: {
            keystorepath: process.env.E_COLLECTION_KEYSTORE_PATH,
            alias: process.env.E_COLLECTION_KEYSTORE_ALIAS,
            password: process.env.E_COLLECTION_KEYSTORE_PASSWORD,
            pempath: process.env.E_COLLECTION_PRIVATE_PEM_PATH,
        },
    }
});

var _a$1$1;
class EncryptService {
}
_a$1$1 = EncryptService;
Object.defineProperty(EncryptService, "generateSHA512Hash", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (payload) => {
        return createHash("sha512").update(payload, "utf8").digest("hex");
    }
});
Object.defineProperty(EncryptService, "generateRandomKey", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (keyLength) => {
        const charSet = "abcdefghijklmnopqrstuvwxyz";
        let key = "";
        for (let i = 0; i < keyLength; i++) {
            const randomIndex = Math.floor(Math.random() * charSet.length);
            key += charSet[randomIndex];
        }
        return key;
    }
});
Object.defineProperty(EncryptService, "getServerPublicKey", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: async (moduleName) => {
        const serverPublicKey = await UtilsService$1.getServerPublicKey(moduleName);
        if (!serverPublicKey) {
            logger$1.error("Server public key not found");
            throw new Error("Server public key not found");
        }
        const publicKeyPEM = serverPublicKey
            .replace("-----BEGIN PUBLIC KEY-----", "")
            .replace("-----END PUBLIC KEY-----", "")
            .replace(/\s/g, "");
        const decoded = Buffer.from(publicKeyPEM, "base64");
        const publicKey = createPublicKey({
            key: decoded,
            format: "der",
            type: "spki",
            encoding: "base64",
        });
        return publicKey;
    }
});
Object.defineProperty(EncryptService, "encryptData", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (key, initVector, value) => {
        try {
            const keyBytes = Buffer.from(key, "utf8");
            const ivBytes = Buffer.from(initVector, "utf8");
            const cipher = createCipheriv("aes-256-cbc", keyBytes, ivBytes);
            let encrypted = cipher.update(value, "utf8", "base64");
            encrypted += cipher.final("base64");
            const ivEncrypted = Buffer.concat([
                ivBytes,
                Buffer.from(encrypted, "base64"),
            ]);
            return ivEncrypted.toString("base64");
        }
        catch (error) {
            logger$1.error("Error encrypting the message:" + error?.message);
            throw new Error("Error encrypting the message" + error?.message);
        }
    }
});
Object.defineProperty(EncryptService, "encryptKey", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (aesKey, serverPublicKey) => {
        try {
            const decodedAesKey = Buffer.from(aesKey, "base64");
            const encryptedBytes = publicEncrypt({
                key: serverPublicKey,
                padding: constants.RSA_PKCS1_PADDING,
            }, decodedAesKey);
            return encryptedBytes.toString("base64");
        }
        catch (error) {
            logger$1.error("Error encrypting the message:" + error?.message);
            throw new Error("Error encrypting the message" + error?.message);
        }
    }
});
Object.defineProperty(EncryptService, "encrypt", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: async (data, moduleName) => {
        const aesKey = _a$1$1.generateRandomKey(32);
        const base64Key = Buffer.from(aesKey).toString("base64");
        const initialVector = _a$1$1.generateRandomKey(16);
        const encryptedData = _a$1$1.encryptData(aesKey, initialVector, data);
        const serverPublicKey = await _a$1$1.getServerPublicKey(moduleName);
        const encryptedKey = _a$1$1.encryptKey(base64Key, serverPublicKey);
        return { encryptedData, encryptedKey, initialVector };
    }
});
Object.defineProperty(EncryptService, "generateFingerprint", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: async (payload, apikey, moduleName) => {
        try {
            const sha512Hash = _a$1$1.generateSHA512Hash(payload);
            const fingerprint = `${apikey}|${sha512Hash}`;
            const base64IdFingerPrint = Buffer.from(fingerprint).toString("base64");
            const serverPublicKey = await _a$1$1.getServerPublicKey(moduleName);
            const encryptedIdFingerPrint = _a$1$1.encryptKey(base64IdFingerPrint, serverPublicKey);
            return encryptedIdFingerPrint;
        }
        catch (error) {
            logger$1.error("Error generating X-ID Fingerprint Header:" + error?.message);
            throw new Error("Fingerprint generation failed.");
        }
    }
});

var _a$3;
const envPath$2 = path.resolve(__dirname, "../../.env");
mainExports$1.config({ path: envPath$2 });
class DecryptService {
}
_a$3 = DecryptService;
Object.defineProperty(DecryptService, "getPrivateKeyFromP12", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: async (keystorePath, keystorePassword, alias) => {
        const p12Content = fs.readFileSync(keystorePath, "binary");
        if (!p12Content || p12Content.length <= 1) {
            logger$1.error("p12 keystore content is empty");
            throw new Error("p12 keystore content is empty");
        }
        const p12Asn1 = forge.asn1.fromDer(p12Content, false);
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, keystorePassword);
        if (!p12) {
            logger$1.error("Failed to load p12 keystore");
            throw new Error("Failed to load p12 keystore");
        }
        const keyBags = p12.getBags({
            friendlyName: alias,
            bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
        }).friendlyName;
        if (!keyBags || keyBags.length === 0) {
            logger$1.error("Failed to load private key from p12 keystore");
            throw new Error("Failed to load private key from p12 keystore");
        }
        const keyObj = keyBags[0];
        if (!keyObj.key) {
            logger$1.error("Failed to load private key from p12 keystore");
            throw new Error("Failed to load private key from p12 keystore");
        }
        return keyObj.key;
    }
});
Object.defineProperty(DecryptService, "decryptKey", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (encryptedKey, privateKey) => {
        try {
            const encryptedMsg = forge.util.decode64(encryptedKey);
            const decryptedMsg = privateKey.decrypt(encryptedMsg, "RSAES-PKCS1-V1_5");
            return forge.util.decodeUtf8(decryptedMsg);
        }
        catch (error) {
            logger$1.error("Key Decryption error:" + error?.message);
            throw new Error("Key Decryption error:" + error?.message);
        }
    }
});
Object.defineProperty(DecryptService, "decryptData", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (encryptedData, decryptedKey) => {
        try {
            const encrypted = Buffer.from(encryptedData, "base64");
            const iv = Buffer.from(Uint8Array.prototype.slice.call(encrypted, 0, 16));
            const ciphertext = Buffer.from(Uint8Array.prototype.slice.call(encrypted, 16));
            const secretKey = Buffer.from(decryptedKey, "utf8");
            const decipher = createDecipheriv("aes-128-cbc", secretKey, iv);
            const decrypted = Buffer.concat([
                decipher.update(ciphertext),
                decipher.final(),
            ]);
            return decrypted.toString("utf8");
        }
        catch (error) {
            logger$1.error("Decryption error:" + error?.message);
            throw new Error("Decryption error:" + error?.message);
        }
    }
});
Object.defineProperty(DecryptService, "decrypt", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: async (encryptedData, encryptedKey, moduleName) => {
        try {
            logger$1.info("Encrypted Response : " + encryptedData);
            let privateKey;
            const { pempath } = UtilsService$1.getKeyStoreConfig(moduleName);
            if (pempath && fs.existsSync(pempath)) {
                logger$1.info(`Using PEM file for decryption: ${pempath}`);
                privateKey = _a$3.getPrivateKeyFromPem(pempath);
                if (!privateKey) {
                    logger$1.error("Failed to load private key from PEM file.");
                    throw new Error("Failed to load private key from PEM file.");
                }
            }
            else {
                const { keystorePath, alias, keystorePassword } = UtilsService$1.getKeyStoreConfig(moduleName);
                if (!keystorePath || !keystorePassword || !alias) {
                    logger$1.warn("Keystore path, password, or alias is not provided.");
                    throw new Error("Keystore path, password, or alias is not provided.");
                }
                logger$1.info(`Using P12 keystore for decryption: ${keystorePath}`);
                privateKey = await _a$3.getPrivateKeyFromP12(keystorePath, keystorePassword, alias);
                if (!privateKey) {
                    logger$1.error("Failed to load private key from P12 keystore.");
                    throw new Error("Failed to load private key from P12 keystore.");
                }
            }
            const decryptedKey = _a$3.decryptKey(encryptedKey, privateKey);
            if (!decryptedKey) {
                logger$1.error("Failed to decrypt the encrypted key using RSA.");
                throw new Error("Failed to decrypt the encrypted key using RSA.");
            }
            const decryptedData = _a$3.decryptData(encryptedData, decryptedKey);
            if (!decryptedData) {
                logger$1.error("Failed to decrypt the encrypted data using AES.");
                throw new Error("Failed to decrypt the encrypted data using AES.");
            }
            return decryptedData;
        }
        catch (error) {
            logger$1.error("Unexpected error during decryption: " + error?.message);
            throw new Error("Unexpected error during decryption: " + error?.message);
        }
    }
});
Object.defineProperty(DecryptService, "getPrivateKeyFromPem", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (pemPath) => {
        if (!fs.existsSync(pemPath)) {
            throw new Error("PEM file not found");
        }
        const pemContent = fs.readFileSync(pemPath, "utf8");
        return forge.pki.privateKeyFromPem(pemContent);
    }
});

class Crypto {
    constructor() { }
    static async encrypt(data, moduleName = "default") {
        if (!data || typeof data !== "string") {
            logger$1.error("data is required and must be a string, stringify in case of object");
            throw new Error("data is required and must be a string, stringify in case of object");
        }
        const { encryptedKey, encryptedData } = await EncryptService.encrypt(data, moduleName);
        logger$1.info("Encrypted payload : " + encryptedData);
        const encryptedRequest = new EncryptedPayloadDTO({
            encryptedKey,
            encryptedData,
            requestId: "",
            service: "",
            oaepHashingAlgorithm: "",
            iv: "",
            clientInfo: "",
            optionalParam: "",
        });
        return encryptedRequest;
    }
    static async decrypt(encryptedData, encryptedKey, moduleName = "default") {
        if (!encryptedData || !encryptedKey) {
            logger$1.error("encryptedData and encryptedKey are required");
            throw new Error("encryptedData and encryptedKey are required");
        }
        const decryptedResponse = await DecryptService.decrypt(encryptedData, encryptedKey, moduleName);
        return decryptedResponse;
    }
    static async generateFingerprint(payload, apikey, moduleName = "default") {
        if (!payload || !apikey) {
            logger$1.error("payload and apikey are required");
            throw new Error("payload and apikey are required");
        }
        const fingerprint = await EncryptService.generateFingerprint(payload, apikey, moduleName);
        return fingerprint;
    }
}

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var esDirname;
var hasRequiredEsDirname;

function requireEsDirname () {
	if (hasRequiredEsDirname) return esDirname;
	hasRequiredEsDirname = 1;
	const _dirname = path.dirname;
	const { platform } = require$$1;

	esDirname = () => {
	  try {
	    ShadowsAlwaysDieTwice;
	  } catch (e) {
	    const initiator = e.stack.split('\n').slice(2, 3)[0];
	    let path = /(?<path>[^\(\s]+):[0-9]+:[0-9]+/.exec(initiator).groups.path;
	    if (path.indexOf('file') >= 0) {
	      path = new URL(path).pathname;
	    }
	    let dirname = _dirname(path);
	    if (dirname[0] === '/' && platform() === 'win32') {
	      dirname = dirname.slice(1);
	    }
	    return dirname
	  }
	};
	return esDirname;
}

var esDirnameExports = requireEsDirname();
var directory = /*@__PURE__*/getDefaultExportFromCjs(esDirnameExports);

var main = {exports: {}};

var version = "16.6.1";
var require$$4 = {
	version: version};

var hasRequiredMain;

function requireMain () {
	if (hasRequiredMain) return main.exports;
	hasRequiredMain = 1;
	const fs$1 = fs;
	const path$1 = path;
	const os = require$$1;
	const crypto = require$$3;
	const packageJson = require$$4;

	const version = packageJson.version;

	const LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;

	// Parse src into an Object
	function parse (src) {
	  const obj = {};

	  // Convert buffer to string
	  let lines = src.toString();

	  // Convert line breaks to same format
	  lines = lines.replace(/\r\n?/mg, '\n');

	  let match;
	  while ((match = LINE.exec(lines)) != null) {
	    const key = match[1];

	    // Default undefined or null to empty string
	    let value = (match[2] || '');

	    // Remove whitespace
	    value = value.trim();

	    // Check if double quoted
	    const maybeQuote = value[0];

	    // Remove surrounding quotes
	    value = value.replace(/^(['"`])([\s\S]*)\1$/mg, '$2');

	    // Expand newlines if double quoted
	    if (maybeQuote === '"') {
	      value = value.replace(/\\n/g, '\n');
	      value = value.replace(/\\r/g, '\r');
	    }

	    // Add to object
	    obj[key] = value;
	  }

	  return obj
	}

	function _parseVault (options) {
	  options = options || {};

	  const vaultPath = _vaultPath(options);
	  options.path = vaultPath; // parse .env.vault
	  const result = DotenvModule.configDotenv(options);
	  if (!result.parsed) {
	    const err = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`);
	    err.code = 'MISSING_DATA';
	    throw err
	  }

	  // handle scenario for comma separated keys - for use with key rotation
	  // example: DOTENV_KEY="dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=prod,dotenv://:key_7890@dotenvx.com/vault/.env.vault?environment=prod"
	  const keys = _dotenvKey(options).split(',');
	  const length = keys.length;

	  let decrypted;
	  for (let i = 0; i < length; i++) {
	    try {
	      // Get full key
	      const key = keys[i].trim();

	      // Get instructions for decrypt
	      const attrs = _instructions(result, key);

	      // Decrypt
	      decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key);

	      break
	    } catch (error) {
	      // last key
	      if (i + 1 >= length) {
	        throw error
	      }
	      // try next key
	    }
	  }

	  // Parse decrypted .env string
	  return DotenvModule.parse(decrypted)
	}

	function _warn (message) {
	  console.log(`[dotenv@${version}][WARN] ${message}`);
	}

	function _debug (message) {
	  console.log(`[dotenv@${version}][DEBUG] ${message}`);
	}

	function _log (message) {
	  console.log(`[dotenv@${version}] ${message}`);
	}

	function _dotenvKey (options) {
	  // prioritize developer directly setting options.DOTENV_KEY
	  if (options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0) {
	    return options.DOTENV_KEY
	  }

	  // secondary infra already contains a DOTENV_KEY environment variable
	  if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {
	    return process.env.DOTENV_KEY
	  }

	  // fallback to empty string
	  return ''
	}

	function _instructions (result, dotenvKey) {
	  // Parse DOTENV_KEY. Format is a URI
	  let uri;
	  try {
	    uri = new URL(dotenvKey);
	  } catch (error) {
	    if (error.code === 'ERR_INVALID_URL') {
	      const err = new Error('INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development');
	      err.code = 'INVALID_DOTENV_KEY';
	      throw err
	    }

	    throw error
	  }

	  // Get decrypt key
	  const key = uri.password;
	  if (!key) {
	    const err = new Error('INVALID_DOTENV_KEY: Missing key part');
	    err.code = 'INVALID_DOTENV_KEY';
	    throw err
	  }

	  // Get environment
	  const environment = uri.searchParams.get('environment');
	  if (!environment) {
	    const err = new Error('INVALID_DOTENV_KEY: Missing environment part');
	    err.code = 'INVALID_DOTENV_KEY';
	    throw err
	  }

	  // Get ciphertext payload
	  const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`;
	  const ciphertext = result.parsed[environmentKey]; // DOTENV_VAULT_PRODUCTION
	  if (!ciphertext) {
	    const err = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`);
	    err.code = 'NOT_FOUND_DOTENV_ENVIRONMENT';
	    throw err
	  }

	  return { ciphertext, key }
	}

	function _vaultPath (options) {
	  let possibleVaultPath = null;

	  if (options && options.path && options.path.length > 0) {
	    if (Array.isArray(options.path)) {
	      for (const filepath of options.path) {
	        if (fs$1.existsSync(filepath)) {
	          possibleVaultPath = filepath.endsWith('.vault') ? filepath : `${filepath}.vault`;
	        }
	      }
	    } else {
	      possibleVaultPath = options.path.endsWith('.vault') ? options.path : `${options.path}.vault`;
	    }
	  } else {
	    possibleVaultPath = path$1.resolve(process.cwd(), '.env.vault');
	  }

	  if (fs$1.existsSync(possibleVaultPath)) {
	    return possibleVaultPath
	  }

	  return null
	}

	function _resolveHome (envPath) {
	  return envPath[0] === '~' ? path$1.join(os.homedir(), envPath.slice(1)) : envPath
	}

	function _configVault (options) {
	  const debug = Boolean(options && options.debug);
	  const quiet = options && 'quiet' in options ? options.quiet : true;

	  if (debug || !quiet) {
	    _log('Loading env from encrypted .env.vault');
	  }

	  const parsed = DotenvModule._parseVault(options);

	  let processEnv = process.env;
	  if (options && options.processEnv != null) {
	    processEnv = options.processEnv;
	  }

	  DotenvModule.populate(processEnv, parsed, options);

	  return { parsed }
	}

	function configDotenv (options) {
	  const dotenvPath = path$1.resolve(process.cwd(), '.env');
	  let encoding = 'utf8';
	  const debug = Boolean(options && options.debug);
	  const quiet = options && 'quiet' in options ? options.quiet : true;

	  if (options && options.encoding) {
	    encoding = options.encoding;
	  } else {
	    if (debug) {
	      _debug('No encoding is specified. UTF-8 is used by default');
	    }
	  }

	  let optionPaths = [dotenvPath]; // default, look for .env
	  if (options && options.path) {
	    if (!Array.isArray(options.path)) {
	      optionPaths = [_resolveHome(options.path)];
	    } else {
	      optionPaths = []; // reset default
	      for (const filepath of options.path) {
	        optionPaths.push(_resolveHome(filepath));
	      }
	    }
	  }

	  // Build the parsed data in a temporary object (because we need to return it).  Once we have the final
	  // parsed data, we will combine it with process.env (or options.processEnv if provided).
	  let lastError;
	  const parsedAll = {};
	  for (const path of optionPaths) {
	    try {
	      // Specifying an encoding returns a string instead of a buffer
	      const parsed = DotenvModule.parse(fs$1.readFileSync(path, { encoding }));

	      DotenvModule.populate(parsedAll, parsed, options);
	    } catch (e) {
	      if (debug) {
	        _debug(`Failed to load ${path} ${e.message}`);
	      }
	      lastError = e;
	    }
	  }

	  let processEnv = process.env;
	  if (options && options.processEnv != null) {
	    processEnv = options.processEnv;
	  }

	  DotenvModule.populate(processEnv, parsedAll, options);

	  if (debug || !quiet) {
	    const keysCount = Object.keys(parsedAll).length;
	    const shortPaths = [];
	    for (const filePath of optionPaths) {
	      try {
	        const relative = path$1.relative(process.cwd(), filePath);
	        shortPaths.push(relative);
	      } catch (e) {
	        if (debug) {
	          _debug(`Failed to load ${filePath} ${e.message}`);
	        }
	        lastError = e;
	      }
	    }

	    _log(`injecting env (${keysCount}) from ${shortPaths.join(',')}`);
	  }

	  if (lastError) {
	    return { parsed: parsedAll, error: lastError }
	  } else {
	    return { parsed: parsedAll }
	  }
	}

	// Populates process.env from .env file
	function config (options) {
	  // fallback to original dotenv if DOTENV_KEY is not set
	  if (_dotenvKey(options).length === 0) {
	    return DotenvModule.configDotenv(options)
	  }

	  const vaultPath = _vaultPath(options);

	  // dotenvKey exists but .env.vault file does not exist
	  if (!vaultPath) {
	    _warn(`You set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}. Did you forget to build it?`);

	    return DotenvModule.configDotenv(options)
	  }

	  return DotenvModule._configVault(options)
	}

	function decrypt (encrypted, keyStr) {
	  const key = Buffer.from(keyStr.slice(-64), 'hex');
	  let ciphertext = Buffer.from(encrypted, 'base64');

	  const nonce = ciphertext.subarray(0, 12);
	  const authTag = ciphertext.subarray(-16);
	  ciphertext = ciphertext.subarray(12, -16);

	  try {
	    const aesgcm = crypto.createDecipheriv('aes-256-gcm', key, nonce);
	    aesgcm.setAuthTag(authTag);
	    return `${aesgcm.update(ciphertext)}${aesgcm.final()}`
	  } catch (error) {
	    const isRange = error instanceof RangeError;
	    const invalidKeyLength = error.message === 'Invalid key length';
	    const decryptionFailed = error.message === 'Unsupported state or unable to authenticate data';

	    if (isRange || invalidKeyLength) {
	      const err = new Error('INVALID_DOTENV_KEY: It must be 64 characters long (or more)');
	      err.code = 'INVALID_DOTENV_KEY';
	      throw err
	    } else if (decryptionFailed) {
	      const err = new Error('DECRYPTION_FAILED: Please check your DOTENV_KEY');
	      err.code = 'DECRYPTION_FAILED';
	      throw err
	    } else {
	      throw error
	    }
	  }
	}

	// Populate process.env with parsed values
	function populate (processEnv, parsed, options = {}) {
	  const debug = Boolean(options && options.debug);
	  const override = Boolean(options && options.override);

	  if (typeof parsed !== 'object') {
	    const err = new Error('OBJECT_REQUIRED: Please check the processEnv argument being passed to populate');
	    err.code = 'OBJECT_REQUIRED';
	    throw err
	  }

	  // Set process.env
	  for (const key of Object.keys(parsed)) {
	    if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
	      if (override === true) {
	        processEnv[key] = parsed[key];
	      }

	      if (debug) {
	        if (override === true) {
	          _debug(`"${key}" is already defined and WAS overwritten`);
	        } else {
	          _debug(`"${key}" is already defined and was NOT overwritten`);
	        }
	      }
	    } else {
	      processEnv[key] = parsed[key];
	    }
	  }
	}

	const DotenvModule = {
	  configDotenv,
	  _configVault,
	  _parseVault,
	  config,
	  decrypt,
	  parse,
	  populate
	};

	main.exports.configDotenv = DotenvModule.configDotenv;
	main.exports._configVault = DotenvModule._configVault;
	main.exports._parseVault = DotenvModule._parseVault;
	main.exports.config = DotenvModule.config;
	main.exports.decrypt = DotenvModule.decrypt;
	main.exports.parse = DotenvModule.parse;
	main.exports.populate = DotenvModule.populate;

	main.exports = DotenvModule;
	return main.exports;
}

var mainExports = requireMain();
var dotenv = /*@__PURE__*/getDefaultExportFromCjs(mainExports);

dotenv.config();
const dirname$1 = directory();
const logDirectory = join(dirname$1, "..", "..", "logs");
const logFile = join(logDirectory, "sdk.log");
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}
const isLoggerEnabled = process.env.IS_LOGGER_ENABLE === "true";
const transports = [];
if (isLoggerEnabled) {
    transports.push(new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }), new winston.transports.File({
        filename: logFile,
        level: "info",
        maxsize: 5 * 1024 * 1024,
        tailable: true,
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }));
}
const logger = winston.createLogger({
    level: "info",
    silent: !isLoggerEnabled,
    format: winston.format.combine(winston.format.timestamp(), winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level}]: ${message}`;
    })),
    transports,
});
function cleanupOldLogs() {
    if (!fs.existsSync(logFile))
        return;
    const data = fs.readFileSync(logFile, "utf8").trim();
    if (!data)
        return;
    const lines = data.split("\n");
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const filteredLines = lines.filter((line) => {
        try {
            const entry = JSON.parse(line);
            const ts = new Date(entry.timestamp).getTime();
            return ts >= sevenDaysAgo;
        }
        catch {
            return true;
        }
    });
    fs.writeFileSync(logFile, filteredLines.join("\n") + "\n", "utf8");
}
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);
cleanupOldLogs();

var _a$1;
const envPath = path.resolve(__dirname, "../../.env");
mainExports.config({ path: envPath });
const dirname = directory();
class UtilsService {
    static get moduleName() {
        return this._moduleName;
    }
    static set moduleName(value) {
        this._moduleName = value;
    }
    static safeJsonParse(jsonString) {
        try {
            return JSON.parse(jsonString);
        }
        catch (error) {
            logger.error("JSON parse error:" + error?.message);
            return null;
        }
    }
    static getPublicFilePath(fileName) {
        const basePath = path.resolve(dirname);
        const publicDir = path.join(basePath, "..", "..", "config");
        return path.join(publicDir, fileName);
    }
    static getModuleApiKey(name) {
        const apikey = this.apiKeys[name];
        if (!apikey) {
            throw new Error(`API key for '${name}' not found`);
        }
        return apikey;
    }
    static getPaymentCategoryApiKey(name) {
        const apikey = this.paymentCategoryApiKey[name];
        if (!apikey) {
            throw new Error(`API key for '${name}' not found`);
        }
        return apikey;
    }
    static async readBulkRequestFile(filePath) {
        try {
            const absolutePath = path.resolve(filePath);
            await promises.access(absolutePath).catch(() => {
                throw new Error(`File not found: ${absolutePath}`);
            });
            const rawContent = await promises.readFile(absolutePath, "utf8");
            const contents = rawContent
                .split("^")
                .map((line) => line.trim())
                .filter((line) => line.length > 0);
            const header = contents[0].split("|");
            if (contents.length > 150 || Number(header[1]) !== contents.length - 1) {
                return null;
            }
            const RECORD_TYPE = ["FHR", "MDR", "MCW", "MCO"];
            for (const line of contents) {
                const recordType = line.split("|")[0];
                if (!RECORD_TYPE.includes(recordType)) {
                    return null;
                }
            }
            const fileContent = await promises.readFile(absolutePath, "utf-8");
            const base64Data = Buffer.from(fileContent).toString("base64");
            return base64Data;
        }
        catch (error) {
            console.log(`Error reading file: ${error.message}`);
            return null;
        }
    }
    static getIciciApiBaseUrl() {
        const envType = process.env.ENV_TYPE?.toLowerCase();
        return envType === "uat"
            ? "https://apibankingonesandbox.icici.bank.in/api"
            : "https://apibankingone.icici.bank.in/api";
    }
}
_a$1 = UtilsService;
Object.defineProperty(UtilsService, "apiConfigCache", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: null
});
Object.defineProperty(UtilsService, "readFileFromPath", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: async (filePath) => {
        try {
            const data = await promises.readFile(filePath, "utf-8");
            return data;
        }
        catch (error) {
            logger.error("Unable to read file from given path" + error?.message);
            return null;
        }
    }
});
Object.defineProperty(UtilsService, "loadApiConfig", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: async () => {
        const filePath = _a$1.getPublicFilePath("sdk-api-config.json");
        const file = await _a$1.readFileFromPath(filePath);
        if (file) {
            return _a$1.safeJsonParse(file);
        }
        return null;
    }
});
Object.defineProperty(UtilsService, "getAPIConfig", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: async () => {
        if (_a$1.apiConfigCache) {
            return _a$1.apiConfigCache;
        }
        const apiConfigFile = await _a$1.loadApiConfig();
        if (!apiConfigFile) {
            logger.error("Api Configuration not found");
            throw new Error("Api Configuration not found");
        }
        const apiConfig = apiConfigFile.modules
            ?.filter((module) => module.isSubscribed)
            .reduce((acc, cur) => {
            const apikey = _a$1.getModuleApiKey(cur.name);
            cur?.apis?.forEach((api) => {
                const category = cur.paymentTypes?.find((payment) => payment.name === api?.category);
                if (category) {
                    api = { ...api, ...category };
                }
                if (api.isSubscribed !== false) {
                    acc[api?.apiId] = {
                        headers: cur?.headers,
                        ...api,
                        baseUrl: apiConfigFile.baseUrl,
                        apikey: api?.apikey || apikey,
                        category: category?.name || undefined,
                    };
                }
            });
            return acc;
        }, {});
        _a$1.apiConfigCache = apiConfig;
        return apiConfig;
    }
});
Object.defineProperty(UtilsService, "apiKeys", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: {
        corporate: process.env.CIB_API_KEY,
        eazypay: process.env.EAZYPAY_API_KEY,
        composite: process.env.COMPOSITE_API_KEY,
        cibbulk: process.env.CIBBULK_API_KEY,
    }
});
Object.defineProperty(UtilsService, "paymentCategoryApiKey", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: {
        cib: process.env.CIB_API_KEY,
        upi: process.env.UPI_API_KEY,
        imps: process.env.IMPS_API_KEY,
        neft: process.env.NEFT_API_KEY,
        rtgs: process.env.RTGS_API_KEY,
    }
});

const apiClient = axios.create();
apiClient.interceptors.request.use(async (config) => {
    const moduleName = UtilsService.moduleName;
    console.log(config.data, "config.dataconfig.dataconfig.dataconfig.data");
    const encryptedRequest = await Crypto.encrypt(JSON.stringify(config.data), moduleName);
    config.data = encryptedRequest;
    return config;
}, (error) => {
    logger.error("Error during request encryption:" + error.message);
    return Promise.reject(error);
});
apiClient.interceptors.response.use(async (response) => {
    const moduleName = UtilsService.moduleName;
    const resp = response.data;
    if (resp?.encryptedData && resp?.encryptedKey) {
        const decryptedResponse = await Crypto.decrypt(resp.encryptedData, resp.encryptedKey, moduleName);
        response.data = JSON.parse(decryptedResponse);
    }
    return response.data;
}, (error) => {
    logger.error("Error during response decryption:" + error.message);
    return Promise.reject(error);
});
const apiService = {
    get: (url, params, config) => apiClient.get(url, { params, ...config }),
    post: (url, data, config) => apiClient.post(url, data, { ...config }),
    put: (url, data, config) => apiClient.put(url, data, { ...config }),
    delete: (url, config) => apiClient.delete(url, { ...config }),
};

let BaseDTO$1$1 = class BaseDTO {
    constructor() {
        Object.defineProperty(this, "AGGRID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CORPID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "USERID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "URN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
};
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BaseDTO$1$1.prototype, "AGGRID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BaseDTO$1$1.prototype, "CORPID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BaseDTO$1$1.prototype, "USERID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BaseDTO$1$1.prototype, "URN", void 0);

class MobileFetchDTO extends BaseDTO$1$1 {
}

class AccountStatementDTO extends BaseDTO$1$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "ACCOUNTNO", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "FROMDATE", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "TODATE", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], AccountStatementDTO.prototype, "ACCOUNTNO", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], AccountStatementDTO.prototype, "FROMDATE", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], AccountStatementDTO.prototype, "TODATE", void 0);

class AccountStatementsDTO extends BaseDTO$1$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "ACCOUNTNO", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "FROMDATE", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "TODATE", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CONFLG", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "LASTTRID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], AccountStatementsDTO.prototype, "ACCOUNTNO", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], AccountStatementsDTO.prototype, "FROMDATE", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], AccountStatementsDTO.prototype, "TODATE", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], AccountStatementsDTO.prototype, "CONFLG", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], AccountStatementsDTO.prototype, "LASTTRID", void 0);

class BalanceInquiryDTO extends BaseDTO$1$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "ACCOUNTNO", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BalanceInquiryDTO.prototype, "ACCOUNTNO", void 0);

class BeneficiaryAdditionDTO {
    constructor() {
        Object.defineProperty(this, "AGGR_ID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CrpId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CrpUsr", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BnfName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BnfNickName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BnfAccNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "PayeeType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "IFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "URN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneficiaryAdditionDTO.prototype, "AGGR_ID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneficiaryAdditionDTO.prototype, "CrpId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneficiaryAdditionDTO.prototype, "CrpUsr", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneficiaryAdditionDTO.prototype, "BnfName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneficiaryAdditionDTO.prototype, "BnfNickName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneficiaryAdditionDTO.prototype, "BnfAccNo", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneficiaryAdditionDTO.prototype, "PayeeType", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneficiaryAdditionDTO.prototype, "IFSC", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneficiaryAdditionDTO.prototype, "URN", void 0);

class BeneficiaryAdditionVPADTO {
    constructor() {
        Object.defineProperty(this, "aggrID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "corpID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "userID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "vpa", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "urn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneficiaryAdditionVPADTO.prototype, "aggrID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneficiaryAdditionVPADTO.prototype, "corpID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneficiaryAdditionVPADTO.prototype, "userID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneficiaryAdditionVPADTO.prototype, "vpa", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneficiaryAdditionVPADTO.prototype, "urn", void 0);

class BeneficiaryValidationDTO {
    constructor() {
        Object.defineProperty(this, "CrpId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CrpUsr", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BnfAccNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneficiaryValidationDTO.prototype, "CrpId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneficiaryValidationDTO.prototype, "CrpUsr", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneficiaryValidationDTO.prototype, "BnfAccNo", void 0);

class BeneRegistrationDTO {
    constructor() {
        Object.defineProperty(this, "AGGR_ID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CrpId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CrpUsr", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BnfName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BnfNickName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BnfAccNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "PayeeType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "IFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "URN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneRegistrationDTO.prototype, "AGGR_ID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneRegistrationDTO.prototype, "CrpId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneRegistrationDTO.prototype, "CrpUsr", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneRegistrationDTO.prototype, "BnfName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneRegistrationDTO.prototype, "BnfNickName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneRegistrationDTO.prototype, "BnfAccNo", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneRegistrationDTO.prototype, "PayeeType", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneRegistrationDTO.prototype, "IFSC", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneRegistrationDTO.prototype, "URN", void 0);

class BeneTransactionRequestDTO extends BaseDTO$1$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "AGGRNAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "DEBITACC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BNF_ID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "AMOUNT", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CURRENCY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "TXNTYPE", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "PAYEENAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "REMARKS", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "WORKFLOW_REQD", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UNIQUEID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CUSTOMERINDUCED", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "OTP", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneTransactionRequestDTO.prototype, "AGGRNAME", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneTransactionRequestDTO.prototype, "DEBITACC", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneTransactionRequestDTO.prototype, "BNF_ID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneTransactionRequestDTO.prototype, "AMOUNT", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneTransactionRequestDTO.prototype, "CURRENCY", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneTransactionRequestDTO.prototype, "TXNTYPE", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneTransactionRequestDTO.prototype, "PAYEENAME", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneTransactionRequestDTO.prototype, "REMARKS", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneTransactionRequestDTO.prototype, "WORKFLOW_REQD", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneTransactionRequestDTO.prototype, "UNIQUEID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneTransactionRequestDTO.prototype, "CUSTOMERINDUCED", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BeneTransactionRequestDTO.prototype, "OTP", void 0);

class CorporateNEFTStatusDTO extends BaseDTO$1$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "UTRNUMBER", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CorporateNEFTStatusDTO.prototype, "UTRNUMBER", void 0);

class DeregistrationDTO extends BaseDTO$1$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "AGGRNAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], DeregistrationDTO.prototype, "AGGRNAME", void 0);

class GenerateOtpDTO {
    constructor() {
        Object.defineProperty(this, "CORP_ID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "USER_ID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "AGGR_ID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BENE_ACCNO", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UNIQUEID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BENE_NAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "URN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], GenerateOtpDTO.prototype, "CORP_ID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], GenerateOtpDTO.prototype, "USER_ID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], GenerateOtpDTO.prototype, "AGGR_ID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], GenerateOtpDTO.prototype, "BENE_ACCNO", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], GenerateOtpDTO.prototype, "UNIQUEID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], GenerateOtpDTO.prototype, "BENE_NAME", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], GenerateOtpDTO.prototype, "URN", void 0);

let OtpCreateDTO$1 = class OtpCreateDTO extends BaseDTO$1$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "AGGRNAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UNIQUEID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "AMOUNT", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
};
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], OtpCreateDTO$1.prototype, "AGGRNAME", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], OtpCreateDTO$1.prototype, "UNIQUEID", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], OtpCreateDTO$1.prototype, "AMOUNT", void 0);

class RegistrationStatusDTO extends BaseDTO$1$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "AGGRNAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RegistrationStatusDTO.prototype, "AGGRNAME", void 0);

class TransactionDTO extends BaseDTO$1$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "DEBITACC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CREDITACC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "IFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "AMOUNT", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CURRENCY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "TXNTYPE", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "PAYEENAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "AGGRNAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "REMARKS", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UNIQUEID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "WORKFLOW_REQD", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BENLEI", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionDTO.prototype, "DEBITACC", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionDTO.prototype, "CREDITACC", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionDTO.prototype, "IFSC", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionDTO.prototype, "AMOUNT", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionDTO.prototype, "CURRENCY", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionDTO.prototype, "TXNTYPE", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionDTO.prototype, "PAYEENAME", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionDTO.prototype, "AGGRNAME", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionDTO.prototype, "REMARKS", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionDTO.prototype, "UNIQUEID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionDTO.prototype, "WORKFLOW_REQD", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], TransactionDTO.prototype, "BENLEI", void 0);

class TransactionInquiryDTO extends BaseDTO$1$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "UNIQUEID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "REQID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionInquiryDTO.prototype, "UNIQUEID", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], TransactionInquiryDTO.prototype, "REQID", void 0);

class TransactionOtpDTO extends BaseDTO$1$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "AGGRNAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UNIQUEID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "DEBITACC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CREDITACC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "IFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "AMOUNT", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CURRENCY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "TXNTYPE", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "PAYEENAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "REMARKS", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CUSTOMERINDUCED", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "OTP", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "WORKFLOW_REQD", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BENLEI", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionOtpDTO.prototype, "AGGRNAME", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionOtpDTO.prototype, "UNIQUEID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionOtpDTO.prototype, "DEBITACC", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionOtpDTO.prototype, "CREDITACC", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionOtpDTO.prototype, "IFSC", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionOtpDTO.prototype, "AMOUNT", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionOtpDTO.prototype, "CURRENCY", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionOtpDTO.prototype, "TXNTYPE", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionOtpDTO.prototype, "PAYEENAME", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionOtpDTO.prototype, "REMARKS", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionOtpDTO.prototype, "CUSTOMERINDUCED", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionOtpDTO.prototype, "OTP", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionOtpDTO.prototype, "WORKFLOW_REQD", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], TransactionOtpDTO.prototype, "BENLEI", void 0);

class UserRegistrationDTO extends BaseDTO$1$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "ALIASID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UserRegistrationDTO.prototype, "ALIASID", void 0);

class ValidateLinkedAccountDTO extends BaseDTO$1$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "ACCOUNTNO", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateLinkedAccountDTO.prototype, "ACCOUNTNO", void 0);

class VirtualUserCreationDTO {
    constructor() {
        Object.defineProperty(this, "AGGRID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "USERID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "URN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BAY_USER_ID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], VirtualUserCreationDTO.prototype, "AGGRID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], VirtualUserCreationDTO.prototype, "USERID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], VirtualUserCreationDTO.prototype, "URN", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], VirtualUserCreationDTO.prototype, "BAY_USER_ID", void 0);

class ScheduleApiPaymentDTO extends BaseDTO$1$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "AGGRNAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UNIQUEID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "DEBITACC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CREDITACC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "IFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "AMOUNT", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CURRENCY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "TXNTYPE", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "OTP", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "PAYEENAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "REMARKS", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "WORKFLOW_REQD", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BENLEI", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "PAYMENT_DATE", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CUSTOMERINDUCED", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    MaxLength(32),
    __metadata("design:type", String)
], ScheduleApiPaymentDTO.prototype, "AGGRNAME", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    MaxLength(40),
    __metadata("design:type", String)
], ScheduleApiPaymentDTO.prototype, "UNIQUEID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    MaxLength(34),
    __metadata("design:type", String)
], ScheduleApiPaymentDTO.prototype, "DEBITACC", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    MaxLength(34),
    __metadata("design:type", String)
], ScheduleApiPaymentDTO.prototype, "CREDITACC", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    MaxLength(32),
    __metadata("design:type", String)
], ScheduleApiPaymentDTO.prototype, "IFSC", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    MaxLength(18),
    __metadata("design:type", String)
], ScheduleApiPaymentDTO.prototype, "AMOUNT", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    MaxLength(3),
    __metadata("design:type", String)
], ScheduleApiPaymentDTO.prototype, "CURRENCY", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    MaxLength(11),
    __metadata("design:type", String)
], ScheduleApiPaymentDTO.prototype, "TXNTYPE", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    MaxLength(6),
    __metadata("design:type", String)
], ScheduleApiPaymentDTO.prototype, "OTP", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    MaxLength(80),
    __metadata("design:type", String)
], ScheduleApiPaymentDTO.prototype, "PAYEENAME", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    MaxLength(255),
    __metadata("design:type", String)
], ScheduleApiPaymentDTO.prototype, "REMARKS", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    MaxLength(1),
    __metadata("design:type", String)
], ScheduleApiPaymentDTO.prototype, "WORKFLOW_REQD", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(20),
    __metadata("design:type", String)
], ScheduleApiPaymentDTO.prototype, "BENLEI", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    MaxLength(20),
    __metadata("design:type", String)
], ScheduleApiPaymentDTO.prototype, "PAYMENT_DATE", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    MaxLength(20),
    __metadata("design:type", String)
], ScheduleApiPaymentDTO.prototype, "CUSTOMERINDUCED", void 0);

class FetchBeneListDTO {
    constructor() {
        Object.defineProperty(this, "AGGRNAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "FEDID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "FROM_DATE", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "TO_DATE", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "PAGE_NO", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "AGGRID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "URN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    MaxLength(32),
    __metadata("design:type", String)
], FetchBeneListDTO.prototype, "AGGRNAME", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    MaxLength(32),
    __metadata("design:type", String)
], FetchBeneListDTO.prototype, "FEDID", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], FetchBeneListDTO.prototype, "FROM_DATE", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], FetchBeneListDTO.prototype, "TO_DATE", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], FetchBeneListDTO.prototype, "PAGE_NO", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], FetchBeneListDTO.prototype, "AGGRID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], FetchBeneListDTO.prototype, "URN", void 0);

const DTOs$3 = {
    MobileFetchDTO,
    AccountStatementDTO,
    AccountStatementsDTO,
    BalanceInquiryDTO,
    BeneficiaryAdditionDTO,
    BeneficiaryAdditionVPADTO,
    BeneficiaryValidationDTO,
    BeneRegistrationDTO,
    BeneTransactionRequestDTO,
    CorporateNEFTStatusDTO,
    DeregistrationDTO,
    GenerateOtpDTO,
    OtpCreateDTO: OtpCreateDTO$1,
    RegistrationStatusDTO,
    TransactionDTO,
    TransactionInquiryDTO,
    TransactionOtpDTO,
    UserRegistrationDTO,
    ValidateLinkedAccountDTO,
    VirtualUserCreationDTO,
    FetchBeneListDTO,
    ScheduleApiPaymentDTO,
};

let BaseDTO$2 = class BaseDTO {
};

class UPIPaymentRequestDto extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "device-id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mobile", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "profile-id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "seq-no", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "account-provider", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payee-va", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payer-va", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "remarks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mcc", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "vpa", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payee-name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payee-mcc", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "crpID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "aggrID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "userID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "account-type", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "account-number", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "urn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "global-address-type", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payee-account", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payee-IFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "initiation-mode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "purpose", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "ref-id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "currency", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "capability", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "device-id", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "mobile", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "profile-id", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "seq-no", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "account-provider", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "payee-va", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "payer-va", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "amount", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "remarks", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "mcc", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "vpa", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "payee-name", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "payee-mcc", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "crpID", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "aggrID", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "userID", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "account-type", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "account-number", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "urn", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "global-address-type", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "payee-account", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "payee-IFSC", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "initiation-mode", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "purpose", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "ref-id", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "currency", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UPIPaymentRequestDto.prototype, "capability", void 0);

class UpiPaymentWithBeneIdRequestDto extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "device-id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mobile", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "seq-no", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "account-provider", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payee-va", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payer-va", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "profile-id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mcc", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "remarks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "crpID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "aggrID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "userID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "urn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "aggrName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "ref-id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bnfId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "capability", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UpiPaymentWithBeneIdRequestDto.prototype, "device-id", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UpiPaymentWithBeneIdRequestDto.prototype, "mobile", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UpiPaymentWithBeneIdRequestDto.prototype, "seq-no", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UpiPaymentWithBeneIdRequestDto.prototype, "account-provider", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UpiPaymentWithBeneIdRequestDto.prototype, "payee-va", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UpiPaymentWithBeneIdRequestDto.prototype, "payer-va", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UpiPaymentWithBeneIdRequestDto.prototype, "profile-id", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UpiPaymentWithBeneIdRequestDto.prototype, "amount", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UpiPaymentWithBeneIdRequestDto.prototype, "mcc", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UpiPaymentWithBeneIdRequestDto.prototype, "remarks", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UpiPaymentWithBeneIdRequestDto.prototype, "crpID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UpiPaymentWithBeneIdRequestDto.prototype, "aggrID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UpiPaymentWithBeneIdRequestDto.prototype, "userID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UpiPaymentWithBeneIdRequestDto.prototype, "urn", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UpiPaymentWithBeneIdRequestDto.prototype, "aggrName", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UpiPaymentWithBeneIdRequestDto.prototype, "ref-id", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UpiPaymentWithBeneIdRequestDto.prototype, "bnfId", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UpiPaymentWithBeneIdRequestDto.prototype, "capability", void 0);

class UPIPayStatusCheckRequestDto extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "date", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "recon360", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "seq-no", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "channel-code", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "ori-seq-no", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mobile", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "profile-id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "device-id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UPIPayStatusCheckRequestDto.prototype, "date", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UPIPayStatusCheckRequestDto.prototype, "recon360", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UPIPayStatusCheckRequestDto.prototype, "seq-no", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UPIPayStatusCheckRequestDto.prototype, "channel-code", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UPIPayStatusCheckRequestDto.prototype, "ori-seq-no", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UPIPayStatusCheckRequestDto.prototype, "mobile", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UPIPayStatusCheckRequestDto.prototype, "profile-id", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UPIPayStatusCheckRequestDto.prototype, "device-id", void 0);

class UPIValidationRequestDto extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "device-id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mobile", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "seq-no", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "profile-id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "channel-code", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "virtual-address", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payee-name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIValidationRequestDto.prototype, "device-id", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIValidationRequestDto.prototype, "mobile", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIValidationRequestDto.prototype, "seq-no", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIValidationRequestDto.prototype, "profile-id", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIValidationRequestDto.prototype, "channel-code", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIValidationRequestDto.prototype, "virtual-address", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIValidationRequestDto.prototype, "payee-name", void 0);

class UPIReconRequestDTO extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "date", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "recon360", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "seq-no", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "channel-code", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "ori-seq-no", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mobile", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "profile-id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "device-id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIReconRequestDTO.prototype, "date", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIReconRequestDTO.prototype, "recon360", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIReconRequestDTO.prototype, "seq-no", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIReconRequestDTO.prototype, "channel-code", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIReconRequestDTO.prototype, "ori-seq-no", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIReconRequestDTO.prototype, "mobile", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIReconRequestDTO.prototype, "profile-id", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UPIReconRequestDTO.prototype, "device-id", void 0);

class IMPSPaymentRequestDto extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "localTxnDtTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "beneAccNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "beneIFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "tranRefNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "paymentRef", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "senderName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mobile", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "retailerCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "passCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bcID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "aggrId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "crpId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "crpUsr", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentRequestDto.prototype, "localTxnDtTime", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentRequestDto.prototype, "beneAccNo", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentRequestDto.prototype, "beneIFSC", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentRequestDto.prototype, "amount", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentRequestDto.prototype, "tranRefNo", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentRequestDto.prototype, "paymentRef", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentRequestDto.prototype, "senderName", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentRequestDto.prototype, "mobile", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentRequestDto.prototype, "retailerCode", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentRequestDto.prototype, "passCode", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentRequestDto.prototype, "bcID", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], IMPSPaymentRequestDto.prototype, "aggrId", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], IMPSPaymentRequestDto.prototype, "crpId", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], IMPSPaymentRequestDto.prototype, "crpUsr", void 0);

class IMPSPaymentBeneIdRequestDto extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "localTxnDtTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "beneAccNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "beneIFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "tranRefNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "paymentRef", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "senderName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mobile", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "retailerCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "passCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bcID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "aggrId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "crpId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "crpUsr", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bnfId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "urn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "aggrName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentBeneIdRequestDto.prototype, "localTxnDtTime", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], IMPSPaymentBeneIdRequestDto.prototype, "beneAccNo", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentBeneIdRequestDto.prototype, "beneIFSC", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentBeneIdRequestDto.prototype, "amount", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentBeneIdRequestDto.prototype, "tranRefNo", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentBeneIdRequestDto.prototype, "paymentRef", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentBeneIdRequestDto.prototype, "senderName", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentBeneIdRequestDto.prototype, "mobile", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentBeneIdRequestDto.prototype, "retailerCode", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentBeneIdRequestDto.prototype, "passCode", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentBeneIdRequestDto.prototype, "bcID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentBeneIdRequestDto.prototype, "aggrId", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentBeneIdRequestDto.prototype, "crpId", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentBeneIdRequestDto.prototype, "crpUsr", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentBeneIdRequestDto.prototype, "bnfId", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentBeneIdRequestDto.prototype, "urn", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSPaymentBeneIdRequestDto.prototype, "aggrName", void 0);

class ImpsStatusCheckRequestDto extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "transRefNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "date", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "recon360", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "passCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bcID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "Channel-code", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], ImpsStatusCheckRequestDto.prototype, "transRefNo", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], ImpsStatusCheckRequestDto.prototype, "date", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], ImpsStatusCheckRequestDto.prototype, "recon360", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], ImpsStatusCheckRequestDto.prototype, "passCode", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], ImpsStatusCheckRequestDto.prototype, "bcID", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], ImpsStatusCheckRequestDto.prototype, "Channel-code", void 0);

class IMPSNameMatchRequestDto extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "LocalTxnDtTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BeneAccNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BeneIFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "TranRefNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "Amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "PaymentRef", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "RemMobile", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "RetailerCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "PassCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BcID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "Beneficiary_Name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "RemName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameMatchRequestDto.prototype, "LocalTxnDtTime", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameMatchRequestDto.prototype, "BeneAccNo", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameMatchRequestDto.prototype, "BeneIFSC", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameMatchRequestDto.prototype, "TranRefNo", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameMatchRequestDto.prototype, "Amount", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameMatchRequestDto.prototype, "PaymentRef", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameMatchRequestDto.prototype, "RemMobile", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameMatchRequestDto.prototype, "RetailerCode", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameMatchRequestDto.prototype, "PassCode", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameMatchRequestDto.prototype, "BcID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameMatchRequestDto.prototype, "Beneficiary_Name", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameMatchRequestDto.prototype, "RemName", void 0);

class IMPSNameInquiryRequestDto extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "BeneAccNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BeneIFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "TranRefNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "PaymentRef", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "RemName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "RemMobile", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "RetailerCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "PassCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "Channel", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BcID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "TransactionDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameInquiryRequestDto.prototype, "BeneAccNo", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameInquiryRequestDto.prototype, "BeneIFSC", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameInquiryRequestDto.prototype, "TranRefNo", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameInquiryRequestDto.prototype, "PaymentRef", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameInquiryRequestDto.prototype, "RemName", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameInquiryRequestDto.prototype, "RemMobile", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameInquiryRequestDto.prototype, "RetailerCode", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameInquiryRequestDto.prototype, "PassCode", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameInquiryRequestDto.prototype, "Channel", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameInquiryRequestDto.prototype, "BcID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], IMPSNameInquiryRequestDto.prototype, "TransactionDate", void 0);

class NEFTPaymentRequestDTO extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "tranRefNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "senderAcctNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "beneAccNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "beneName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "beneIFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "narration1", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "narration2", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "crpId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "crpUsr", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "aggrId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "urn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "aggrName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "txnType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "WORKFLOW_REQD", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bnfId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BENLEI", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTPaymentRequestDTO.prototype, "tranRefNo", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTPaymentRequestDTO.prototype, "amount", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTPaymentRequestDTO.prototype, "senderAcctNo", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTPaymentRequestDTO.prototype, "beneAccNo", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTPaymentRequestDTO.prototype, "beneName", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTPaymentRequestDTO.prototype, "beneIFSC", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTPaymentRequestDTO.prototype, "narration1", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], NEFTPaymentRequestDTO.prototype, "narration2", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTPaymentRequestDTO.prototype, "crpId", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTPaymentRequestDTO.prototype, "crpUsr", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTPaymentRequestDTO.prototype, "aggrId", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTPaymentRequestDTO.prototype, "urn", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTPaymentRequestDTO.prototype, "aggrName", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTPaymentRequestDTO.prototype, "txnType", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTPaymentRequestDTO.prototype, "WORKFLOW_REQD", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], NEFTPaymentRequestDTO.prototype, "bnfId", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], NEFTPaymentRequestDTO.prototype, "BENLEI", void 0);

class NEFTTransactionBnfIDRequestDTO extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "tranRefNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "senderAcctNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "beneAccNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "beneName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "beneIFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "narration1", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "narration2", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "crpId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "crpUsr", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "aggrId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "urn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "aggrName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "txnType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "WORKFLOW_REQD", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bnfId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTTransactionBnfIDRequestDTO.prototype, "tranRefNo", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTTransactionBnfIDRequestDTO.prototype, "amount", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTTransactionBnfIDRequestDTO.prototype, "senderAcctNo", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], NEFTTransactionBnfIDRequestDTO.prototype, "beneAccNo", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTTransactionBnfIDRequestDTO.prototype, "beneName", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTTransactionBnfIDRequestDTO.prototype, "beneIFSC", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTTransactionBnfIDRequestDTO.prototype, "narration1", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTTransactionBnfIDRequestDTO.prototype, "narration2", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTTransactionBnfIDRequestDTO.prototype, "crpId", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTTransactionBnfIDRequestDTO.prototype, "crpUsr", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTTransactionBnfIDRequestDTO.prototype, "aggrId", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTTransactionBnfIDRequestDTO.prototype, "urn", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTTransactionBnfIDRequestDTO.prototype, "aggrName", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTTransactionBnfIDRequestDTO.prototype, "txnType", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTTransactionBnfIDRequestDTO.prototype, "WORKFLOW_REQD", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTTransactionBnfIDRequestDTO.prototype, "bnfId", void 0);

class NEFTDebatStatusRequestDTO extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "AGGRID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CORPID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "USERID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "URN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UNIQUEID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTDebatStatusRequestDTO.prototype, "AGGRID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTDebatStatusRequestDTO.prototype, "CORPID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTDebatStatusRequestDTO.prototype, "USERID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTDebatStatusRequestDTO.prototype, "URN", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTDebatStatusRequestDTO.prototype, "UNIQUEID", void 0);

class FundTransferRequestDTO extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "tranRefNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "senderAcctNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "beneAccNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "beneName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "beneIFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "narration1", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "narration2", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "crpId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "crpUsr", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "aggrId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "urn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "aggrName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "txnType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "WORKFLOW_REQD", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], FundTransferRequestDTO.prototype, "tranRefNo", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], FundTransferRequestDTO.prototype, "amount", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], FundTransferRequestDTO.prototype, "senderAcctNo", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], FundTransferRequestDTO.prototype, "beneAccNo", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], FundTransferRequestDTO.prototype, "beneName", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], FundTransferRequestDTO.prototype, "beneIFSC", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], FundTransferRequestDTO.prototype, "narration1", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], FundTransferRequestDTO.prototype, "narration2", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], FundTransferRequestDTO.prototype, "crpId", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], FundTransferRequestDTO.prototype, "crpUsr", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], FundTransferRequestDTO.prototype, "aggrId", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], FundTransferRequestDTO.prototype, "urn", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], FundTransferRequestDTO.prototype, "aggrName", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], FundTransferRequestDTO.prototype, "txnType", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], FundTransferRequestDTO.prototype, "WORKFLOW_REQD", void 0);

class RTGSTransactionRequestDTO extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "AGGRID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CORPID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "USERID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "URN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "AGGRNAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UNIQUEID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "DEBITACC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CREDITACC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "IFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "AMOUNT", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CURRENCY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "TXNTYPE", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "PAYEENAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "REMARKS", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "WORKFLOW_REQD", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bnfId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BENLEI", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionRequestDTO.prototype, "AGGRID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionRequestDTO.prototype, "CORPID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionRequestDTO.prototype, "USERID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionRequestDTO.prototype, "URN", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionRequestDTO.prototype, "AGGRNAME", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionRequestDTO.prototype, "UNIQUEID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionRequestDTO.prototype, "DEBITACC", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionRequestDTO.prototype, "CREDITACC", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionRequestDTO.prototype, "IFSC", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionRequestDTO.prototype, "AMOUNT", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionRequestDTO.prototype, "CURRENCY", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionRequestDTO.prototype, "TXNTYPE", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionRequestDTO.prototype, "PAYEENAME", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionRequestDTO.prototype, "REMARKS", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionRequestDTO.prototype, "WORKFLOW_REQD", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], RTGSTransactionRequestDTO.prototype, "bnfId", void 0);
__decorate([
    IsOptional(),
    __metadata("design:type", String)
], RTGSTransactionRequestDTO.prototype, "BENLEI", void 0);

class RTGSTransactionBnfIDRequestDTO extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "AGGRID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CORPID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "USERID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "URN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UNIQUEID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "DEBITACC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "AGGRNAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CREDITACC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "IFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "AMOUNT", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CURRENCY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "TXNTYPE", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "PAYEENAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "REMARKS", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "WORKFLOW_REQD", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BNFID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionBnfIDRequestDTO.prototype, "AGGRID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionBnfIDRequestDTO.prototype, "CORPID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionBnfIDRequestDTO.prototype, "USERID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionBnfIDRequestDTO.prototype, "URN", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionBnfIDRequestDTO.prototype, "UNIQUEID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionBnfIDRequestDTO.prototype, "DEBITACC", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionBnfIDRequestDTO.prototype, "AGGRNAME", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], RTGSTransactionBnfIDRequestDTO.prototype, "CREDITACC", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionBnfIDRequestDTO.prototype, "IFSC", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionBnfIDRequestDTO.prototype, "AMOUNT", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionBnfIDRequestDTO.prototype, "CURRENCY", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionBnfIDRequestDTO.prototype, "TXNTYPE", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionBnfIDRequestDTO.prototype, "PAYEENAME", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionBnfIDRequestDTO.prototype, "REMARKS", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionBnfIDRequestDTO.prototype, "WORKFLOW_REQD", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSTransactionBnfIDRequestDTO.prototype, "BNFID", void 0);

class RTGSDebitStatusRequestDTO extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "AGGRID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CORPID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "USERID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "URN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UNIQUEID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSDebitStatusRequestDTO.prototype, "AGGRID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSDebitStatusRequestDTO.prototype, "CORPID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSDebitStatusRequestDTO.prototype, "USERID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSDebitStatusRequestDTO.prototype, "URN", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSDebitStatusRequestDTO.prototype, "UNIQUEID", void 0);

class RTGSFundTransferRequestDTO extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "AGGRID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CORPID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "USERID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "URN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "AGGRNAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UNIQUEID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "DEBITACC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CREDITACC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "IFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "AMOUNT", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CURRENCY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "TXNTYPE", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "PAYEENAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "REMARKS", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "WORKFLOW_REQD", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSFundTransferRequestDTO.prototype, "AGGRID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSFundTransferRequestDTO.prototype, "CORPID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSFundTransferRequestDTO.prototype, "USERID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSFundTransferRequestDTO.prototype, "URN", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSFundTransferRequestDTO.prototype, "AGGRNAME", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSFundTransferRequestDTO.prototype, "UNIQUEID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSFundTransferRequestDTO.prototype, "DEBITACC", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSFundTransferRequestDTO.prototype, "CREDITACC", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSFundTransferRequestDTO.prototype, "IFSC", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSFundTransferRequestDTO.prototype, "AMOUNT", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSFundTransferRequestDTO.prototype, "CURRENCY", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSFundTransferRequestDTO.prototype, "TXNTYPE", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSFundTransferRequestDTO.prototype, "PAYEENAME", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSFundTransferRequestDTO.prototype, "REMARKS", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], RTGSFundTransferRequestDTO.prototype, "WORKFLOW_REQD", void 0);

class CIBRegistrationRequestDTO extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "AGGRID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "AGGRNAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CORPID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "USERID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "URN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "ALIASID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], CIBRegistrationRequestDTO.prototype, "AGGRID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], CIBRegistrationRequestDTO.prototype, "AGGRNAME", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], CIBRegistrationRequestDTO.prototype, "CORPID", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], CIBRegistrationRequestDTO.prototype, "USERID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], CIBRegistrationRequestDTO.prototype, "URN", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], CIBRegistrationRequestDTO.prototype, "ALIASID", void 0);

class BeneAdditionIFSCRequestDTO extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "AGGR_ID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CrpId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CrpUsr", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BnfName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BnfNickName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "BnfAccNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "PayeeType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "IFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "URN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], BeneAdditionIFSCRequestDTO.prototype, "AGGR_ID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], BeneAdditionIFSCRequestDTO.prototype, "CrpId", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], BeneAdditionIFSCRequestDTO.prototype, "CrpUsr", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], BeneAdditionIFSCRequestDTO.prototype, "BnfName", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], BeneAdditionIFSCRequestDTO.prototype, "BnfNickName", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], BeneAdditionIFSCRequestDTO.prototype, "BnfAccNo", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], BeneAdditionIFSCRequestDTO.prototype, "PayeeType", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], BeneAdditionIFSCRequestDTO.prototype, "IFSC", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], BeneAdditionIFSCRequestDTO.prototype, "URN", void 0);

class BeneAdditionVPARequestDTO extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "aggrID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "corpID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "userID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "vpa", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "urn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], BeneAdditionVPARequestDTO.prototype, "aggrID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], BeneAdditionVPARequestDTO.prototype, "corpID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], BeneAdditionVPARequestDTO.prototype, "userID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], BeneAdditionVPARequestDTO.prototype, "vpa", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], BeneAdditionVPARequestDTO.prototype, "urn", void 0);

class NEFTStatusRequestDTO extends BaseDTO$2 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "AGGRID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CORPID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "USERID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "URN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UTR", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTStatusRequestDTO.prototype, "AGGRID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTStatusRequestDTO.prototype, "CORPID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTStatusRequestDTO.prototype, "USERID", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTStatusRequestDTO.prototype, "URN", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NEFTStatusRequestDTO.prototype, "UTR", void 0);

const DTOs$2 = {
    UPIPaymentRequestDto,
    UpiPaymentWithBeneIdRequestDto,
    UPIPayStatusCheckRequestDto,
    UPIValidationRequestDto,
    UPIReconRequestDTO,
    IMPSPaymentRequestDto,
    IMPSPaymentBeneIdRequestDto,
    ImpsStatusCheckRequestDto,
    IMPSNameMatchRequestDto,
    IMPSNameInquiryRequestDto,
    NEFTPaymentRequestDTO,
    NEFTTransactionBnfIDRequestDTO,
    NEFTDebatStatusRequestDTO,
    FundTransferRequestDTO,
    RTGSTransactionRequestDTO,
    RTGSTransactionBnfIDRequestDTO,
    RTGSDebitStatusRequestDTO,
    RTGSFundTransferRequestDTO,
    CIBRegistrationRequestDTO,
    BeneAdditionIFSCRequestDTO,
    BeneAdditionVPARequestDTO,
    NEFTStatusRequestDTO,
};

let BaseDTO$1 = class BaseDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
};
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BaseDTO$1.prototype, "merchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BaseDTO$1.prototype, "subMerchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BaseDTO$1.prototype, "terminalId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], BaseDTO$1.prototype, "merchantTranId", void 0);

class CallbackStatus1RequestDTO extends BaseDTO$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "BankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "refId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "TransactionDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "transactionType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CallbackStatus1RequestDTO.prototype, "BankRRN", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CallbackStatus1RequestDTO.prototype, "refId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CallbackStatus1RequestDTO.prototype, "TransactionDate", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CallbackStatus1RequestDTO.prototype, "transactionType", void 0);

class CallbackStatus2RequestDTO extends BaseDTO$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "BankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "refId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "TransactionDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "transactionType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CallbackStatus2RequestDTO.prototype, "BankRRN", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CallbackStatus2RequestDTO.prototype, "refId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CallbackStatus2RequestDTO.prototype, "TransactionDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CallbackStatus2RequestDTO.prototype, "transactionType", void 0);

class CollectPay1RequestDTO extends BaseDTO$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "note", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "collectByDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerVa", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "billNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validatePayerAccFlag", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerAccount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerIFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CollectPay1RequestDTO.prototype, "note", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CollectPay1RequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CollectPay1RequestDTO.prototype, "collectByDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CollectPay1RequestDTO.prototype, "payerVa", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CollectPay1RequestDTO.prototype, "billNumber", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CollectPay1RequestDTO.prototype, "subMerchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CollectPay1RequestDTO.prototype, "merchantName", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CollectPay1RequestDTO.prototype, "validatePayerAccFlag", void 0);
__decorate([
    ValidateIf((c) => c.validatePayerAccFlag === "Y"),
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CollectPay1RequestDTO.prototype, "payerAccount", void 0);
__decorate([
    ValidateIf((c) => c.validatePayerAccFlag === "Y"),
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CollectPay1RequestDTO.prototype, "payerIFSC", void 0);

class CollectPay2RequestDTO extends CollectPay1RequestDTO {
}

class CollectPay3RequestDTO extends CollectPay1RequestDTO {
}

class merchantIdDTO extends BaseDTO$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "payerVa", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "note", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "collectByDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "billNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validatePayerAccFlag", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerAccount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerIFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], merchantIdDTO.prototype, "payerVa", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], merchantIdDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], merchantIdDTO.prototype, "note", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], merchantIdDTO.prototype, "collectByDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], merchantIdDTO.prototype, "merchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], merchantIdDTO.prototype, "subMerchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], merchantIdDTO.prototype, "billNumber", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], merchantIdDTO.prototype, "validatePayerAccFlag", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], merchantIdDTO.prototype, "payerAccount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], merchantIdDTO.prototype, "payerIFSC", void 0);

class CollectPayRequestDTO {
    constructor() {
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CollectPayRequestDTO.prototype, "amount", void 0);
__decorate([
    IsObject(),
    IsNotEmpty(),
    __metadata("design:type", merchantIdDTO)
], CollectPayRequestDTO.prototype, "merchantId", void 0);

class CreateMandateRequestDTO extends CollectPay1RequestDTO {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "validityStartDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validityEndDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amountLimit", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "remark", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "requestType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "frequency", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "autoExecute", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "debitDay", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "debitRule", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "revokable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "blockfund", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "purpose", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "ValidatePayerAccFlag", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UMN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "validityStartDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "validityEndDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "amountLimit", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "remark", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "requestType", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "frequency", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "autoExecute", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "debitDay", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "debitRule", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "revokable", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "blockfund", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "purpose", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "ValidatePayerAccFlag", void 0);
__decorate([
    ValidateIf((c) => c.requestType === "R" || c.requestType === "U"),
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateMandateRequestDTO.prototype, "UMN", void 0);

class CreateVouchersRequestDTO {
    constructor() {
        Object.defineProperty(this, "beneficiaryID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mobileNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "beneficiaryName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "expiry", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "purposeCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mcc", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "VoucherRedemptionType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "PayerVA", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "type", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "beneficiaryID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "mobileNumber", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "beneficiaryName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "expiry", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "purposeCode", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "mcc", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "VoucherRedemptionType", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "PayerVA", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "type", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "merchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "subMerchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CreateVouchersRequestDTO.prototype, "merchantTranId", void 0);

class DelayedSettlementsRequestDTO {
    constructor() {
        Object.defineProperty(this, "UUID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UMN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "releaseMoneyTo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "beneficiaryIdentifier", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], DelayedSettlementsRequestDTO.prototype, "UUID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], DelayedSettlementsRequestDTO.prototype, "UMN", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], DelayedSettlementsRequestDTO.prototype, "releaseMoneyTo", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], DelayedSettlementsRequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], DelayedSettlementsRequestDTO.prototype, "beneficiaryIdentifier", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], DelayedSettlementsRequestDTO.prototype, "merchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], DelayedSettlementsRequestDTO.prototype, "merchantTranId", void 0);

class ExecuteMandateRequestDTO extends BaseDTO$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "merchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "billNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "remark", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "retryCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mandateSeqNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UMN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "purpose", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ExecuteMandateRequestDTO.prototype, "merchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ExecuteMandateRequestDTO.prototype, "subMerchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ExecuteMandateRequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ExecuteMandateRequestDTO.prototype, "billNumber", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ExecuteMandateRequestDTO.prototype, "remark", void 0);
__decorate([
    ValidateIf((c) => c.purpose === "RECURRING"),
    IsNotEmpty(),
    __metadata("design:type", Number)
], ExecuteMandateRequestDTO.prototype, "retryCount", void 0);
__decorate([
    ValidateIf((c) => c.purpose === "RECURRING"),
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ExecuteMandateRequestDTO.prototype, "mandateSeqNo", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ExecuteMandateRequestDTO.prototype, "UMN", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ExecuteMandateRequestDTO.prototype, "purpose", void 0);

class MandateNotificationRequestDTO extends BaseDTO$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "payerVa", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "note", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "executionDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mandateSeqNo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "key", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "value", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], MandateNotificationRequestDTO.prototype, "payerVa", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], MandateNotificationRequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], MandateNotificationRequestDTO.prototype, "note", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], MandateNotificationRequestDTO.prototype, "executionDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], MandateNotificationRequestDTO.prototype, "mandateSeqNo", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], MandateNotificationRequestDTO.prototype, "key", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], MandateNotificationRequestDTO.prototype, "value", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], MandateNotificationRequestDTO.prototype, "merchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], MandateNotificationRequestDTO.prototype, "subMerchantName", void 0);

class QR1RequestDTO {
    constructor() {
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "billNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "billNumber2", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR1RequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR1RequestDTO.prototype, "billNumber", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR1RequestDTO.prototype, "billNumber2", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR1RequestDTO.prototype, "merchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR1RequestDTO.prototype, "terminalId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR1RequestDTO.prototype, "merchantTranId", void 0);

class QR2RequestDTO {
    constructor() {
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "billNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR2RequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR2RequestDTO.prototype, "billNumber", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR2RequestDTO.prototype, "merchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR2RequestDTO.prototype, "terminalId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR2RequestDTO.prototype, "merchantTranId", void 0);

class QR3RequestDTO {
    constructor() {
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "billNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validatePayerAccFlag", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerAccount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerIFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "signedIntentFlag", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validityStartDateTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validityEndDateTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "update", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "refId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "signIntentFlag", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "billNumber", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "validatePayerAccFlag", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "payerAccount", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "payerIFSC", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "signedIntentFlag", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "merchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "terminalId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "merchantTranId", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "validityStartDateTime", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "validityEndDateTime", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "update", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "refId", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], QR3RequestDTO.prototype, "signIntentFlag", void 0);

class QRRequestDTO {
    constructor() {
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "billNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "update", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validityStartDateTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "signedIntentFlag", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerAccount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validityEndDateTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerIFSC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "ValidatePayerAccFlag", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "refId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "billNumber", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "update", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "validityStartDateTime", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "signedIntentFlag", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "payerAccount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "validityEndDateTime", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "payerIFSC", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "ValidatePayerAccFlag", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "refId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "merchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "terminalId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], QRRequestDTO.prototype, "merchantTranId", void 0);

class RedeemVoucherRequestDTO extends BaseDTO$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "merchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "MCC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "txnNote", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UUID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UMN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "OTP", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "note", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RedeemVoucherRequestDTO.prototype, "merchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RedeemVoucherRequestDTO.prototype, "subMerchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RedeemVoucherRequestDTO.prototype, "MCC", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RedeemVoucherRequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RedeemVoucherRequestDTO.prototype, "txnNote", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RedeemVoucherRequestDTO.prototype, "UUID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RedeemVoucherRequestDTO.prototype, "UMN", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RedeemVoucherRequestDTO.prototype, "OTP", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RedeemVoucherRequestDTO.prototype, "note", void 0);

class Refund1RequestDTO extends BaseDTO$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "originalBankRRN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "originalmerchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payeeVA", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "refundAmount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "note", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "onlineRefund", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], Refund1RequestDTO.prototype, "originalBankRRN", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], Refund1RequestDTO.prototype, "originalmerchantTranId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], Refund1RequestDTO.prototype, "payeeVA", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], Refund1RequestDTO.prototype, "refundAmount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], Refund1RequestDTO.prototype, "note", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], Refund1RequestDTO.prototype, "onlineRefund", void 0);

class Refund2RequestDTO extends Refund1RequestDTO {
}

class RefundRequestDTO extends Refund1RequestDTO {
}

class TransactionStatus1RequestDTO extends BaseDTO$1 {
}

class TransactionStatus2RequestDTO extends BaseDTO$1 {
}

class TransactionStatus3RequestDTO extends BaseDTO$1 {
}

class TransactionstatusbycriteriaRequestDTO extends BaseDTO$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "transactionType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UMN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], TransactionstatusbycriteriaRequestDTO.prototype, "transactionType", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], TransactionstatusbycriteriaRequestDTO.prototype, "UMN", void 0);

class TransactionStatusRequestDTO extends BaseDTO$1 {
}

class ValidateVoucherRequestDTO extends BaseDTO$1 {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "merchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "MCC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "txnNote", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validityStartDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validityEndDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UMN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amRule", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "pa", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "sign", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "orgId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "purpose", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "merchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "subMerchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "MCC", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "txnNote", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "validityStartDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "validityEndDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "UMN", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "amRule", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "pa", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "sign", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "orgId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "purpose", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ValidateVoucherRequestDTO.prototype, "mode", void 0);

class RevokeMandateRequestDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerVa", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "note", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "collectByDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "billNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "requestType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "R"
        });
        Object.defineProperty(this, "validityStartDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validityEndDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amountLimit", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "remark", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "frequency", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "autoExecute", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "N"
        });
        Object.defineProperty(this, "debitDay", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "debitRule", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "revokable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "Y"
        });
        Object.defineProperty(this, "blockfund", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "purpose", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UMN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "merchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "subMerchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "terminalId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "merchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "subMerchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "payerVa", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "note", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "collectByDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "merchantTranId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "billNumber", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "requestType", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "validityStartDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "validityEndDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "amountLimit", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "remark", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "frequency", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "autoExecute", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "debitDay", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "debitRule", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "revokable", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "blockfund", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "purpose", void 0);
__decorate([
    ValidateIf((c) => c.requestType === "R" || c.requestType === "U"),
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], RevokeMandateRequestDTO.prototype, "UMN", void 0);

class UpdateMandateRequestDTO {
    constructor() {
        Object.defineProperty(this, "merchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "terminalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "subMerchantName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payerVa", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "note", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "collectByDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "merchantTranId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "billNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validityStartDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validityEndDate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "amountLimit", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "remark", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "requestType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "U"
        });
        Object.defineProperty(this, "frequency", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "autoExecute", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "N"
        });
        Object.defineProperty(this, "debitDay", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "debitRule", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "revokable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "blockfund", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "purpose", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UMN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "merchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "subMerchantId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "terminalId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "merchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "subMerchantName", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "payerVa", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "amount", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "note", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "collectByDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "merchantTranId", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "billNumber", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "validityStartDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "validityEndDate", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "amountLimit", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "remark", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "requestType", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "frequency", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "autoExecute", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "debitDay", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "debitRule", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "revokable", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "blockfund", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "purpose", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], UpdateMandateRequestDTO.prototype, "UMN", void 0);

const DTOs$1 = {
    CallbackStatus1RequestDTO,
    CallbackStatus2RequestDTO,
    CollectPay1RequestDTO,
    CollectPay2RequestDTO,
    CollectPay3RequestDTO,
    CollectPayRequestDTO,
    CreateMandateRequestDTO,
    CreateVouchersRequestDTO,
    DelayedSettlementsRequestDTO,
    ExecuteMandateRequestDTO,
    MandateNotificationRequestDTO,
    QR1RequestDTO,
    QR2RequestDTO,
    QR3RequestDTO,
    QRRequestDTO,
    RedeemVoucherRequestDTO,
    Refund1RequestDTO,
    Refund2RequestDTO,
    RefundRequestDTO,
    TransactionStatus1RequestDTO,
    TransactionStatus2RequestDTO,
    TransactionStatus3RequestDTO,
    TransactionstatusbycriteriaRequestDTO,
    TransactionStatusRequestDTO,
    ValidateVoucherRequestDTO,
    RevokeMandateRequestDTO,
    UpdateMandateRequestDTO,
};

class BaseDTO {
}

class CibBulkPaymentRequestDTO extends BaseDTO {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "FILE_DESCRIPTION", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "AGGR_ID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "URN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "AGGR_NAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "USER_ID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CORP_ID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UNIQUE_ID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "AGOTP", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "FILE_NAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "FILE_CONTENT", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CibBulkPaymentRequestDTO.prototype, "FILE_DESCRIPTION", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CibBulkPaymentRequestDTO.prototype, "AGGR_ID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CibBulkPaymentRequestDTO.prototype, "URN", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CibBulkPaymentRequestDTO.prototype, "AGGR_NAME", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CibBulkPaymentRequestDTO.prototype, "USER_ID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CibBulkPaymentRequestDTO.prototype, "CORP_ID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CibBulkPaymentRequestDTO.prototype, "UNIQUE_ID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CibBulkPaymentRequestDTO.prototype, "AGOTP", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CibBulkPaymentRequestDTO.prototype, "FILE_NAME", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], CibBulkPaymentRequestDTO.prototype, "FILE_CONTENT", void 0);

class OtpCreateDTO extends BaseDTO {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "AGGRID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "AGGRNAME", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CORPID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "USERID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "URN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UNIQUEID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], OtpCreateDTO.prototype, "AGGRID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], OtpCreateDTO.prototype, "AGGRNAME", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], OtpCreateDTO.prototype, "CORPID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], OtpCreateDTO.prototype, "USERID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], OtpCreateDTO.prototype, "URN", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], OtpCreateDTO.prototype, "UNIQUEID", void 0);

class ReverseMisRequestDTO extends BaseDTO {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "AGGRID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CORPID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "USERID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "URN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "FILESEQNUM", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "ISENCRYPTED", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "UNIQUEID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "AGOTP", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
}
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ReverseMisRequestDTO.prototype, "AGGRID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ReverseMisRequestDTO.prototype, "CORPID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ReverseMisRequestDTO.prototype, "USERID", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ReverseMisRequestDTO.prototype, "URN", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ReverseMisRequestDTO.prototype, "FILESEQNUM", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], ReverseMisRequestDTO.prototype, "ISENCRYPTED", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ReverseMisRequestDTO.prototype, "UNIQUEID", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ReverseMisRequestDTO.prototype, "AGOTP", void 0);

const DTOs = {
    CibBulkPaymentRequestDTO,
    ReverseMisRequestDTO,
    OtpCreateDTO,
};

var _a;
const DTOMapper = {
    ...DTOs$3,
    ...DTOs$2,
    ...DTOs$1,
    ...DTOs,
};
class DTOService {
    static getDTOClass(dtoKey, module) {
        try {
            const DtoClass = DTOMapper[dtoKey];
            if (!DtoClass) {
                logger.warn(`No DTO class found for: ${dtoKey}`);
                throw new Error(`No DTO class found for: ${dtoKey}`);
            }
            return DtoClass;
        }
        catch (error) {
            if (error.code === "MODULE_NOT_FOUND") {
                logger.warn(`Module '${module}' Not Found`);
                throw new Error(`Module '${module}' Not Found`);
            }
            else {
                logger.warn(`Error loading DTO class for: ${dtoKey}`);
                throw new Error(`Error loading DTO class for: ${dtoKey}`);
            }
        }
    }
    static validateDTO(payload) {
        const errors = validateSync(payload);
        if (errors.length > 0) {
            const errorMessages = errors
                .map((err) => Object.values(err.constraints || {}))
                .flat();
            throw new Error(`Validation failed: ${errorMessages.join(", ")}`);
        }
    }
}
_a = DTOService;
Object.defineProperty(DTOService, "getRequestDTO", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (payload, module, dtoKey) => {
        const DtoClass = _a.getDTOClass(dtoKey, module);
        const dtoObject = new DtoClass();
        Object.keys(dtoObject).forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(payload, key)) {
                dtoObject[key] = payload[key];
            }
        });
        _a.validateDTO(dtoObject);
        return dtoObject;
    }
});
Object.defineProperty(DTOService, "getResponseDTO", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (response, module, dtoKey) => {
        const DtoClass = _a.getDTOClass(dtoKey, module);
        const data = Object.assign(new DtoClass(), response);
        return data;
    }
});

class SdkClient {
}
Object.defineProperty(SdkClient, "execute", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: async (apiId, module, payload) => {
        const notDynamicIds = [
            "3001",
            "3002",
            "3003",
            "3004",
            "3005",
            "3006",
            "3007",
            "3008",
            "3009",
            "3010",
            "3011",
            "3012",
            "3026",
            "3027",
        ];
        if (!apiId || !module || !payload) {
            logger.info("apiId, module, or payload is not provided");
            throw new Error("apiId, module, or payload is not provided");
        }
        const apiBaseUrl = UtilsService.getIciciApiBaseUrl();
        const apiConfig = await UtilsService.getAPIConfig();
        if (!apiConfig) {
            logger.info("Api Configuration not found");
            throw new Error("Api Configuration not found");
        }
        const api = apiConfig[apiId];
        if (!api) {
            logger.info("Api Configuration not subscribed");
            throw new Error("Api Configuration not subscribed");
        }
        if (api.category === "cib") {
            UtilsService.moduleName = "corporate";
            api.apikey = UtilsService.getModuleApiKey("corporate");
        }
        else {
            UtilsService.moduleName = module.toLowerCase();
        }
        let requestPayload;
        if (module.toLowerCase() === "cibbulk" && apiId === "4001") {
            const newpayload = DTOService.getRequestDTO(payload, module, api.requestDtoType);
            const decodedCode = await UtilsService.readBulkRequestFile(newpayload.FILE_CONTENT);
            requestPayload = { ...newpayload, FILE_CONTENT: decodedCode };
        }
        else {
            requestPayload = DTOService.getRequestDTO(payload, module, api.requestDtoType);
        }
        const fingerPrint = await Crypto.generateFingerprint(JSON.stringify(requestPayload), api.apikey, UtilsService.moduleName);
        logger.info("apikey " + api.apikey);
        const headers = {
            ...api.headers,
            apikey: api.apikey,
            "X-ID-Fingerprint": fingerPrint,
        };
        if (api.priority) {
            headers["x-priority"] = api.apiId === "2010" ? "0010" : api.priority;
        }
        let endpointUrl = "";
        if (process.env.SV_ENABLE === "true" &&
            process.env.ENV_TYPE?.toLowerCase() === "uat" &&
            api.svPath) {
            endpointUrl = apiBaseUrl + api.svPath;
        }
        else {
            endpointUrl = apiBaseUrl + api.basePath + api.endpoint;
        }
        if (module.toLowerCase() === "eazypay") {
            if (!notDynamicIds.includes(api.apiId)) {
                if (!payload.merchantId) {
                    throw new Error("merchantId is required for dynamic APIs");
                }
                endpointUrl += `/${payload.merchantId}`;
            }
        }
        logger.info("endpointUrl " + endpointUrl);
        logger.info("requestPayload ", requestPayload);
        const response = apiService.post(endpointUrl, requestPayload, {
            headers,
        });
        response.then((resp) => logger.info("response", resp));
        return response;
    }
});
Object.defineProperty(SdkClient, "decryptCallback", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: async (data, moduleName) => {
        const decryptedValue = await Crypto.decrypt(data.encryptedData, data.encryptedKey, moduleName);
        return decryptedValue;
    }
});
Object.defineProperty(SdkClient, "encryptEcollection", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: async (data, moduleName) => {
        const encryptedRequest = await Crypto.encrypt(JSON.stringify(data), moduleName);
        const encData = encryptedRequest;
        return encData;
    }
});

export { SdkClient };
