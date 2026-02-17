const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } = crypto;

// Advanced encryption libraries
const sodium = require('libsodium-wrappers');
const argon2 = require('argon2');
const { SecretShare } = require('secrets.js-grempe');
const bson = require('bson');
const { v4: uuidv4 } = require('uuid');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: false,
    backgroundColor: '#0a0a0f',
    show: false,
    icon: path.join(__dirname, 'assets/icon.png')
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.webContents.send('app-ready');
  });
}

app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

class AdvancedEncryption {
  constructor() {
    this.encryptionVersion = '1.0.0';
  }

  // Multi-layer encryption with key derivation
  async multiLayerEncrypt(data, password, options = {}) {
    try {
      await sodium.ready;
      
      // Generate master key using Argon2id
      const salt = randomBytes(32);
      const masterKey = await argon2.hash(password, {
        salt: salt,
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 4,
        parallelism: 4,
        hashLength: 64,
        raw: true  // Return raw buffer instead of encoded string
      });
      
      // Derive subkeys for each layer
      const key1 = crypto.createHash('sha256').update(Buffer.concat([Buffer.from(masterKey), Buffer.from('layer1')])).digest();
      const key2 = crypto.createHash('sha256').update(Buffer.concat([Buffer.from(masterKey), Buffer.from('layer2')])).digest();
      const key3 = crypto.createHash('sha256').update(Buffer.concat([Buffer.from(masterKey), Buffer.from('layer3')])).digest();
      
      // Layer 1: AES-256-GCM
      const iv1 = randomBytes(12);
      const cipher1 = createCipheriv('aes-256-gcm', key1, iv1);
      let encrypted1 = cipher1.update(data);
      encrypted1 = Buffer.concat([encrypted1, cipher1.final()]);
      const authTag1 = cipher1.getAuthTag();
      
      // Layer 2: ChaCha20-Poly1305 (using simplified implementation)
      const iv2 = randomBytes(12);
      const encrypted2 = await this.chacha20Encrypt(encrypted1, key2, iv2);
      
      // Layer 3: AES-256-CBC (as fallback)
      const iv3 = randomBytes(16);
      const cipher3 = createCipheriv('aes-256-cbc', key3, iv3);
      let encrypted3 = cipher3.update(encrypted2);
      encrypted3 = Buffer.concat([encrypted3, cipher3.final()]);
      
      // Package everything with metadata
      const encryptedPackage = {
        version: this.encryptionVersion,
        id: uuidv4(),
        salt: salt.toString('base64'),
        ivs: {
          aes: iv1.toString('base64'),
          chacha: iv2.toString('base64'),
          cbc: iv3.toString('base64')
        },
        authTag: authTag1.toString('base64'),
        encrypted: encrypted3.toString('base64'),
        algorithm: 'multi-layer',
        timestamp: Date.now(),
        options: options
      };
      
      return bson.serialize(encryptedPackage);
    } catch (error) {
      throw new Error(`Multi-layer encryption failed: ${error.message}`);
    }
  }

