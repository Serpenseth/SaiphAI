import { SettingsUiHelper as Ui } from './SettingsUiHelper.js';

const DownloadUiState = {
  set(state, errorText=null) {
    if (state === 'downloading') {
      Ui.updateProgressText('0%');
      Ui.showDownloadText(true);
      Ui.showAbortButton(true);
      Ui.showDownloadModelButton(false);
    }

    else if (state === 'error') {
      Ui.hideProgressText();
      Ui.showErrorMessage(errorText);
      Ui.showDownloadText(false);
      Ui.showAbortButton(false);
      Ui.showDownloadModelButton(true);
    }

    else if (state === 'aborted') {
      Ui.hideProgressText();
      Ui.showDownloadText(true);
      Ui.showAbortButton(true);
      Ui.showDownloadModelButton(false);
    }

    else if (state === 'success') {
      Ui.hideProgressText();
      Ui.updateProgressText("Download complete");
      Ui.showDownloadModelDiv(false);
    }
  },
}

export { DownloadUiState };
