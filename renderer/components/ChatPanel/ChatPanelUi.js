import { MarkdownParser } from '../../utility/utilities.js';

const ChatPanelUi = {
  create(id) {
    // panel container created in HTML
    return `
      <div id="ai-panel-${id}" class="ai-panel">
        <div id="handle-${id}" class="resizer"></div>
          <div id="chat-content-${id}" class="chat-history">
            <div id='panel-msg-${id}' class='panel-msg'>
              <p class='panel-text'>Your chats will appear here</p><br>
              <p class='panel-text'>This panel has access to all your project files</p>
            </div>
          </div>
          ${this._createChatInputArea(id)}
        </div>
      </div>`;
  },

  _createChatInputArea(id) {
    return `
      <div id="chat-input-area-${id}" class="chat-input-area">
        <div id="handle-chat-${id}" class="resizer-chat"></div>

        <div id="chat-file-container-${id}" class="chat-file-container" style='display: none'>
          <!-- Created dynamically via JS -->
        </div>

        <textarea
          id="user-prompt-${id}"
          class="chat-input"
          spellcheck="false"
          type="text"
          placeholder="Ask AI..."
        ></textarea>

        <!-- Send chat/attach files -->
        <div class="chat-action-container">
          <!-- Attach file to prompt button -->
          <button id="attach-file-${id}" class="chat-action attach-file-action" data-tooltip='Attach a file'>
            <img style='height: 16px; width: 16px;' src='../assets/add-file.png'></img>
          </button>

          <select id='select-model-ai-panel-${id}' class='select-model-ai-panel'></select>
          <!-- Send prompt button -->
          <button id="send-chat-${id}" class="chat-action send-action">
            <img style='height: 16px; width: 16px;' src='../assets/send.png'></img>
          </button>
        </div>
      </div>`;
  },

  createUserMessageBubble(message) {
    return `
      <div id='user-msg-bubble' class='user-msg-bubble'>
        ${MarkdownParser.parse(message)}
      </div>`;
  },

  createErrorBubble(errorMessage) {
    return `
      <div class='error-msg-bubble'>
        ${errorMessage}
      </div>`;
  },

  createAiResponseUI(text) {
    const parsedText = MarkdownParser.parse(text);

    return `
      <div class='ai-response'>
        ${parsedText}<br><br>
      </div>`;
  },

  createThinkingDiv(id) {
    const thinkingDivStyle = 'display: flex; flex-direction: row;';

    return `
      <div id='thinking-${id}' style='${thinkingDivStyle}'>
        <div class='mini-spinner'></div>
        <p class='secondary-text'>Thinking....</p>
      </div>`;
  },
}

export { ChatPanelUi };
