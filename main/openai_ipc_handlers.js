const { piscina } = require('./piscina_instance.js');

const { OpenAi } = require('./OpenAI.js');
const openAi = OpenAi;

/**
 *  Informs if OpenAI api key is valid or not.
 *
 *  @param {string} key - OpenAI API key.
 *
 *  @returns {Array < Object >} true if key is valid, false with error if not.
*/
const isOpenAiApiKeyValid = async (event, key) => {
  const isValid = await piscina.run({
    taskName: 'isOpenAiApiKeyValid',
    payload: { key: key }
  });
  return isValid;
}

/**
 *  Gets OpenAI models that are available to the user.
 *
 *  @param {string} key - OpenAI API key.
 *
 *  @returns {Array < Object >} list of models, or empty list with error.
*/
const getAllOpenAiModels = async (event, key) => {
  try {
    const models = await piscina.run({
      taskName: 'getAllOpenAiModels',
      payload: { key: key }
    });
    return models;
  }
  catch(e) {
    return { models: [], error: e.message };
  }
}

/**
 *  Sends prompt to an OpenAI model.
 *
 *  @param {string} apiKey - OpenAI API key.
 *  @param {string} message - The message that the LLM will respond to.
 *  @param {string} selectedModel - Selected OpenAI model to use.
 *
 *  @returns {Array < Object >} list of models, or empty list with error.
*/
const sendChat = async (event, apiKey, message, selectedModel) => {
  try {
    const response = await piscina.run({
      taskName: 'chatOpenai',
      payload: {
        key: key,
        message: message,
        selectedModel: selectedModel,
      }
    });
    return response;
  }
  catch(e) {
    return { error: e.message };
  }
}

module.exports = {
  isOpenAiApiKeyValid,
  getAllOpenAiModels,
  sendChat,
};
