const { piscina } = require('./piscina_instance.js');

const OpenAi = require('./OpenAI.js');
const openAi = new OpenAi();

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

module.exports = {
  isOpenAiApiKeyValid,
  getAllOpenAiModels,
};
