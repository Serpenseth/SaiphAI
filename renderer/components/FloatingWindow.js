import {
  DomQuery,
  StringUtils,
  MarkdownParser,
} from '../utility/utilities.js';

import { suggestEditPrompt } from './suggest_edit_prompt.js';
import { FloatingButtons } from './FloatingButtons.js';

const FloatingWindowUI = {
  create(id) {
    return `
      <div id='floating-window-${id}' class='floating-window' style='display: none'
      </div>`;
  },

  createCloseFloatingWindowButton(id) {
    return `
      <button id='close-floating-${id}' class='close-floating-window' style='display: none'>
        X
      </button>`;
  },

  createThinkingSpinner(id, useDefaultText=true) {
    const thinkingDivStyle = 'display: flex; flex-direction: row;';
    const text = useDefaultText
      ? 'Analyzing selected text...'
      : 'Thinking...';

    return `
      <div id='floating-thinking-${id}' style='${thinkingDivStyle}' style='display: none'>
        <div class='mini-spinner'></div>
        <p class='secondary-text'>${text}</p>
      </div>`;
  },

  createSendChangeInputField(id) {
    const containerID = `suggest-input-container-${id}`;
    const sendBtnID = `send-suggestion-${id}`;

    return `
      <div id='${containerID}' class=suggest-input-container' style='display: none'>
        <div>
          <p class='text-secondary'>
            Enter below what you'd like to change
          </p>

          <div style='display: flex; flex-direction: row'>
            <textarea id='suggest-input-${id}' class='suggest-input'></textarea>
            <button id='${sendBtnID}' class='chat-action send-suggest'>
              <img style='height: 16px; width: 16px;' src='../assets/send.png'
            </button>
          </div>
        </div>
      </div>`;
  },

  createTryAgainButton(id) {
    return `
      <div id='try-again-container' class='try-again-container' style='display: none'>
        <button id='try-again-${id}' class='try-again'>
          Try again
        </button>
      </div>`;
  },

  createUserMsgBubble(id, message) {
    return `
      <div id='floating-window-msg-${id}' class='ai-response'>
        ${message}<br><br>
      </div>`;
  },

  createErrorBubble(id, errorMessage) {
    return `
      <div id='floating-window-err-${id}' class='error-msg-bubble'>
        ${errorMessage}
      </div>`;
  },
}

const FileHandler = {
  async readFile(filePath) {
    return await window.electronAPI.readFile(filePath);
  },
}

const AiBackend = {
  async sendOllamaChat(message, chosenModel) {
    return window.electronAPI.chatOllama(message, chosenModel);
  },

  async sendOpenaiChat(message, chosenModel) {
    return window.electronAPI.chatOpenai(message, chosenModel);
  },
}

const Config = {
  async getSelectedFramework() {
    const config = await window.electronAPI.readConfigFile();
    return config.modelFramework;
  },

  async getSelectedModel() {
    const config = await window.electronAPI.readConfigFile();
    return config.selectedModel;
  },
}

const PromptOptions = {
  suggestEditPrompt: suggestEditPrompt,
  explainTextPrompt: `Explain the following text based on the provided file contents.`,
};

const Ui = {
  showFloatingWindow(fullWindowID, state) {
    DomQuery.showElement(fullWindowID, state);
  },

  attachFloatingWindow(elementHTML) {
    const elementDOM = DomQuery.htmlTemplateToDOM(elementHTML);
    DomQuery.appendChild('tabs-and-editor', elementDOM);
  },

  attachElementToFloatingWindow(fullWindowID, elementHTML) {
    const elementDOM = DomQuery.htmlTemplateToDOM(elementHTML);
    DomQuery.appendChild(fullWindowID, elementDOM);
  },

  showElement(fullWindowID, state) {
    DomQuery.showElement(fullWindowID, state);
  },

  showFloatingWindowElement(elementHTML, state) {
    const elementDOM = DomQuery.htmlTemplateToDOM(elementHTML);
    const firstChild = elementDOM.firstElementChild;

    DomQuery.showElement(firstChild.id, state);
  },

  removeFloatingWindowElement(fullElementID) {
    DomQuery.removeElement(fullElementID);
  },

  getFloatingWindowContent(fullWindowID) {
    const floatingWindow = DomQuery.getElement(fullWindowID);
    return floatingWindow.innerHTML;
  },

  getFloatingWindowContentLength(fullWindowID) {
    const floatingWindow = DomQuery.getElement(fullWindowID);
    return floatingWindow.innerHTML.length;
  },

  setFloatingWindowContent(fullWindowID, newContent) {
    DomQuery.updateInnerHTML(fullWindowID, newContent);
  },

  getFloatingWindowElement(fullWindowID) {
    return DomQuery.getElement(fullWindowID);
  },
}

