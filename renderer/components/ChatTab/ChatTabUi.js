const ChatTabUi = {
  create(id) {
    return `
      <div id='ai-tab-${id}' class='tabAI' draggable='true'>
        <p id='ai-tab-title-${id}'>Untitled</p>
        <button
          id='btn-close-chat-${id}' class='tab-close' title='Close chat tab'>
        ×
        </button>
      </div>`;
  },
}

export { ChatTabUi };
