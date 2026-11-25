import { Ui } from './Ui.js';
import { ChatPanel } from '../ChatPanel.js';

const DeleteHistory = {
  handle(historyModal) {
    const { id, title } = ChatPreview.hovered;
    const response = confirm(`Are you sure you want to delete chat '${title}'?`);

    if (response) {
      ChatPanel.closeTab(id);
      Ui.removeEntry(`history-${id}`);
    }
  },
}

export { DeleteHistory };

