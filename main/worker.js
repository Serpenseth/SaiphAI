const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

const Ollama = require('./Ollama.js');
const ollama = new Ollama();

const OpenAi = require('./OpenAI.js');
const openAi = new OpenAi();

const { TextSummarization } = require('./TextSummarization.js');
const { DiskIndexManager } = require('./IndexManager');


async function getManager(workspacePath, userDataPath) {
  const baseName = path.basename(workspacePath);
  const storagePath = path.join(userDataPath, `${baseName}_index`);

  return new DiskIndexManager(storagePath);
}

async function indexAllFiles(manager, directoryPath) {
  const files = fsSync.readdirSync(directoryPath);

  for (const file of files) {
    const fullPath = path.join(directoryPath, file);
    await manager.indexFile(fullPath);
  }
}

async function indexWorkspace(workspacePath, userDataPath) {
  const manager = await getManager(workspacePath, userDataPath);
  const baseName = path.basename(workspacePath);
  const chunksDir = path.join(userDataPath, `${baseName}_index`, 'chunks');

  if (fsSync.readdirSync(chunksDir).length === 0) {
    console.log('Indexing workspace...');
    await indexAllFiles(manager, workspacePath);
  }
}

async function searchIndex(searchQuery, userDataPath) {
  try {
    const manager = await getManager(userDataPath);
    console.log(`Querying: ${searchQuery}`);
    const relevantChunks = await manager.query(searchQuery);
    console.log('Number of relevent chunks found:', relevantChunks.length);
    return relevantChunks;
  }
  catch (error) {
    console.error('System Error:', error);
    throw error;
  }
}

function summarizeText(textToSum, textToInclude) {
  const textSummarization = new TextSummarization();
  return textSummarization.summarize(textToSum, textToInclude);
}

module.exports = async ({ taskName, payload }) => {
  switch(taskName) {
    case 'checkOllama':
      return ollama.checkConnection();
      break;

    case 'getOllamaModels':
      const models = await ollama.getInstalledModels();
      return models;
      break;

    case 'isOpenAiApiKeyValid':
      const isValid = await openAi.isApiKeyValid(payload.key);
      return isValid;
      break;

    case 'getAllOpenAiModels':
      const openAiModels = await openAi.getAllModels(payload.key);
      return openAiModels;
      break;

    case 'indexWorkspace':
      return await indexWorkspace(payload.workspace, payload.userDataPath);
      break;

    case 'searchWorkspace':
      return await searchIndex(payload.searchQuery, payload.userDataPath);
      break;

    case 'summarizeText':
      return summarizeText(payload.textToSum, payload.textToInclude);
      break;
  }
};
