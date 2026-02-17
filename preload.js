const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  encryptFile: (data) => ipcRenderer.invoke('encrypt-file', data),
  decryptFile: (data) => ipcRenderer.invoke('decrypt-file', data),
  encryptText: (data) => ipcRenderer.invoke('encrypt-text', data),
  decryptText: (data) => ipcRenderer.invoke('decrypt-text', data),
  
  // Key operations
  splitKey: (data) => ipcRenderer.invoke('split-key', data),
  recoverKey: (data) => ipcRenderer.invoke('recover-key', data),
  
  // Steganography
  encryptWithStego: (data) => ipcRenderer.invoke('encrypt-with-stego', data),
  extractStego: (data) => ipcRenderer.invoke('extract-stego', data),
  
  // Quantum encryption
  quantumEncrypt: (data) => ipcRenderer.invoke('quantum-encrypt', data),
  quantumDecrypt: (data) => ipcRenderer.invoke('quantum-decrypt', data),
  
  // PFS and signatures
  generatePFSKeys: () => ipcRenderer.invoke('generate-pfs-keys'),
  signFile: (data) => ipcRenderer.invoke('sign-file', data),
  verifyFile: (data) => ipcRenderer.invoke('verify-file', data),
  
  // Key encryption
  encryptKeyWithPassword: (data) => ipcRenderer.invoke('encrypt-key-with-password', data),
  decryptKeyWithPassword: (data) => ipcRenderer.invoke('decrypt-key-with-password', data),
  
  // File dialogs
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectSaveLocation: (data) => ipcRenderer.invoke('select-save-location', data),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // App events
  onAppReady: (callback) => {
    ipcRenderer.on('app-ready', () => callback());
  }
});

// Also expose some Node.js utilities that might be needed
contextBridge.exposeInMainWorld('nodeAPI', {
  Buffer: Buffer,
  path: {
    basename: (p) => require('path').basename(p),
    dirname: (p) => require('path').dirname(p),
    extname: (p) => require('path').extname(p),
    join: (...args) => require('path').join(...args)
  }
});
