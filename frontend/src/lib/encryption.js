// ─── RSA KEY GENERATION ────────────────────────────────────
export const generateRSAKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"]
  );
  const publicKeyExported = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKeyExported = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  return {
    publicKey: arrayBufferToBase64(publicKeyExported),
    privateKey: arrayBufferToBase64(privateKeyExported),
  };
};

// ─── AES KEY GENERATION ────────────────────────────────────
export const generateAESKey = async () => {
  return await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
};

// ─── ENCRYPT MESSAGE WITH AES ──────────────────────────────
export const encryptMessage = async (message, aesKey) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(message);
  const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, encoded);
  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv),
  };
};

// ─── DECRYPT MESSAGE WITH AES ──────────────────────────────
export const decryptMessage = async (ciphertext, iv, aesKey) => {
  try {
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToArrayBuffer(iv) },
      aesKey,
      base64ToArrayBuffer(ciphertext)
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return "[Encrypted message]";
  }
};

// ─── ENCRYPT AES KEY WITH RSA PUBLIC KEY ───────────────────
export const encryptAESKeyWithRSA = async (aesKey, publicKeyBase64) => {
  const rawKey = await window.crypto.subtle.exportKey("raw", aesKey);
  const importedPublicKey = await window.crypto.subtle.importKey(
    "spki",
    base64ToArrayBuffer(publicKeyBase64),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );
  const encrypted = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, importedPublicKey, rawKey);
  return arrayBufferToBase64(encrypted);
};

// ─── DECRYPT AES KEY WITH RSA PRIVATE KEY ──────────────────
export const decryptAESKeyWithRSA = async (encryptedKey, privateKeyBase64) => {
  const importedPrivateKey = await window.crypto.subtle.importKey(
    "pkcs8",
    base64ToArrayBuffer(privateKeyBase64),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"]
  );
  const decryptedKey = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    importedPrivateKey,
    base64ToArrayBuffer(encryptedKey)
  );
  return await window.crypto.subtle.importKey("raw", decryptedKey, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
};

// ─── HELPERS ───────────────────────────────────────────────
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return window.btoa(binary);
};

const base64ToArrayBuffer = (base64) => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

// ─── LOCAL STORAGE KEY MANAGEMENT ─────────────────────────
export const savePrivateKey = (userId, privateKey) => {
  localStorage.setItem(`privateKey_${userId}`, privateKey);
};

export const getPrivateKey = (userId) => {
  return localStorage.getItem(`privateKey_${userId}`);
};