const PromptHandler = {
  async buildPrompt(data, fromExplainText=true) {
    const fileContents = await FileHandler.readFile(data. fileName);
    let prompt;

    if (fromExplainText) {
      prompt = PromptOptions.explainTextPrompt;
      prompt = `${prompt}\n\nTEXT TO EXPLAIN: ${data.text}\n\n`;
      prompt = `${prompt}\n\nREFERENCE FILE CONTENTS: ${fileContents}\n\n`;
    }

    else {
      const { selectedText, userInstruction } = data;

      prompt = PromptOptions.suggestEditPrompt;
      prompt = `${prompt}\n\nFILE: ${fileName}\n\n`;
      prompt = `${prompt}FULL FILE CONTENTS: ${fileContents}\n\n`;
      prompt = `${prompt}SELECTED CODE: ${selectedText}\n\n`;
      prompt = `${prompt}USER REQUEST: ${userInstruction}\n\n`;
    }

    return prompt;
  },
}
/*
const SuggestEdit = {
  async send(fileName, selectedText, userInstruction) {
    const fileContents = await FileManager.readFile(fileName);

    const selectedFramework = await Config.getSelectedFramework();
    const selectedModel = await Config.getSelectedModel();

    let prompt = PromptOptions.suggestEditPrompt;
    prompt = `${prompt}\n\nFILE: ${fileName}\n\n`;
    prompt = `${prompt}FULL FILE CONTENTS: ${fileContents}\n\n`;
    prompt = `${prompt}SELECTED CODE: ${selectedText}\n\n`;
    prompt = `${prompt}USER REQUEST: ${userInstruction}\n\n`;

    return response = selectedFramework === 'ollama'
      ? AiBackend.sendOllamaChat(prompt, selectedModel)
      : AiBackend.sendOpenaiChat(prompt, selectedModel);
  },
}*/

const AiResponse = {
  async generate(prompt) {
    const chosenModel = await Config.getSelectedModel();
    const chosenFramework = await Config.getSelectedFramework();

    const result = chosenFramework === 'ollama'
      ? await AiBackend.sendOllamaChat(prompt, chosenModel)
      : await AiBackend.sendOpenaiChat(prompt, chosenModel);

    return result.message.content;
  },
}

const FloatingButtonsAction = {
  async explainText(clickedButtonID, text, fileName) {
    const id = StringUtils.getRawID(clickedButtonID);
    const floatingWindow = FloatingWindow.element(id);
    const fWindowID = floatingWindow.id;
    const thinkingID = `floating-thinking-${id}`;

    try {
      Ui.showFloatingWindow(fWindowID, true);
      FloatingButtons.show(id, false);

      const prompt = await PromptHandler.buildPrompt({
        text: text,
        fileName: fileName
      });

      const aiReply = await AiResponse.generate(prompt);
      const mdAiResponse = MarkdownParser.parse(aiReply);
      const respHTML = FloatingWindowUI.createUserMsgBubble(id, mdAiResponse);

      Ui.showElement(thinkingID, false);
      Ui.attachElementToFloatingWindow(fWindowID, respHTML);
    }

    catch(e) {
      Ui.showElement(thinkingID, false);
      FloatingButtons.show(id, false);
      console.error(e);
      const errHTML = FloatingWindowUI.createErrorBubble(id, e);
      Ui.attachElementToFloatingWindow(fWindowID, errHTML);
    }
  },
}

const FloatingWindowCreation = {
  init(rawID) {
    const floatingWindow = FloatingWindowUI.create(rawID);
    Ui.attachFloatingWindow(floatingWindow);

    const elementsToAttach = [
      FloatingWindowUI.createCloseFloatingWindowButton(rawID),
      FloatingWindowUI.createThinkingSpinner(rawID),
      FloatingWindowUI.createSendChangeInputField(rawID),
      FloatingWindowUI.createTryAgainButton(rawID),
    ];

    elementsToAttach.forEach(el => {
      Ui.attachElementToFloatingWindow(`floating-window-${rawID}`, el);
    });

    return floatingWindow;
  },
}

const FloatingWindow = {
  create(rawID) {
    return FloatingWindowCreation.init(rawID);
  },

  show(fullWindowID, state) {
    Ui.showFloatingWindow(fullWindowID, state);
  },

  destroy(fullWindowID) {
    Ui.removeFloatingWindowElement(fullWindowID);
  },

  showThinkingSpinner(rawID, state) {
    Ui.showElement(`floating-thinking-${rawID}`, state);
  },

  showSendSuggestEdit(rawID, state) {
    Ui.showElement(`suggest-input-container-${rawID}`, state);
  },

  showTryAgainButton(rawID, state) {
    Ui.showElement(`try-again-${rawID}`, state);
  },

  setContent(rawID, newContent) {
    Ui.setFloatingWindowContent(`floating-window-${rawID}`, newContent);
  },

  getContentLength(fullWindowID) {
    return Ui.getFloatingWindowContentLength(fullWindowID);
  },

  element(rawID) {
    return Ui.getFloatingWindowElement(`floating-window-${rawID}`);
  },

  async explainText(btnD, text, fileName) {
    return await FloatingButtonsAction.explainText(btnD, text, fileName);
  }
}

export { FloatingWindow }

