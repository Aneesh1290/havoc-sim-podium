# ICICI SDK Integration User Guide

This document guides the merchant backend teams Node.js on how to integrate the SDK client delivered to them.

## Introduction

This SDK client provides a comprehensive toolset for interacting with the ICICI Banking services.

The SDK simplifies integration with the APIs and provides customizable configuration options for users.

This manual will guide through building, configuring, and integrating with deployable components.

## Merchant Integration

The Merchant receives the SDK Client Distribution in a zip file named `sdk-distribution.zip`.

## Verify the Zip File

- Check the deliverables received and ensure it is shared securely through a proper channel.
- Use `sdk-client-hash.txt` with SHA-256 to verify the integrity and ensure contents are not corrupted.
- To verify the zip file open any terminal/command prompt tool in your machine.
- To verify the SHA-256 Hash follow below commands.

Run the following command, replacing `path\to\sdk-distribution.zip` with the actual path to sdk-distribution.zip zip file:

For Windows machine use the following Get-FileHash tool
Comand to use: <br>

```shell
Get-FileHash -Algorithm SHA256 "path\to\sdk-distribution.zip"
```

When using a Command Prompt without PowerShell, need to use tools like certutil:

```shell
certutil -hashfile "path\to\sdk-distribution.zip" SHA256
```

On Linux/macOS machine

Run the following command, replacing `path/to/sdk-distribution.zip` with the actual path to `sdk-distribution.zip` zip file: <br>

```shell
shasum -a 256 path/to/sdk-distribution.zip
```

Alternative Command (if _shasum_ is not available):

```shell
sha256sum path/to/sdk-distribution.zip
```

Compare the output hash with the SHA-256 hash stored in `sdk-client-hash.txt`.

If the hashes match, the file’s integrity is verified successfully, start with Unzip process. otherwise contact `support` team.

## Unzip the `sdk-distribution`

- Unzip the contents safely using `tar` (Unix) or `unzip` (Windows) commands.
- Unzip commands to verify in Windows or Unix environments.

.tar command for Windows (Command Prompt or PowerShell)

```
tar -xf sdk-distribution.zip
```

.unzip command for Unix (Linux or macOS Terminal)

```
unzip sdk-distribution.zip
```

- Change the directory to the root folder `sdk-distribution` after unzipping.

`cd sdk-distribution`

`sdk-distribution` folder structure looks like below:

```node
sdk-distribution/
├── eazypay/
│   ├── dist/
│   │   ├── bundle.d.ts
│   │   ├── index.cjs
│   │   ├── index.mjs
│   └── package.json
├── config/
│   ├── sdk-api-config.json
│   └── server-public-key.pem
├── corporate/
│   ├── dist/
│   │   ├── bundle.d.ts
│   │   ├── index.cjs
│   │   ├── index.mjs
│   └── package.json
├── eazypay/
│   ├── dist/
│   │   ├── bundle.d.ts
│   │   ├── index.cjs
│   │   ├── index.mjs
│   └── package.json
├── http-core/
│   ├── dist/
│   │   ├── bundle.d.ts
│   │   ├── index.cjs
│   │   ├── index.mjs
│   └── package.json
```

## System Requirements

Now before integrating ensure the following System requirements are met.

To ensure compatibility, make sure the system meets the following requirements:

- **Node Version**: Node 16 or higher (Node v22 is recommended)
- **Operating System**: Windows, macOS, or Linux

## Integrating the APIs

Go to the folder `sdk-ditribution/config/sdk-api-config.json` <br>
All the collection of API configurations are available here categorized by products.<br>
Choose the API want to integrate with, for example, MobileFetch API from `CIB` product. <br>

Module wise collection looks like this:

```json
{
  "corporate": {
    "headers": {},
    "apis": [{}]
  },
  "eazypay": {
    "headers": {},
    "apis": [{}]
  },
  "eazypay": {
    "headers": {},
    "apis": [{}]
  }
}
```

The API Configuration for a API looks like this:

