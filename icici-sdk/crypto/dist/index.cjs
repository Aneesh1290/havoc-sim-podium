'use strict';

var winston = require('winston');
var fs = require('fs');
var path = require('path');
var require$$1 = require('os');
var require$$3 = require('crypto');
var forge = require('node-forge');

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

const rootDir = path.resolve(__dirname, "../../");
dotenv.config({ path: path.join(rootDir, ".env") });
const dirname$1 = directory();
const logDirectory = path.join(dirname$1, "..", "..", "logs");
const logFile = path.join(logDirectory, "sdk.log");
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
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

var _a$2;
const dirname = directory();
const envPath$1 = path.resolve(__dirname, "../../.env");
mainExports.config({ path: envPath$1 });
class UtilsService {
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
}
_a$2 = UtilsService;
Object.defineProperty(UtilsService, "readFileFromPath", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: async (filePath) => {
        try {
            const data = await fs.promises.readFile(filePath, "utf-8");
            return data;
        }
        catch (error) {
            logger.error("Unable to read file from given path" + error?.message);
            return null;
        }
    }
});
Object.defineProperty(UtilsService, "getServerPublicKey", {
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
Object.defineProperty(UtilsService, "keystorePath", {
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

var _a$1;
class EncryptService {
}
_a$1 = EncryptService;
Object.defineProperty(EncryptService, "generateSHA512Hash", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (payload) => {
        return require$$3.createHash("sha512").update(payload, "utf8").digest("hex");
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
        const serverPublicKey = await UtilsService.getServerPublicKey(moduleName);
        if (!serverPublicKey) {
            logger.error("Server public key not found");
            throw new Error("Server public key not found");
        }
        const publicKeyPEM = serverPublicKey
            .replace("-----BEGIN PUBLIC KEY-----", "")
            .replace("-----END PUBLIC KEY-----", "")
            .replace(/\s/g, "");
        const decoded = Buffer.from(publicKeyPEM, "base64");
        const publicKey = require$$3.createPublicKey({
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
            const cipher = require$$3.createCipheriv("aes-256-cbc", keyBytes, ivBytes);
            let encrypted = cipher.update(value, "utf8", "base64");
            encrypted += cipher.final("base64");
            const ivEncrypted = Buffer.concat([
                ivBytes,
                Buffer.from(encrypted, "base64"),
            ]);
            return ivEncrypted.toString("base64");
        }
        catch (error) {
            logger.error("Error encrypting the message:" + error?.message);
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
            const encryptedBytes = require$$3.publicEncrypt({
                key: serverPublicKey,
                padding: require$$3.constants.RSA_PKCS1_PADDING,
            }, decodedAesKey);
            return encryptedBytes.toString("base64");
        }
        catch (error) {
            logger.error("Error encrypting the message:" + error?.message);
            throw new Error("Error encrypting the message" + error?.message);
        }
    }
});
Object.defineProperty(EncryptService, "encrypt", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: async (data, moduleName) => {
        const aesKey = _a$1.generateRandomKey(32);
        const base64Key = Buffer.from(aesKey).toString("base64");
        const initialVector = _a$1.generateRandomKey(16);
        const encryptedData = _a$1.encryptData(aesKey, initialVector, data);
        const serverPublicKey = await _a$1.getServerPublicKey(moduleName);
        const encryptedKey = _a$1.encryptKey(base64Key, serverPublicKey);
        return { encryptedData, encryptedKey, initialVector };
    }
});
Object.defineProperty(EncryptService, "generateFingerprint", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: async (payload, apikey, moduleName) => {
        try {
            const sha512Hash = _a$1.generateSHA512Hash(payload);
            const fingerprint = `${apikey}|${sha512Hash}`;
            const base64IdFingerPrint = Buffer.from(fingerprint).toString("base64");
            const serverPublicKey = await _a$1.getServerPublicKey(moduleName);
            const encryptedIdFingerPrint = _a$1.encryptKey(base64IdFingerPrint, serverPublicKey);
            return encryptedIdFingerPrint;
        }
        catch (error) {
            logger.error("Error generating X-ID Fingerprint Header:" + error?.message);
            throw new Error("Fingerprint generation failed.");
        }
    }
});

var _a;
const envPath = path.resolve(__dirname, "../../.env");
mainExports.config({ path: envPath });
class DecryptService {
}
_a = DecryptService;
Object.defineProperty(DecryptService, "getPrivateKeyFromP12", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: async (keystorePath, keystorePassword, alias) => {
        const p12Content = fs.readFileSync(keystorePath, "binary");
        if (!p12Content || p12Content.length <= 1) {
            logger.error("p12 keystore content is empty");
            throw new Error("p12 keystore content is empty");
        }
        const p12Asn1 = forge.asn1.fromDer(p12Content, false);
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, keystorePassword);
        if (!p12) {
            logger.error("Failed to load p12 keystore");
            throw new Error("Failed to load p12 keystore");
        }
        const keyBags = p12.getBags({
            friendlyName: alias,
            bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
        }).friendlyName;
        if (!keyBags || keyBags.length === 0) {
            logger.error("Failed to load private key from p12 keystore");
            throw new Error("Failed to load private key from p12 keystore");
        }
        const keyObj = keyBags[0];
        if (!keyObj.key) {
            logger.error("Failed to load private key from p12 keystore");
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
            logger.error("Key Decryption error:" + error?.message);
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
            const decipher = require$$3.createDecipheriv("aes-128-cbc", secretKey, iv);
            const decrypted = Buffer.concat([
                decipher.update(ciphertext),
                decipher.final(),
            ]);
            return decrypted.toString("utf8");
        }
        catch (error) {
            logger.error("Decryption error:" + error?.message);
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
            logger.info("Encrypted Response : " + encryptedData);
            let privateKey;
            const { pempath } = UtilsService.getKeyStoreConfig(moduleName);
            if (pempath && fs.existsSync(pempath)) {
                logger.info(`Using PEM file for decryption: ${pempath}`);
                privateKey = _a.getPrivateKeyFromPem(pempath);
                if (!privateKey) {
                    logger.error("Failed to load private key from PEM file.");
                    throw new Error("Failed to load private key from PEM file.");
                }
            }
            else {
                const { keystorePath, alias, keystorePassword } = UtilsService.getKeyStoreConfig(moduleName);
                if (!keystorePath || !keystorePassword || !alias) {
                    logger.warn("Keystore path, password, or alias is not provided.");
                    throw new Error("Keystore path, password, or alias is not provided.");
                }
                logger.info(`Using P12 keystore for decryption: ${keystorePath}`);
                privateKey = await _a.getPrivateKeyFromP12(keystorePath, keystorePassword, alias);
                if (!privateKey) {
                    logger.error("Failed to load private key from P12 keystore.");
                    throw new Error("Failed to load private key from P12 keystore.");
                }
            }
            const decryptedKey = _a.decryptKey(encryptedKey, privateKey);
            if (!decryptedKey) {
                logger.error("Failed to decrypt the encrypted key using RSA.");
                throw new Error("Failed to decrypt the encrypted key using RSA.");
            }
            const decryptedData = _a.decryptData(encryptedData, decryptedKey);
            if (!decryptedData) {
                logger.error("Failed to decrypt the encrypted data using AES.");
                throw new Error("Failed to decrypt the encrypted data using AES.");
            }
            return decryptedData;
        }
        catch (error) {
            logger.error("Unexpected error during decryption: " + error?.message);
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
            logger.error("data is required and must be a string, stringify in case of object");
            throw new Error("data is required and must be a string, stringify in case of object");
        }
        const { encryptedKey, encryptedData } = await EncryptService.encrypt(data, moduleName);
        logger.info("Encrypted payload : " + encryptedData);
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
            logger.error("encryptedData and encryptedKey are required");
            throw new Error("encryptedData and encryptedKey are required");
        }
        const decryptedResponse = await DecryptService.decrypt(encryptedData, encryptedKey, moduleName);
        return decryptedResponse;
    }
    static async generateFingerprint(payload, apikey, moduleName = "default") {
        if (!payload || !apikey) {
            logger.error("payload and apikey are required");
            throw new Error("payload and apikey are required");
        }
        const fingerprint = await EncryptService.generateFingerprint(payload, apikey, moduleName);
        return fingerprint;
    }
}

exports.Crypto = Crypto;
