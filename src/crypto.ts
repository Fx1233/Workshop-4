import { webcrypto as crypto } from "crypto";

// #############
// ### Utils ###
// #############

// Function to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

// Function to convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  var buff = Buffer.from(base64, "base64");
  return buff.buffer.slice(buff.byteOffset, buff.byteOffset + buff.byteLength);
}

// ################
// ### RSA keys ###
// ################

// Generates a pair of private / public RSA keys
type GenerateRsaKeyPair = {
  publicKey: crypto.CryptoKey;
  privateKey: crypto.CryptoKey;
};
export async function generateRsaKeyPair(): Promise<GenerateRsaKeyPair> {
  const keyGenOptions = {
    name: "RSA-OAEP",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: {name: "SHA-256"}
  };
  
  return crypto.subtle.generateKey(keyGenOptions, true, ["encrypt", "decrypt"]);
}


// Export a crypto public key to a base64 string format
export async function exportPubKey(key: crypto.CryptoKey): Promise<string> {
  // TODO: implement this function to return a base64 string version of a public key
  const exportedKey = await crypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exportedKey);
}

// Export a crypto private key to a base64 string format
export async function exportPrvKey(
  key: crypto.CryptoKey | null
): Promise<string | null> {
  if (!key) {return null;}
  const exportedKey = await crypto.subtle.exportKey("pkcs8", key);
  return arrayBufferToBase64(exportedKey);
}

// Import a base64 string public key to its native format
// Function to transform a base64-encoded public key back into a CryptoKey object
export async function importPubKey(strKey: string): Promise<crypto.CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(strKey);
  const rsaOptions = {
    name: "RSA-OAEP",
    hash: {name: "SHA-256"}
  };

  return crypto.subtle.importKey(
    "spki",
    keyBuffer,
    rsaOptions,
    true,
    ["encrypt"]
  );
}


// Import a base64 string private key to its native format
// Function to convert a base64-encoded private key into a CryptoKey object
export async function importPrvKey(
  strKey: string
): Promise<crypto.CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(strKey);
  const importOptions = {
    name: "RSA-OAEP",
    hash: {name: "SHA-256"}
  };

  return await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    importOptions,
    true,
    ["decrypt"]
  );
}


// Encrypt a message using an RSA public key
// Function to encrypt data with an RSA public key
export async function rsaEncrypt(
  b64Data: string,
  strPublicKey: string
): Promise<string> {
  const rawData = base64ToArrayBuffer(b64Data);
  const publicKey = await importPubKey(strPublicKey);
  const encryptionOptions = {
    name: "RSA-OAEP"
  };

  const encryptedBuffer = await crypto.subtle.encrypt(
    encryptionOptions,
    publicKey,
    rawData
  );

  return arrayBufferToBase64(encryptedBuffer);
}


// Decrypts a message using an RSA private key
// Function to decrypt data using RSA private key
export async function rsaDecrypt(
  data: string,
  privateKey: crypto.CryptoKey
): Promise<string> {
  const encryptedBuffer = base64ToArrayBuffer(data);
  const options = {
    name: "RSA-OAEP"
  };
  
  let decryptedData = await crypto.subtle.decrypt(options, privateKey, encryptedBuffer);
  return arrayBufferToBase64(decryptedData);
}



// ######################
// ### Symmetric keys ###
// ######################

export async function createRandomSymmetricKey(): Promise<crypto.CryptoKey> {
  // Define the key generation parameters
  const keyOptions = {
    name: 'AES-CBC', // AES-CBC is suitable for many use cases; consider AES-GCM for authenticated encryption
    length: 256, // Define the key length as 256 bits
  };

  // Generate the key with the defined options, allowing the key to be extractable
  return crypto.subtle.generateKey(keyOptions, true, ['encrypt', 'decrypt']);
}


// Export a crypto symmetric key to a base64 string format
export async function exportSymKey(key: crypto.CryptoKey): Promise<string> {
  // TODO: implement this function to return a base64 string version of a symmetric key

  const exportedKey = await crypto.subtle.exportKey("raw", key);

  return arrayBufferToBase64(exportedKey);
}

// Import a base64 string format to its crypto native format
export async function importSymKey(strKey: string): Promise<crypto.CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(strKey);
  
  const keyData = {
    name: 'AES-CBC',
    length: 256,
  };

  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    keyData,
    true,
    ['encrypt', 'decrypt']
  );
}


// Encrypt a message using a symmetric key
export async function symEncrypt(key: crypto.CryptoKey, data: string): Promise<string> {
  const dataBytes = new TextEncoder().encode(data);
  const iv = crypto.getRandomValues(new Uint8Array(16)); // Initialization vector for AES-CBC

  const encryptionOptions = {
    name: 'AES-CBC',
    iv: iv
  };

  const encrypted = await crypto.subtle.encrypt(
    encryptionOptions,
    key,
    dataBytes
  );

  const combinedData = new Uint8Array([...iv, ...new Uint8Array(encrypted)]);
  return arrayBufferToBase64(combinedData.buffer);
}


// Decrypt a message using a symmetric key
export async function symDecrypt(
  strKey: string,
  encryptedData: string
): Promise<string> {
  // Convert the string key to a CryptoKey object
  const key = await importSymKey(strKey);

  // Decode the base64 encrypted data to an ArrayBuffer
  const encryptedBuffer = base64ToArrayBuffer(encryptedData);

  // Extract the initialization vector from the encrypted data
  const iv = new Uint8Array(encryptedBuffer, 0, 16);

  // Decrypt the data using the AES-CBC algorithm
  const dataToDecrypt = encryptedBuffer.slice(16);
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-CBC',
      iv: iv
    },
    key,
    dataToDecrypt
  );

  // Convert the decrypted data back to a string and return
  return new TextDecoder().decode(decryptedBuffer);
}

