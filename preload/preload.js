const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

async function loadTransformers() {
  const transformers = await import('@xenova/transformers');
  const { pipeline, env } = transformers;

  // Configure for browser/Electron cache
  env.useBrowserCache = true;
  env.allowLocalModels = true;
  env.remoteHost = 'https://huggingface.co';

  return { pipeline, env };
}

// Load Transformers.js in the preload (Node context)
contextBridge.exposeInMainWorld('electronAPI', {
  // Model
  loadTransformers: () => loadTransformers(),

  // Workspace & Files
  selectWorkspace: () => ipcRenderer.invoke('select-workspace'),
  getFileTree: (path) => ipcRenderer.invoke('get-file-tree', path),
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  writeFile: (path, content) => ipcRenderer.invoke('write-file', path, content),
  createFile: (relativePath, content) => ipcRenderer.invoke('create-file', relativePath, content),
  onFileSystemEvent: (callback) => ipcRenderer.on('file-system-event', (_, data) => callback(data)),
  updateFileInIndex: (relativePath) => ipcRenderer.invoke('update-file-index', relativePath),
  selectFiles: () => ipcRenderer.invoke('select-files'),
  getProjectMetadata: () => ipcRenderer.invoke('get-project-metadata'),

  // Secure chat handlers
  registerChatRequest: (requestId, tabId) => ipcRenderer.invoke('register-chat-request', requestId, tabId),
  chatWithOllamaSecure: (message, model, requestId, tabId) =>  ipcRenderer.invoke('chat-ollama-secure', message, model, requestId, tabId),
  getSystemPrompt: () => ipcRenderer.invoke('get-system-prompt'),

  // History
  saveCurrentChatJson: (chatData) => ipcRenderer.invoke('save-current-chat-json', chatData),
  loadCurrentChatJson: () => ipcRenderer.invoke('load-current-chat-json'),
  saveChat: (chatData) => ipcRenderer.invoke('save-chat', chatData),
  getChatHistory: () => ipcRenderer.invoke('get-chat-history'),
  loadChat: (chatId) => ipcRenderer.invoke('load-chat', chatId),
  deleteChat: (chatId) => ipcRenderer.invoke('delete-chat', chatId),

  // Indexing
  buildIndex: () => ipcRenderer.invoke('build-index'),
  searchIndex: (query) => ipcRenderer.invoke('search-index', query),
  getIndexStats: async () => {
    // Return { count: numberOfIndexedFiles } or null if index empty
    if (!global.workspaceIndex)
      return { count: 0 };

    return { count: global.workspaceIndex.size };
  },

  // Build System
  detectBuildConfig: (projectPath) => ipcRenderer.invoke('detect-build-config', projectPath),
  executeBuild: (buildId, command, args, options) => ipcRenderer.invoke('execute-build', buildId, command, args, options),
  stopBuild: (buildId) => ipcRenderer.invoke('stop-build', buildId),
  getActiveBuilds: () => ipcRenderer.invoke('get-active-builds'),
  getBuildHistory: (limit) => ipcRenderer.invoke('get-build-history', limit),
  onBuildProgress: (callback) => ipcRenderer.on('build-progress', (event, data) => callback(data)),
  analyzeBuildError: (buildOutput, language) => ipcRenderer.invoke('analyze-build-error', buildOutput, language),

  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (config) => ipcRenderer.invoke('set-config', config),

  // Ollama only (for advanced option)
  checkOllama: () => ipcRenderer.invoke('check-ollama'),
  downloadOllamaModel: (model) => ipcRenderer.invoke('download-ollama-model', model),
  chatWithOllama: (message, model) => ipcRenderer.invoke('chat-ollama', message, model),
  getOllamaModels: () => ipcRenderer.invoke('get-ollama-models'),
  getSystemPrompt: () => ipcRenderer.invoke('get-system-prompt'),

  // Theme
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),

  // Events
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, data) => callback(data)),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  getModelCachePath: () => ipcRenderer.invoke('get-model-cache-path'),
  checkModelExists: (modelId) => ipcRenderer.invoke('check-model-exists', modelId),
  saveDownloadState: (modelId, state) => ipcRenderer.invoke('save-download-state', modelId, state),
  getDownloadState: (modelId) => ipcRenderer.invoke('get-download-state', modelId),
  clearDownloadState: (modelId) => ipcRenderer.invoke('clear-download-state', modelId),

  // File chunk operations (for resumable downloads)
  saveFileDownloadState: (fileName, state) => ipcRenderer.invoke('save-file-download-state', fileName, state),
  getFileDownloadState: (fileName) => ipcRenderer.invoke('get-file-download-state', fileName),
  writeDownloadChunk: (fileName, chunkBuffer, offset) => ipcRenderer.invoke('write-download-chunk', fileName, chunkBuffer, offset),
  getDownloadedFileSize: (fileName) => ipcRenderer.invoke('get-downloaded-file-size', fileName),
  clearDownloadChunks: () => ipcRenderer.invoke('clear-download-chunks'),
});