```json
{
  "amount": "5.00",
  "merchantId": "118449",
  "terminalId": "5411",
  "merchantTranId": "p0nillp0k9lqp091p17",
  "billNumber": "sdfpo111b",
  "category": "upi",
  "requestDtoType": "QR3RequestDTO",
  "responseDtoType": "QR3ResponseDTO"
}
```

### API JSON Configuration Explained

This JSON configuration provides details for a specific API, named **"Mobile Fetch,"** which is used for making API calls to retrieve mobile-related data. Each field in this JSON defines critical information necessary to integrate with and make requests to the API.

### JSON Fields Explained

**1. apiId**: `"3025"`

- A unique identifier for the API. This ID is often used by the SDK or client application to identify the API configuration for "Mobile Fetch."

**2. apiName**: `"CallbackStatus2"`

- A descriptive name for the API, indicating the functionality it provides. In this case, it retrieves mobile-related information.

**3. description**: `"CallbackStatus2"`

- Additional information or description of the API, explaining its purpose. Here, it simply repeats the API’s name, but it could contain more details if needed.

**4. endpoint**: `"/CallbackStatus2/400899"`

- The specific endpoint path for the API. This is appended to the base path to form the complete URL. For example, with `basePath` as `/MerchantAPI/UPI/v0`, the full API path becomes `/MerchantAPI/UPI/v0/CallbackStatus2/400899`.

**5. basePath**: `"/MerchantAPI/UPI/v0"`

- The base path or root path for the API service. It often indicates the API version and organizational structure (`eazypay` in this case).
- This is combined with the `endpoint` to form the complete URL for API requests.

**6. method**: `"POST"`

- The HTTP method to use for this API request. `POST` indicates that this API requires a request body, which will likely contain necessary data (e.g., mobile number) to retrieve the relevant information.

**7. headers**:

```json
{
  "Content-Type": "application/json"
}
```

- An object defining the HTTP headers required by the API. In this example:
- Content-Type: Specifies that the request and response data format is application/json.

**8. requestDtoType**: `"CallbackStatus2RequestDTO"`

- The fully qualified Java class name for the data transfer object (DTO) that structures the API request data.
- `CallbackStatus2RequestDTO` represents the request payload structure for the "Mobile Fetch" API, encapsulating fields that the API expects in the request body.

**9. responseDtoType**: `"CallbackStatus2ResponseDTO"`

- The fully qualified Java class name for the response DTO that structures the API’s response data.
- `CallbackStatus2ResponseDTO` defines the expected structure of the response, allowing the client to easily parse and process the information returned by the API.

### Using the `SDKClient.execute` Method

The `SDKClient.execute` method is the main entry point for interacting with APIs in this SDK. It provides an overloaded method to support calling different APIs by specifying the API ID, module name, and request DTO type. This design allows flexibility for calling various API endpoints with a single method that returns a generic response.

# **ICICI SDK Integration Guide**

## **Overview**

The ICICI SDK allows seamless integration with ICICI Bank's APIs. This guide provides details on the modules, installation steps, and examples for calling APIs using JavaScript or TypeScript.

---

## **Modules**

The SDK is organized into the following modules:

| Module             | Description                                        |
| ------------------ | -------------------------------------------------- |
| `@icici/composite` | Contains request/response DTOs for eazypay APIs. |
| `@icici/corporate` | Contains request/response DTOs for corporate APIs. |
| `@icici/eazypay`   | Contains request/response DTOs for Eazypay APIs.   |
| `@icici/http-core` | Provides core services for API communication.      |

---

## **Installation**

### **Step 1: Extract the SDK**

Extract the provided ZIP file and add the modules to your `package.json` dependencies:

```json
{
  "dependencies": {
    "@icici/composite": "file:./path-to-extracted-release/composite",
    "@icici/corporate": "file:./path-to-extracted-release/corporate",
    "@icici/eazypay": "file:./path-to-extracted-release/eazypay",
    "@icici/http-core": "file:./path-to-extracted-release/http-core"
  }
}
```

### **Step 2: Install Dependencies**

Install the required peer dependencies in your Node.js project:

```json
{
  "dependencies": {
    "axios": "^1.7.8",
    "class-validator": "^0.14.1",
    "node-forge": "^1.3.1",
    "tslib": "^2.8.1",
    "winston": "^3.17.0"
  }
}
```

