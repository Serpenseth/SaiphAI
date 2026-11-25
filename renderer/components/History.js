import {
  DomQuery,
  MarkdownParser,
  StringUtils,
} from '../utility/utilities.js';

import { HistoryModalUI } from './History/HistoryModalUI.js';
import { Ui } from './History/Ui.js';
import { CloseHistoryHandler } from './History/CloseHistoryHandler.js';
import { LoadHistory } from './History/LoadHistory.js';
import { DeleteHistory } from './History/DeleteHistory.js';
import { EventHandler } from './History/EventHandler.js';

const HistoryModal = {
  init(data) {
    Ui.build(HistoryModalUI.create());
    Ui.populateHistory(data);

    EventHandler.setupKeyPressEvent(
      (e) => CloseHistoryHandler.handleEscClose(e),
    );

    EventHandler.setupClickEvents([
      { id: 'close-history', fn: () => Ui.show(false) },
      { id: 'load-history', fn: () => LoadHistory.handle(this) },
      { id: 'delete-history', fn: () => DeleteHistory.handle(this) },
    ]);

    EventHandler.setupMouseOverEvent('history-list', data);
  },

  show(state) {
    Ui.show(state);
  },

  appendEntry(title, id) {
    const chatElement = Ui.createEntry(title, id);
    Ui.appendEntry(chatElement);
  },

  populateHistory(data) {
    Ui.populateHistory(data);
    EventHandler.setupMouseOverEvent('history-list', data);
  },
}

export { HistoryModal };
