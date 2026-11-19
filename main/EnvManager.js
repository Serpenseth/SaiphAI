const dotenv = require('dotenv');
const fs = require('fs').promises;
const fsSync = require('fs');

const EnvPathHandler = {
  async fetchConfigPath() {
    const { default: envPaths } = await import('env-paths');
    const paths = envPaths('SaiphAI');
    return paths.config;
  },

  getEnvPath(configPath) {
    let path = configPath.replace('-nodejs\\Config', '');
    path = `${path}\\.env`;

    return path;
  },
}

const EnvManager = {
  async getEnvPath() {
    const configPath = await EnvPathHandler.fetchConfigPath();
    return await EnvPathHandler.getEnvPath(configPath);
  },

  async create() {
    const path = await EnvManager.getEnvPath();
    await fs.writeFile(path, "OPENAI_KEY=", 'utf8');
    dotenv.config({ path: path, override: true });
  },

  async readKey(keyName) {
    const path = await EnvManager.getEnvPath();

    // Refresh dotenv
    dotenv.config({ path: path, override: true });

    // TODO: implement api keys for other frameworks such as anthropic
    switch (keyName) {
      case 'OPENAI_KEY':
        return {
          success: true,
          error: null,
          keyName: process.env.OPENAI_KEY,
        };
        break;

      default:
        return {
          success: false,
          error: "Invalid env key",
          keyName: null,
        }
      }
    },

    async writeKey(keyName, key) {
      const path = await EnvManager.getEnvPath();
      const envContent = await fs.readFile(path, 'utf8');
      const lines = envContent.split('\n');
      const keyIndex = lines.findIndex(line => line.startsWith(`${keyName}=`));

      if (keyIndex >= 0) {
        lines[keyIndex] = `${keyName}=${key}`;
      }
      else {
        lines.push(`${keyName}=${key}`);
      }

      await fs.writeFile(path, lines.join('\n'), 'utf8');
      // Reload env
      dotenv.config({ path: path, override: true });
    },

    async removeKey(keyName) {
      const path = await EnvManager.getEnvPath();
      const envContent = await fs.readFile(path, 'utf8');
      const lines = envContent.split('\n');
      const keyIndex = lines.findIndex(line => line.startsWith(`${key}=`));

      if (keyIndex >= 0) {
        if (lines[keyIndex] === `${key}=`)
          return {
            success: false,
            error: "key already empty",
          }

        lines[keyIndex] = `${key}=`;
        await fs.writeFile(path, lines.join('\n'), 'utf8');
        // Reload env
        dotenv.config({ path: path, override: true });

        return {
          success: true,
          error: null,
        }
      }

      return {
        success: false,
        error: "key not found",
      }
    },

    async isKeyEmpty(keyName) {
      const path = await EnvManager.getEnvPath();
      dotenv.config({ path: path });

      switch (keyName) {
        case 'OPENAI_KEY':
          let k = process.env.OPENAI_KEY;

          if (k) {
            k = null;
            return false;
          }

          return true;
          break;

        default:
          throw "Invalid env key";
      }
    },
}

module.exports = { EnvManager };



