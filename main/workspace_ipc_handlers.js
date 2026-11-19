const { app, ipcMain } = require('electron');
const path = require('path');
const { piscina } = require('./piscina_instance.js');

const { fork } = require('child_process');

const CHILD_PATH = path.join(__dirname, 'indexing_child.js');
let indexingChild = null;
let abortRequested = false;

const indexWorkspace = async (event, workspace) => {
  if (indexingChild) {
    throw new Error('Indexing is already running');
  }

  indexingChild = fork(CHILD_PATH, [], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1'
    }
  });
  abortRequested = false;

  return new Promise((resolve, reject) => {
    const child = indexingChild;

    const sendProgress = (filePath) => {
      event.sender.send('indexing-progress', filePath);
    };

    const cleanup = () => {
      child.removeAllListeners();
      indexingChild = null;
      abortRequested = false;
    };

    child.on('message', (message) => {
      if (message.type === 'progress') {
        sendProgress(message.filePath);
      }

      else if (message.type === 'done') {
        cleanup();
        resolve({ aborted: false });
      }

      else if (message.type === 'error') {
        cleanup();
        reject(new Error(message.message || 'Indexing failed'));
      }
    });

    child.on('exit', (code, signal) => {
      if (abortRequested) {
        cleanup();
        resolve({ aborted: true });
        return;
      }

      if (code !== 0 && code !== null) {
        cleanup();
        reject(new Error(`Indexing exited unexpectedly (${signal || code})`));
      }
    });

    child.on('error', (error) => {
      cleanup();
      reject(error);
    });

    child.send({
      type: 'start',
      workspace,
      userDataPath: app.getPath('userData')
    });
  });
}

ipcMain.handle('abort-indexing', () => {
  if (!indexingChild) {
    return false;
  }

  abortRequested = true;
  const child = indexingChild;

  console.log('aborted');

  child.send({ type: 'abort' });
  child.kill('SIGTERM');

  setTimeout(() => {
    if (indexingChild === child) {
      child.kill('SIGKILL');
    }
  }, 250);

  return true;
});

const searchWorkspace = async (event, searchQuery) => {
  const res = await piscina.run({
    taskName: 'searchWorkspace',
    payload: {
      searchQuery: searchQuery,
      userDataPath: app.getPath('userData')
    }
  });
  return res;
}

module.exports = {
  indexWorkspace,
  searchWorkspace,
};