Run the following command:

```bash
npm install --save axios class-validator node-forge tslib winston
```

---

#### Keystore Details (PKCS#12)

- **Keystore**: A secure storage mechanism for cryptographic keys and certificates, often used to manage sensitive information in applications.
- **Private Key**: This key is essential for decryption and signing data. It is crucial that this key remains confidential to maintain the security of the application.
- **Alias**: A unique identifier for a specific key or certificate within the keystore. It is referenced during operations to ensure the correct key is used.

## Environment Setup

If you already have a project and a `.env` file and want to integrate the SDK, just add our `.env` values to your existing `.env` file.  
Otherwise, create a new `.env` file in the root directory and add the required values there.


### **Step 3: Set Environment Variables**

Before accessing SDKClient in your application, you need to set the following environment variables

- EAZYPAY_KEYSTORE_PATH
- EAZYPAY_KEYSTORE_PASSWORD
- EAZYPAY_KEYSTORE_ALIAS
- EAZYPAY_API_KEY=
- ENV_TYPE=
- EAZYPAY_PRIVATE_PEM_PATH

#### **Windows OS**

- set EAZYPAY_KEYSTORE_PATH=
- set EAZYPAY_KEYSTORE_PASSWORD=
- set EAZYPAY_KEYSTORE_ALIAS=
- set EAZYPAY_API_KEY=
- set ENV_TYPE=
- set EAZYPAY_PRIVATE_PEM_PATH
#### **Linux / Mac OS**

- export EAZYPAY_KEYSTORE_PATH=
- export EAZYPAY_KEYSTORE_PASSWORD=
- export EAZYPAY_KEYSTORE_ALIAS=
- export EAZYPAY_API_KEY=
- export ENV_TYPE=
- export EAZYPAY_PRIVATE_PEM_PATH
#### **note - ENV_TYPE value must be "UAT" for testing and "PROD" for production **
---
  


## **Usage**

### **1. Importing Modules**

```typescript
import { SdkClient } from "@icici/http-core";
import { CallbackStatus2RequestDTO } from "@icici/eazypay";
```

### **2. Setting Up the Payload**

Create a request payload using the appropriate DTO class for the API you are calling:

```typescript
const payload = new CallbackStatus2RequestDTO();
payload.merchantId = "611429";
payload.merchantTranId = "COLLECTPAY1234568990";
payload.subMerchantId = "611429";
payload.terminalId = "5411";
payload.transactionType = "C";
```

### **3. Executing the API**

#### **Using JavaScript**

```javascript
const response = await SdkClient.execute("3025", "eazypay", payload)
  .then((resp) => {
    console.log("API response:", resp);
  })
  .catch((error) => console.error("Error message:", error));
```

#### **Using TypeScript**

```typescript
SdkClient.execute<UPIPaymentRequestDto>("3025", "eazypay", payload)
  .then((resp) => {
    console.log("API response:", resp);
  })
  .catch((error) => console.error("Error message:", error));
```

#### **Debug Errors**

#### **`Error: Cannot find module '@icici/<module-name>'`**

Issue is related to file reference, check file reference in package.json is properly set. <br>
Example: `"@icici/eazypay": "file:./sdk-distribution/eazypay"`<br>
In case problem still persists, just remove node_modules and package-lock.json and run `npm i`

#### **`Error message: Error: Unexpected error during decryption:Keystore path, password, or alias is not provided.`**

This error occurs if KEYSTORE_PATH / KEYSTORE_PASSWORD / KEYSTORE_ALIAS values not set properly
just double check these values are set properly. Print these values on terminal in which you are running application.

#### **`Error message: Error: Api Configuration not subscribed`**

This error occurs when you pass wrong APIID to execute method as follows

SdkClient.execute(`"XXXXXX"`, "eazypay", payload)

#### **`Error message: Error: Validation failed: URN must be a string, URN should not be empty`**

This is payload validation error, if you don't send all required attributes in the payload you will <br>
get this error, this indicates `URN` must be a string and it shouldn't be empty.

#### **`Error message: Error: Unexpected error during decryption:ENOENT: no such file or directory`**

