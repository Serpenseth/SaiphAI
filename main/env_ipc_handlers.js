const { EnvManager } = require('./EnvManager.js');

/**
 *  Creates .env file.
 *  @returns {null}
*/
const createEnvFile = async () => {
  await EnvManager.create()
}

/**
 *  Reads key from .env file.
 *  @param {string} keyName - Key to read.
 *  @returns {{ success: boolean, error: string|null, keyName: string|null }}
*/
const readEnvKey = (event, keyName) => {
  return EnvManager.readKey(keyName);
}

/**
 *  Writes key to .env file.
 *  @param {string} keyName - Key to write.
 *  @returns {null}
*/
const writeEnvKey = async (event, keyName, key) => {
  await EnvManager.writeKey(keyName, key);
}

/**
 *  Removes key from .env file.
 *  @param {string} keyName - Key to remove.
 *  @returns {{ success: boolean, error: string|null }}
*/
const removeEnvKey = async (event, keyName) => {
  return await EnvManager.removeKey(keyName);
}

/**
 *  Checks if key is empty.
 *  @param {string} keyName - Key to check.
 *  @returns {boolean} False if not empty, true otherwise.
*/
const isKeyEmpty = (event, keyName) => {
  return EnvManager.isKeyEmpty(keyName);
}

module.exports = {
  createEnvFile,
  readEnvKey,
  writeEnvKey,
  removeEnvKey,
  isKeyEmpty
};



