import { Ui } from './Ui.js';

const CloseHistoryHandler = {
  handleEscClose(e) {
    if (e.key === 'Escape')
      Ui.show(false)
  },

  handleCloseButton() {
    Ui.show(false);
  },
}

export { CloseHistoryHandler };
