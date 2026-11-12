const { app, BrowserWindow, ipcMain, dialog,  Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const http = require('http');
const ignore = require('ignore');
const chokidar = require('chokidar');
const Database = require("better-sqlite3");
const { spawn, execFile } = require('child_process');
const { https } = require('follow-redirects');
const crypto = require('crypto');
const dotenv = require('dotenv');
const os = require('os');

const { piscina } = require('./piscina_instance.js');
const { Update } = require('./Update.js');

/*
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');

const ConfigManager = require('./ConfigManager.js');
const configManager = new ConfigManager(SETTINGS_FILE);
*/


const isMac = process.platform === 'darwin'
const template = [
  ...(isMac
    ? [{
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      }]
    : []),
  {
    label: 'File',
    submenu: [
      isMac ? { role: 'close' } : { role: 'quit' }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac
        ? [
            { role: 'pasteAndMatchStyle' },
            { role: 'delete' },
            { role: 'selectAll' },
            { type: 'separator' },
            {
              label: 'Speech',
              submenu: [
                { role: 'startSpeaking' },
                { role: 'stopSpeaking' }
              ]
            }
          ]
        : [
            { role: 'delete' },
            { type: 'separator' },
            { role: 'selectAll' }
          ])
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'toggleDevTools' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      ...(isMac
        ? [
            { type: 'separator' },
            { role: 'front' },
            { type: 'separator' },
            { role: 'window' }
          ]
        : [
            { role: 'close' }
          ])
    ]
  },
]

Menu.setApplicationMenu(Menu.buildFromTemplate(template));

let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      sandbox: false,
      devTools: true,
      //devTools: false
    },
    titleBarStyle: 'hiddenInset',
    show: false,
    icon: path.join(path.dirname(__dirname), 'assets', 'logo.ico')
  });

  mainWindow.loadFile(path.join(path.dirname(__dirname), 'renderer', 'index.html'));

  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const allowList = [];

    // Check if the current URL is in our internal list
    if (allowList.some(x => url.includes(x))) {
      return { action: 'allow' }; // Open in a new Electron window
    }

    // Open in the system browser if it's not in allowListt
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Ollama
const {
  isLoggedInToOllama,
  downloadOllamaModel,
  chatOllama,
  checkOllama,
  getOllamaModels,
  modelSupportsImages,
  abortModelDownload,
} = require('./ollama_ipc_handlers');

ipcMain.handle('is-logged-in-to-ollama', isLoggedInToOllama);
ipcMain.handle('download-ollama-model', downloadOllamaModel);
ipcMain.handle('chat-ollama', chatOllama);
ipcMain.handle('check-ollama', checkOllama);
ipcMain.handle('get-ollama-models', getOllamaModels);
ipcMain.handle('does-model-support-images', modelSupportsImages);
ipcMain.handle('abort-ollama-model-dl', abortModelDownload);

// OpenAI
const {
  isOpenAiApiKeyValid,
  getAllOpenAiModels,
  sendChat,
} = require('./openai_ipc_handlers');

ipcMain.handle('is-openai-api-key-valid', isOpenAiApiKeyValid);
ipcMain.handle('get-all-openai-models', getAllOpenAiModels);
ipcMain.handle('chat-openai', sendChat);

// config
const {
  createConfigFile,
  readConfigFile,
  writeToConfigFile
} = require('./config_ipc_handlers');

ipcMain.handle('create-config-file', createConfigFile);
ipcMain.handle('read-config-file', readConfigFile);
ipcMain.handle('write-to-config-file', writeToConfigFile);

// env
const {
  createEnvFile,
  readEnvKey,
  writeEnvKey,
  removeEnvKey,
  isKeyEmpty
} = require('./env_ipc_handlers');

ipcMain.handle('create-env-file', createEnvFile);
ipcMain.handle('read-env-key', readEnvKey);
ipcMain.handle('write-env-key', writeEnvKey);
ipcMain.handle('remove-env-env', removeEnvKey);
ipcMain.handle('is-env-key-empty', isKeyEmpty);

// files
const {
  readFile,
  scanFolder,
  showFileDialog,
  showFolderDialog,
  cleanImage,
  isImage,
} = require('./files_ipc_handlers');

ipcMain.handle('file-to-read', readFile);
ipcMain.handle('scan-folder', scanFolder);
ipcMain.handle('dialog:openFile', showFileDialog);
ipcMain.handle('dialog:openFolder', showFolderDialog);
ipcMain.handle('clean-image',  cleanImage);
ipcMain.handle('is-image',  isImage);

// workspace
const {
  indexWorkspace,
  searchWorkspace,
} = require('./workspace_ipc_handlers');

ipcMain.handle('index-workspace', indexWorkspace);
ipcMain.handle('search-workspace', searchWorkspace);

// process launcher
const { launchProcess } = require('./process_launcher_ipc_handlers.js');
ipcMain.handle('launch-process', launchProcess);

/**
 *  Downloads SaiphAI update.
 *
 *  @param {string} data - Data obtained from Github
 *
 *  @returns {null}
*/
const downloadUpdate = (event, data) => {
  Update.downloadUpdate(mainWindow.webContents, data);
}
ipcMain.handle('download-update', downloadUpdate);

/**
 *  Installs SaiphAI update.
 *
 *  @returns {null}
*/
const installUpdate = () => {
  Update.installUpdate();
}
ipcMain.handle('install-update', installUpdate);

/**
 *  Gets the current platform.
 *
 *  @returns {String} the user's platform (win32, linux, darwin).
*/
const getPlatform = () => {
  return process.platform;
}
ipcMain.handle('get-platform', getPlatform);

const createHash = (event, input) => {
  const hashInstance = crypto.createHash('sha256');
  const hash = hashInstance.update(input).digest('hex');

  return hash;
}
ipcMain.handle('create-hash', createHash);

const summarizeText = async (event, textToSum, textToInclude) => {
  const res = await piscina.run({
    taskName: 'summarizeText',
    payload: {
      textToSum: textToSum,
      textToInclude: textToInclude
    }
  });
  return res;
}
ipcMain.handle('summarize-text', summarizeText);

app.whenReady().then( () => {
    app.commandLine.appendSwitch('single-process');
    createMainWindow();
});

app.on('window-all-closed', async () => {
  if (!isMac) {
    try {
      await Promise.race([
        piscina.destroy(),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 400)
        })
      ]);
      app.quit();
    }
    /*  Sometimes, the program will hang after close.
     *  This is an ugly and dirty way to shut it down.
     *  Without this, the program won't fully close when this happens.
    */
    catch (_) { process.kill(process.pid, 'SIGKILL') }
  }
});

app.on("ready", () => {
  setTimeout(() => {
    const currentVersion = app.getVersion();
    Update.checkForUpdates(mainWindow.webContents, currentVersion);
  }, 500);
});

app.on('activate', async () => {
  app.commandLine.appendSwitch('single-process');

  if (BrowserWindow.getAllWindows().length === 0)
    createMainWindow();
});

