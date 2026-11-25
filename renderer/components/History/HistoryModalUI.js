import { MarkdownParser } from '../../utility/utilities.js';

const HistoryModalUI = {
  create() {
    return `
      <div class='modal-content-settings' style='flex-direction: row; pointer-events: auto; height: 80%; width: 85%'>
        <button id='close-history' class='close-modal' style='position: absolute; top: 0; right: 0; margin-top: 1rem; margin-right: 1rem;'>X</button>
        <div class="sidebar-container" style='height: 100%'>
          <div class="history-sidebar">
            <h2 style='border-bottom: 1px solid rgba(73, 92, 184, 0.075); padding-bottom: 1rem; padding-left: 0.25rem;'>History</h2>
            <div id='history-list' style='padding-top: 0.5rem;'>
            </div>
          </div>
        </div>
        <div id='preview-chats' class='preview-chats' style='height: 80%; width: 90%; padding-right: 1rem;'>
        </div>
        <div style='display: flex; flex-direction: row; position: absolute; right: 0; bottom: 0; padding-right: 1rem; margin-bottom: 1rem; background: #131415'>
            <button id='delete-history' class="btn btn-delete" style='width: 128px; margin-right: 0.5rem;'>Delete</button>
            <button id='load-history' class="btn btn-primary" style='width: 128px;'>Load</button>
          </div>
      </div>
    `;
  },

  createUserMessageBubble(message) {
    return `
      <div class='history-user-msg-bubble'>
        ${MarkdownParser.parse(message)}
      </div>`;
  },

  createAiResponseUI(text) {
    const parsedText = MarkdownParser.parse(text);

    return `
      <div class='history-ai-response'>
        ${parsedText}
      </div>`;
  },
}

export { HistoryModalUI };