  async multiLayerDecrypt(encryptedData, password) {
    try {
      await sodium.ready;
      
      // Parse package
      const pkg = bson.deserialize(encryptedData);
      
      if (pkg.version !== this.encryptionVersion) {
        throw new Error('Incompatible encryption version');
      }
      
      // Derive master key
      const salt = Buffer.from(pkg.salt, 'base64');
      const masterKey = await argon2.hash(password, {
        salt: salt,
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 4,
        parallelism: 4,
        hashLength: 64,
        raw: true
      });
      
      // Derive subkeys
      const key1 = crypto.createHash('sha256').update(Buffer.concat([Buffer.from(masterKey), Buffer.from('layer1')])).digest();
      const key2 = crypto.createHash('sha256').update(Buffer.concat([Buffer.from(masterKey), Buffer.from('layer2')])).digest();
      const key3 = crypto.createHash('sha256').update(Buffer.concat([Buffer.from(masterKey), Buffer.from('layer3')])).digest();
      
      // Reverse layer 3 (AES-256-CBC)
      const iv3 = Buffer.from(pkg.ivs.cbc, 'base64');
      const decipher3 = createDecipheriv('aes-256-cbc', key3, iv3);
      let decrypted3 = decipher3.update(Buffer.from(pkg.encrypted, 'base64'));
      decrypted3 = Buffer.concat([decrypted3, decipher3.final()]);
      
      // Reverse layer 2 (ChaCha20)
      const iv2 = Buffer.from(pkg.ivs.chacha, 'base64');
      const decrypted2 = await this.chacha20Decrypt(decrypted3, key2, iv2);
      
      // Reverse layer 1 (AES-256-GCM)
      const iv1 = Buffer.from(pkg.ivs.aes, 'base64');
      const authTag1 = Buffer.from(pkg.authTag, 'base64');
      const decipher1 = createDecipheriv('aes-256-gcm', key1, iv1);
      decipher1.setAuthTag(authTag1);
      let decrypted1 = decipher1.update(decrypted2);
      decrypted1 = Buffer.concat([decrypted1, decipher1.final()]);
      
      return decrypted1;
    } catch (error) {
      throw new Error(`Multi-layer decryption failed: ${error.message}`);
    }
  }

  // Fixed ChaCha20 encryption
  async chacha20Encrypt(data, key, iv) {
    try {
      await sodium.ready;
      
      // Ensure key is the correct length (32 bytes)
      if (key.length !== 32) {
        // If key is not 32 bytes, hash it to get correct length
        key = crypto.createHash('sha256').update(key).digest();
      }
      
      // Ensure iv is the correct length (12 bytes for ChaCha20-Poly1305)
      if (iv.length !== 12) {
        // If iv is not 12 bytes, create a new one
        iv = randomBytes(12);
      }
      
      // Use crypto module as fallback if sodium fails
      try {
        const result = sodium.crypto_aead_chacha20poly1305_encrypt(
          data,
          null,
          null,
          iv,
          key
        );
        return Buffer.from(result);
      } catch (sodiumError) {
        console.log('Sodium ChaCha20 failed, using fallback:', sodiumError.message);
        
        // Fallback to AES-256-GCM
        const fallbackCipher = createCipheriv('aes-256-gcm', key.slice(0, 32), iv.slice(0, 12));
        const encrypted = Buffer.concat([fallbackCipher.update(data), fallbackCipher.final()]);
        const tag = fallbackCipher.getAuthTag();
        return Buffer.concat([encrypted, tag]);
      }
    } catch (error) {
      throw new Error(`ChaCha20 encryption failed: ${error.message}`);
    }
  }

  // Fixed ChaCha20 decryption
  async chacha20Decrypt(encrypted, key, iv) {
    try {
      await sodium.ready;
      
      // Ensure key is the correct length
      if (key.length !== 32) {
        key = crypto.createHash('sha256').update(key).digest();
      }
      
      // Ensure iv is the correct length
      if (iv.length !== 12) {
        iv = iv.slice(0, 12);
      }
      
      // Use crypto module as fallback if sodium fails
      try {
        const result = sodium.crypto_aead_chacha20poly1305_decrypt(
          null,
          encrypted,
          null,
          iv,
          key
        );
        return Buffer.from(result);
      } catch (sodiumError) {
        console.log('Sodium ChaCha20 decryption failed, using fallback:', sodiumError.message);
        
        // For fallback, we need to handle the tag separately
        // This assumes the tag is appended to the encrypted data
        const tag = encrypted.slice(-16);
        const actualEncrypted = encrypted.slice(0, -16);
        
        const fallbackDecipher = createDecipheriv('aes-256-gcm', key.slice(0, 32), iv.slice(0, 12));
        fallbackDecipher.setAuthTag(tag);
        return Buffer.concat([fallbackDecipher.update(actualEncrypted), fallbackDecipher.final()]);
      }
    } catch (error) {
      throw new Error(`ChaCha20 decryption failed: ${error.message}`);
    }
  }

