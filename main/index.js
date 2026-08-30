const { app, BrowserWindow, ipcMain, dialog,  Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const http = require('http');
const ignore = require('ignore');
const chokidar = require('chokidar');
const initSqlJs = require('sql.js');
const { spawn, execFile } = require('child_process');
const { https } = require('follow-redirects');
const crypto = require('crypto');
const dotenv = require('dotenv');
const os = require('os');

const { piscina } = require('./piscina_instance.js');

const ENV_PATH = path.join(app.getPath('userData'), '.env');

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
  downloadOllamaModel,
  chatOllama,
  checkOllama,
  getOllamaModels,
  abortModelDownload,
} = require('./ollama_ipc_handlers');

ipcMain.handle('download-ollama-model', downloadOllamaModel);
ipcMain.handle('chat-ollama', chatOllama);
ipcMain.handle('check-ollama', checkOllama);
ipcMain.handle('get-ollama-models', getOllamaModels);
ipcMain.handle('abort-ollama-model-dl', abortModelDownload);

// OpenAI
const {
  isOpenAiApiKeyValid,
  getAllOpenAiModels,
} = require('./openai_ipc_handlers');

ipcMain.handle('is-openai-api-key-valid', isOpenAiApiKeyValid);
ipcMain.handle('get-all-openai-models', getAllOpenAiModels);

// config
const {
  createConfigFile,
  readConfigFile,
  writeToConfigFile
} = require('./config_ipc_handlers');

ipcMain.handle('create-config-file', createConfigFile);
ipcMain.handle('read-config-file', readConfigFile);
ipcMain.handle('write-to-config-file', writeToConfigFile);

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


/**
 *  Downloads SaiphAI update.
 *
 *  @param {string} downloadUrl - The Github url.
 *  @param {string} expectedDigest - The expected digest.
 *
 *  @returns {null}
*/
const downloadUpdate = async (downloadUrl, expectedDigest) => {
  const userDataPath = app.getPath('userData');
  const updateDir = path.join(userDataPath, 'updates');
  const fileName = path.basename(downloadUrl);
  const filePath = path.join(updateDir, fileName);

  // Ensure update directory exists
  await fs.mkdir(updateDir, { recursive: true });

  return new Promise((resolve) => {
    const file = fsSync.createWriteStream(filePath);
    let downloadedBytes = 0;
    let totalBytes = 0;
    const hash = crypto.createHash('sha256');

    https.get(downloadUrl, (response) => {
        totalBytes = parseInt(response.headers['content-length'] || '0', 10);

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-download-progress', {
            downloaded: 0,
            total: totalBytes,
            percent: 0
          });
        }

        response.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            hash.update(chunk);

            const percent = Math.round((downloadedBytes / totalBytes) * 100);

            // Send progress to renderer
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('update-download-progress', {
                    downloaded: downloadedBytes,
                    total: totalBytes,
                    percent: Math.round((downloadedBytes / totalBytes) * 100)
                });
            }
        });

        response.pipe(file);

        file.on('close', () => {
            // Verify digest if provided
            if (expectedDigest) {
                const normalizedExpected = expectedDigest.replace(/^sha256:/, '').toLowerCase();
                const fileBuffer = fsSync.readFileSync(filePath);
                const actualDigest = crypto.createHash('sha256').update(fileBuffer).digest('hex');

                if (actualDigest !== normalizedExpected) {
                    fs.unlink(filePath, () => {});
                    resolve({
                        success: false,
                        error: 'Digest verification failed',
                        expected: expectedDigest,
                        actual: actualDigest
                    });
                    return;
                }
            }

            // Auto-execute based on OS
            const platform = process.platform;
            if (platform === 'win32' && fileName.endsWith('.exe')) {
                const child = spawn(filePath, [], { detached: true }, (err) => {
                    if (err) {
                      fs.unlink(filePath, () => {});
                      resolve({ success: false, error: err.message });
                      return;
                    }
                    child.unref();
                });
                resolve({ success: true, filePath, action: 'executing' });
            }
            else if (platform === 'darwin' && fileName.endsWith('.dmg')) {
                shell.openPath(filePath);
                resolve({ success: true, filePath, action: 'opened' });
            }
            else if (platform === 'linux' && fileName.endsWith('.AppImage')) {
                fs.chmod(filePath, 0o755, () => {
                  const child = spawn(filePath, [], { detached: true }, (err) => {
                  if (err) {
                      fs.unlink(filePath, () => {});
                      resolve({ success: false, error: err.message });
                      return;
                    }
                  });
                  child.unref();
                });
                resolve({ success: true, filePath, action: 'executing' });
            }
            else {
                shell.showItemInFolder(filePath);
                resolve({ success: true, filePath, action: 'downloaded' });
            }

            app.quit()
        })

        file.on('error', (e) => {
          fs.unlink(filePath, () => {});
          resolve({ success: false, error: e.message });
        });
    })
    .on('error', (err) => {
        fs.unlink(filePath, () => {});
        resolve({ success: false, error: err.message });
    });
  });
}
ipcMain.handle('download-update', downloadUpdate);

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
    createMainWindow();
});

async function getGithubVersion() {
  const request = await fetch("https://raw.githubusercontent.com/Serpenseth/SaiphAI/refs/heads/main/package.json");

  if (!request.ok) {
    mainWindow.webContents.send("update-error", "Failed to fetch remote version");
    return '0.0.0';
  }

  const data = await request.json();

  return data.version;
}

async function getGithubPackageData() {
  try {
    const request = await fetch("https://api.github.com/repos/serpenseth/saiphai/releases/latest");

    if (!request.ok) {
      mainWindow.webContents.send(
        "date-error",
        "Seems like either you have internet problems, "
        + "or you've been downloading/canceling a little too often.\n"
        + "Try again later"
      );
      return;
    }

    const data = await request.json();

    // Data obtained from Github
    const os = process.platform;
    const isWindows = process.platform === "win32";
    const extension = isMac ? ".dmg" : isWindows ? ".exe" : ".AppImage";
    const tag = data.tag_name;
    const version = tag.replace("v", "");
    const baseDownloadUrl = "https://github.com/Serpenseth/SaiphAI/releases/download";
    const digest = data.assets.find(x => x.name.includes(extension)).digest;

    return {
      releaseNotes: data.body,
      tag: tag,
      downloadUrl: `${baseDownloadUrl}/${tag}/SaiphAI-${version}${extension}`,
      digest: digest
    }
  }
  catch(e) {
    console.error(e);
    throw e;
  }
}

async function checkForUpdates() {
  const currentVersion = app.getVersion();
  const githubVersion = await getGithubVersion();

  if (githubVersion === '0.0.0') {
    mainWindow.webContents.send("date-error", "Failed to fetch remote version");
    return;
  }

  if (currentVersion !== githubVersion) {
    const githubData = await getGithubPackageData();

    mainWindow.webContents.send('update-available', {
      localVersion: currentVersion,
      remoteVersion: githubVersion,
      githubData: githubData
      });
    }
    else { mainWindow.webContents.send('update-not-available') }
}

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

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0)
    createMainWindow();
});

