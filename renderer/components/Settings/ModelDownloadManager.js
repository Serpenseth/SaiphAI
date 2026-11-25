import { DownloadUiState } from './DownloadUiState.js';

const ModelDownloadManager = {
  async downloadModel(modelName) {
    try {
      DownloadUiState.set('downloading');

      const result = await DownloadModelManager.downloadModel(modelName);
      result.success
        ? DownloadUiState.set('success')
        : DownloadUiState.set('error', result.error);
    }
    catch (e) {
      DownloadUiState.set('error', e.message);
    }
  },
}

export { ModelDownloadManager };
