const Config = {
  async get() {
    return window.electronAPI.readConfigFile();
  },

  async save(data) {
    await window.electronAPI.writeToConfigFile(data);
  },

  async getSelectedFramework() {
    const config = await window.electronAPI.readConfigFile();
    return config.modelFramework;
  },

  async getSelectedModel() {
    const config = await window.electronAPI.readConfigFile();
    return config.selectedModel;
  },

  async getUserModels(framework) {
    const config = await window.electronAPI.readConfigFile();
    return framework === 'ollama'
      ? config.ollamaModels
      : config.openaiModels;
  },

  async saveToConfig(data) {
    await window.electronAPI.writeToConfigFile({ showChatPanel: data.showChatPanel });
  },

  async saveSelectedModel(modelName) {
    await window.electronAPI.writeToConfigFile({ selectedModel: modelName });
  },
}

export { Config };
