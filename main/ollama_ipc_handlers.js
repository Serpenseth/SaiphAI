const { piscina } = require('./piscina_instance.js');

const Ollama = require('./Ollama.js');
const ollama = new Ollama();

/**
 *  Downloads Ollama model.
 *
 *  @param {string} modelName - The model name to download.
 *  @returns {bool || Array} True if everything goes as planned, or false with error message.
*/
const downloadOllamaModel = async (event, modelName) => {
  try {
    await ollama.pullModel(event, modelName, (progress) => {
      event.sender.send('download-model-progress', progress);
    });
    return { success: true };
  }
  catch (e) {
    return { success: false, error: e };
  }
}

const chatOllama = async (event, message, model) => {
  return await ollama.chat(event, message, model);
}

/**
 *  Checks if Ollama is running or not.
 *
 *  @returns {bool} True if connection exists, false otherwise.
*/
const checkOllama = async () => {
  return await piscina.run({
    taskName: 'checkOllama',
    payload: {},
  });
}

/**
 *  Gets all installed models.
 *
 *  @returns {Arrray< Object >} bool and models, or bool, error, and empty model list.
*/
const getOllamaModels = async () => {
  try {
    const models = await piscina.run({
      taskName: 'getOllamaModels',
      payload: {},
    });
    return { success: true, models: models };
  }
  catch (e) {
    return { success: false, error: e.message, models: [] };
  }
}

/**
 *  Aborts model download.
 *
 *  @returns {null}
*/
const abortModelDownload = () => {
  ollama.abortDownload();
}

module.exports = {
  downloadOllamaModel,
  chatOllama,
  checkOllama,
  getOllamaModels,
  abortModelDownload,
};




