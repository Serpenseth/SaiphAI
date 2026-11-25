const DownloadModelManager = {
  async downloadModel(modelName) {
    return window.electronAPI.downloadOllamaModel(modelName);
  },

  async abortDownload() {
    await window.electronAPI.abortModelDownload();
  },
}

export { DownloadModelManager };
