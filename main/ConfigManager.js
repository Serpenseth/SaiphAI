const fs = require('fs').promises;

class ConfigManager {
  constructor(configFile) {
    this.config = configFile;
  }

  async readConfigFile() {
    const data = await fs.readFile(this.config, 'utf8');
    return JSON.parse(data);
  }

  async writeToConfigFile(event, updates) {
    const configContents = await this.readConfigFile();
    await fs.writeFile(this.config, JSON.stringify({
      ...configContents,
      ...updates
    }, null, 4));
  }

  async createConfigFile() {
    await fs.writeFile(this.config, JSON.stringify({
      showSidebar: true,
      workspacePath: null,
      lastTab: null,
      lastFileTab: null,
      modelFramework: null,
      selectedModel: null,
    }, null, 4));
  }
}

module.exports = ConfigManager;
