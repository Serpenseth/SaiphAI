const path = require('path');
const { DiskIndexManager } = require('./IndexManager.js');

let manager = null;
let abortRequested = false;

process.on('message', async (message) => {
  if (message?.type !== 'start') return;

  try {
    manager = new DiskIndexManager(message.userDataPath);

    await manager.indexFile(
      message.workspace,
      (filePath) => {
        if (abortRequested) {
          throw new Error('Indexing aborted');
        }

        process.send({ type: 'progress', filePath });
      }
    );

    process.send({ type: 'done' });
    process.exit(0);
  }
  catch (error) {
    process.send({
      type: 'error',
      message: error && error.message ? error.message : error,
      stack: error && error.stack ? error.stack : ''
    });

    process.exit(1);
  }
});

process.on('message', (message) => {
  if (message?.type === 'abort') {
    abortRequested = true;
  }
});