If you don't set keystore.p12 or private-key.pem file path properly you will get this error. Set complete file path <br>
example: C:\Users\Workspace\keystore.p12

#### **`'Unauthorized' status: 401`**

This is API error, which indicates that apikey under `sdk-api-config.json` is not authorized to access APIs.

---

## **FAQs**

### **1. What is `SdkClient.execute`?**

`SdkClient.execute` is the primary method used to execute API requests. It accepts the following parameters:

- **API ID**: The unique identifier for the API (e.g., `"2002"`).
- **Module Name**: The name of the module (e.g., `"eazypay"`).
- **Payload**: The request object adhering to the DTO structure.

## Upgrades

## Convert PEM Files to P12 Format
To convert your private key (mykey.pem) and certificate (cert.pem) into a .p12 (PKCS#12) file, follow these steps:

## Requirements
OpenSSL must be installed on your system.

## You must have:

A private key file (mykey.pem)
A certificate file (cert.pem)

## Command
openssl pkcs12 -export -out mycert.p12 -inkey mykey.pem -in cert.pem


## implementation of decrypt callback

SdkClient.decryptCallback(encData)
  .then((resp) => {
    console.log("API response:", resp);
  })
  .catch((error) => console.error("Error message:", error));

note -  encData is complete response get by the backend

## please find enc data example below
  const encData = {
  requestId: "",
  service: "UPI",
  encryptedKey:
    "vg1R3RvI8mBLFwcuZkZ7EerzSCiKYLEzSCRDWa5CmlJnQoN10aUfV+oH8fhwNSJxfD/WFHKx3S0ZT71s516LnbnwPO0fb8k1NSIWL9RXK1t6X1T7KQrWb2VrjAyz16Xmmp1drnU+19j6XXQ0vDsrpROjzPlKpRMs7jRS0PIcVAS529+0bsZ6lbxJ6YdtnZOFNL44uQgZSnZzEbu8NTB5RE2kHQ9VBKDCGpgbrel5SMuFH7H5aiW5HSKPbm/4QwfwD5ZlyHU1ojfr3I4mys0hFoadh//ZTpMZN8ZO8Ncw1qMD2l3c0J4sqa7LxbZ77/D4JB+Iz4Bh1QDu72m7EhNZfWadwU0ydQUUWFGUNLAUAT3j/HiXp8+9V++uzLASzzquew8ssAPudV3t72Nkrfelml7qWvk2dwh3oC/UvERVzz14jUnAW+dCSNo7IqZAYDVQ5OtLtRUBYcfHCaLoEDF8/KN6kE07IWnsPyC65nO8elmFzxt3iG97LsV1f/BLRT0atCuvMSnk4vc6HK4SmTMrSUg4Z3FkSxICf627U4aGPzTsrwIIgGW/4ldkhuJ0GqfwsxYyyAKjrEjyC0GbQD6EwpYMYuG3u5PqBD1+qvJp7dv+ABlWzJbAxu+kAaTJI8/tUGtcBZjeFqK2of174udaiiwJGGg0zWFpSJPvKbPdOxM=",
  oaepHashingAlgorithm: "NONE",
  iv: "",
  encryptedData:
    "GKT49b5OYIth3Qqked/pxnsruh8fuHbtSjJz2SZVKcsqIKiUJ7oUN4hGjupmp/gtghOvdUE/meJfC42tBtpjlvbR6sM/+ahwdbPHosW6RaqsvL8FYYIIDJt181QJC8H2Os26kilwJ0pCPHKvCJpezw==",
  clientInfo: "",
  optionalParam: "",
};


## SV api's
If you want to enable sv_api's we have implemented in config file please refer latest file of sdk-api-config.json
for SV add variable SV_ENABLE=true and ENV_TYPE=UAT
if SV path not found it will call the UAT api

## Enable logger
In the .env file, set:
IS_LOGGER_ENABLE=true   → to enable logging (logs will be stored for 7 days)
IS_LOGGER_ENABLE=false  → to disable logging
logger will create in root directory in folder logs/sdk.log
log will auto delete after 7 days


### 🔄 In Progress