  // Simplified encryption for text (using only AES-256-GCM for reliability)
  async simpleEncrypt(data, password) {
    try {
      // Generate key from password using PBKDF2
      const salt = randomBytes(32);
      const key = pbkdf2Sync(password, salt, 100000, 32, 'sha256');
      
      // Encrypt with AES-256-GCM
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      let encrypted = cipher.update(data);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      const authTag = cipher.getAuthTag();
      
      // Package
      const result = {
        version: '1.0.0-simple',
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        encrypted: encrypted.toString('base64')
      };
      
      return bson.serialize(result);
    } catch (error) {
      throw new Error(`Simple encryption failed: ${error.message}`);
    }
  }

  async simpleDecrypt(encryptedData, password) {
    try {
      const pkg = bson.deserialize(encryptedData);
      
      const salt = Buffer.from(pkg.salt, 'base64');
      const iv = Buffer.from(pkg.iv, 'base64');
      const authTag = Buffer.from(pkg.authTag, 'base64');
      const encrypted = Buffer.from(pkg.encrypted, 'base64');
      
      const key = pbkdf2Sync(password, salt, 100000, 32, 'sha256');
      
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      
      return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    } catch (error) {
      throw new Error(`Simple decryption failed: ${error.message}`);
    }
  }
}

const encryption = new AdvancedEncryption();

// IPC Handlers
ipcMain.handle('encrypt-file', async (event, { filePath, password, options = {} }) => {
  try {
    const data = fs.readFileSync(filePath);
    
    // Try multi-layer first, fallback to simple if it fails
    let encrypted;
    try {
      encrypted = await encryption.multiLayerEncrypt(data, password, options);
    } catch (error) {
      console.log('Multi-layer encryption failed, using simple encryption:', error.message);
      encrypted = await encryption.simpleEncrypt(data, password);
    }
    
    const outputPath = filePath + '.stoop';
    fs.writeFileSync(outputPath, encrypted);
    
    return { success: true, path: outputPath };
  } catch (error) {
    console.error('Encryption error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('decrypt-file', async (event, { filePath, password }) => {
  try {
    const encrypted = fs.readFileSync(filePath);
    
    // Try to determine which encryption was used
    let decrypted;
    try {
      // Try multi-layer first
      decrypted = await encryption.multiLayerDecrypt(encrypted, password);
    } catch (error) {
      try {
        // Try simple encryption
        decrypted = await encryption.simpleDecrypt(encrypted, password);
      } catch (simpleError) {
        throw new Error('Failed to decrypt with any method');
      }
    }
    
    const outputPath = filePath.replace('.stoop', '_decrypted');
    fs.writeFileSync(outputPath, decrypted);
    
    return { success: true, path: outputPath };
  } catch (error) {
    console.error('Decryption error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('encrypt-text', async (event, { text, password }) => {
  try {
    const data = Buffer.from(text, 'utf8');
    
    // Use simple encryption for text (more reliable)
    const encrypted = await encryption.simpleEncrypt(data, password);
    
    return { success: true, data: encrypted.toString('base64') };
  } catch (error) {
    console.error('Text encryption error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('decrypt-text', async (event, { encryptedData, password }) => {
  try {
    const encrypted = Buffer.from(encryptedData, 'base64');
    const decrypted = await encryption.simpleDecrypt(encrypted, password);
    
    return { success: true, data: decrypted.toString('utf8') };
  } catch (error) {
    console.error('Text decryption error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile']
  });
  return result.filePaths[0];
});

ipcMain.handle('select-save-location', async (event, { defaultPath }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultPath
  });
  return result.filePath;
});

ipcMain.handle('minimize-window', () => {
  mainWindow.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('close-window', () => {
  mainWindow.close();
});
