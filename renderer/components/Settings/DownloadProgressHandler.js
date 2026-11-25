import { SettingsUiHelper as Ui } from './SettingsUiHelper.js';

const DownloadProgressHandler = {
  progressHandler: null,
  isInit: false,

  setupHandler() {
    if (!this.isInit) {
      DownloadProgressHandler.progressHandler = (data) => {
        DownloadProgressHandler.downloadProgress(data);
      }

      window.electronAPI.onDLModelProgress(DownloadProgressHandler.progressHandler);
      this.isInit = true;
    }
  },

  downloadProgress(data) {
    if (data.percent !== 100)
      Ui.updateProgressText(`${data.percent}%`);

    else
      Ui.updateProgressText("Verifying SHA digest...");
  },

  destroy() {
    if (this.isInit) {
      window.electronAPI.removeDownloadProgress(DownloadProgressHandler.progressHandler);
    }
    this.isInit = false;
  }
}

export { DownloadProgressHandler };
