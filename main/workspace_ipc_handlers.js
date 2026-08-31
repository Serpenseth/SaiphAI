const { app } = require('electron');
const { piscina } = require('./piscina_instance.js');

const indexWorkspace = async (event, workspace) => {
  const sendProgress = (filePath) => {
    event.sender.send('indexing-progress', filePath);
  };

  piscina.on('message', (message) => {
    if (message?.type === 'indexing-progress')
      sendProgress(message.filePath);
  });

   piscina.run({
    taskName: 'indexWorkspace',
    payload: {
      workspace: workspace,
      userDataPath: app.getPath('userData'),
    }
  });
}

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
