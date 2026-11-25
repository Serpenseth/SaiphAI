import { DomQuery } from '../../utility/utilities.js';
import { Ui } from './Ui.js';

const ChatPreview = {
  hovered: null,
}

const EventHandler = {
  setupMouseOverEvent(element, data) {
    const el = DomQuery.getElement(element);
    el.addEventListener('mouseover', (e) => {
      const target = e.target.closest('.history-item');

      if (target) {
        const targetID = target.id.replace('history-', '');
        const index = data.id.findIndex(id => id === targetID);

        Ui.renderChatHistoryPreview(data.chats[index]);
        ChatPreview.hovered = {
          id: targetID,
          title: data.chats[index].title,
          chats: data.chats[index],
        };
      }
    });
  },

  setupClickEvents(elems, fn) {
    elems.forEach(({ id, fn }) => {
      const elem = DomQuery.getElement(id);

      if (elem)
        elem.addEventListener('click', fn);
    });
  },

  setupKeyPressEvent(fn) {
    document.addEventListener('keydown', fn);
  },
}

export { EventHandler };
