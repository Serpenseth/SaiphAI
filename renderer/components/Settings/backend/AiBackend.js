const AiBackend = {
  async getOpenAiModels() {
    return window.electronAPI.getAllOpenAiModels();
  },

  async isKeyValid(apiKey) {
    return window.electronAPI.isOpenAiApiKeyValid(apiKey);
  },

  async getOllamaModels() {
    return window.electronAPI.getOllamaModels();
  },
}

export { AiBackend };
