const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

contextBridge.exposeInMainWorld('electronAPI', {
  // Config
  readConfigFile: () => ipcRenderer.invoke('read-config-file'),
  createConfigFile: () => ipcRenderer.invoke('create-config-file'),
  writeToConfigFile: (data) => ipcRenderer.invoke('write-to-config-file', data),

  // Files
  readFile: (fileToRead) => ipcRenderer.invoke('file-to-read', fileToRead),
  scanFolder: (folder) => ipcRenderer.invoke('scan-folder', folder),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  cleanImage: (imgPath) => ipcRenderer.invoke('clean-image', imgPath),
  isImage: (filePath) => ipcRenderer.invoke('is-image', filePath),

  // Ollama
  checkOllama: () => ipcRenderer.invoke('check-ollama'),
  getOllamaModels: () => ipcRenderer.invoke('get-ollama-models'),
  downloadOllamaModel: (model) => ipcRenderer.invoke('download-ollama-model', model),
  onDLModelProgress: (callback) => ipcRenderer.on('download-model-progress', (event, data) => callback(data)),
  abortModelDownload: () => ipcRenderer.invoke('abort-ollama-model-dl'),
  removeDownloadProgress: (callback) => ipcRenderer.removeListener('download-ollama-model-progress', callback),
  chatOllama: (message, model) => ipcRenderer.invoke('chat-ollama', message, model),

  // OpenAI
  isOpenAiApiKeyValid: (key) => ipcRenderer.invoke('is-openai-api-key-valid', key),
  getAllOpenAiModels: (key) => ipcRenderer.invoke('get-all-openai-models', key),

  // Utilities
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  createHash: (input) => ipcRenderer.invoke('create-hash', input),

  // Indexing
  indexWorkspace: (path) => ipcRenderer.invoke('index-workspace', path),
  searchWorkspace: (manager, query) => ipcRenderer.invoke('search-workspace', manager, query),
  onIndexingProgress: (callback) => {
    ipcRenderer.on('indexing-progress', (event, data) => callback(data));
  },

  // Summarize text
  summarizeText: (text, includeText) => ipcRenderer.invoke('summarize-text', text, includeText),
});
