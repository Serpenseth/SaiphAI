import { DomQuery } from '../../utility/utilities.js';

const Ui = {
  show(state) {
    DomQuery.toggleVisibility('history-modal', state);
  },

  build(htmlTemplate) {
    DomQuery.insertHTML('history-modal', htmlTemplate);
  },

  displayUserMessage(message) {
    const bubble = HistoryModalUI.createUserMessageBubble(message);
    const bubbleHTML = DomQuery.htmlTemplateToDOM(bubble);

    DomQuery.appendChild('preview-chats', bubbleHTML);
  },

  displayAiResponse(message) {
    const bubble = HistoryModalUI.createAiResponseUI(message);
    const bubbleHTML = DomQuery.htmlTemplateToDOM(bubble);

    DomQuery.appendChild('preview-chats', bubbleHTML);
  },

  createEntry(title, id) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.id = `history-${id}`;
    item.innerHTML = `
      <div class="history-item-actions" style='display: flex; flex-direction: row'>
        <p>${title || 'Untitled'}</p>
      </div>
      <br>
    `;

    return item;
  },

  appendEntry(chatElement) {
    DomQuery.appendChild('history-list', chatElement);
  },

  removeEntry(id) {
    DomQuery.removeElement(id);
    DomQuery.updateInnerHTML('preview-chats', '');
  },

  populateHistory(chatsData) {
    DomQuery.updateInnerHTML('history-list', '');

    const fragment = new DocumentFragment();
    const chats = chatsData.chats;

    for (let i = 0; i < chats.length; i++) {
      const chat = chats[i];
      const id = chatsData.id[i];
      const item = this.createEntry(chat.title, id);
      fragment.appendChild(item);
    }

    DomQuery.getElement('history-list').appendChild(fragment);
  },

  renderChatHistoryPreview(chatData) {
    DomQuery.updateInnerHTML('preview-chats', '');

    for (let i = 0; i < chatData.user.length; i++) {
      const chat = chatData;
      Ui.displayUserMessage(chat.user[i]);
      Ui.displayAiResponse(chat.system[i]);
    }
  },
}

export { Ui };
