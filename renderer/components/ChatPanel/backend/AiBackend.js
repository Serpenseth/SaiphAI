const AiBackend = {
  async sendOllamaChat(message, chosenModel) {
    return window.electronAPI.chatOllama(message, chosenModel);
  },

  async sendOpenaiChat(message, chosenModel) {
    return window.electronAPI.chatOpenai(message, chosenModel);
  },

  async supportsVision(model) {
    return window.electronAPI.modelSupportsImages(model);
  }
}

export { AiBackend };
