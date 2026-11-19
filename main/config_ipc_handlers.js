const { app } = require('electron');
const path = require('path');

const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');

const ConfigManager = require('./ConfigManager.js');
const configManager = new ConfigManager(SETTINGS_FILE);

const createConfigFile = async () => {
  await configManager.createConfigFile();
}

/**
 *  Reads the settings file.
 *
 *  @returns {Array} user's settings.
*/
const readConfigFile = async () => {
  try {
    const config = await configManager.readConfigFile();
    return config;
  }
  catch(_) { return null; }
}

/**
 *  Writes new data to the config file.
 *
 *  @param {Object} data - The setting to write.

 *  @returns {null}
*/
const writeToConfigFile = async (event, data) => {
  await configManager.writeToConfigFile(event, data);
}

module.exports = {
  createConfigFile,
  readConfigFile,
  writeToConfigFile,
};
