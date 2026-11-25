import { DownloadModelManager } from './WindowAPI.js';
import { DownloadUiState } from './DownloadUiState.js';

const AbortButtonHandler = {
  async handleAbort() {
    await DownloadModelManager.abortDownload();
    DownloadUiState.set('aborted');
  },
}

export { AbortButtonHandler };
