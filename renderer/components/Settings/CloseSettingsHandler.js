import { SettingsUiHelper as Ui } from './SettingsUiHelper.js';

const CloseSettingsHandler = {
  handleEscClose(e) {
    if (e.key === 'Escape')
      Ui.show(false)
  },

  handleCloseButton() {
    Ui.show(false);
  },
}

export { CloseSettingsHandler };
