const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs').promises;
const fsSync = require('fs');

const EnvManager = {
  ENV_PATH: path.join(app.getPath('userData'), '.env'),

  async create() {
    await fs.writeFile(this.ENV_PATH, "OPENAI_KEY=", 'utf8');
  },

  readKey(keyName) {
    if (!fsSync.existsSync(this.ENV_PATH))
      return {
        success: false,
        error: "env file doesn't exist yet",
        keyName: null,
      }

    dotenv.config({ path: this.ENV_PATH });

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

    async writeKey(key) {
      const envContent = await fs.readFile(this.ENV_PATH, 'utf8');
      const lines = envContent.split('\n');
      const keyIndex = lines.findIndex(line => line.startsWith(`${key}=`));

      if (keyIndex >= 0) {
        lines[keyIndex] = `${key}=${content}`;
      }
      else {
        lines.push(`${key}=${content}`);
      }

      await fs.writeFile(this.ENV_PATH, lines.join('\n'), 'utf8');
      // Reload env
      dotenv.config({ path: this.ENV_PATH, override: true });
    },

    async removeKey(keyName) {
      const envContent = await fs.readFile(this.ENV_PATH, 'utf8');
      const lines = envContent.split('\n');
      const keyIndex = lines.findIndex(line => line.startsWith(`${key}=`));

      if (keyIndex >= 0) {
        if (lines[keyIndex] === `${key}=`)
          return {
            success: false,
            error: "key already empty",
          }

        lines[keyIndex] = `${key}=`;
        await fs.writeFile(this.ENV_PATH, lines.join('\n'), 'utf8');
        // Reload env
        dotenv.config({ path: this.ENV_PATH, override: true });

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

    isKeyEmpty(keyName) {
      dotenv.config({ path: this.ENV_PATH });

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



