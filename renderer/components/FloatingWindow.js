import {
  DomQuery,
  StringUtils,
  MarkdownParser,
} from '../utility/utilities.js';

import { suggestEditPrompt } from './suggest_edit_prompt.js';
import { FloatingButtons } from './FloatingButtons.js';
import { FileEditor } from '../components/FileEditor.js';

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

          <div style="position: relative; display: flex; align-items: center; width: 100%;">
            <textarea
              id="suggest-input-${id}"
              class="suggest-input"
              style="padding-right: 40px;"
            ></textarea>

            <button id="${sendBtnID}"class="chat-action send-suggest">
              <img style="height: 16px; width: 16px;" src="../assets/send.png" alt="Send">
            </button>
          </div>

      </div>`;
  },

  createTryAgainButton(id) {
    return `
      <div style='display: flex; justify-content: center; width: 100%;'>
        <button id='try-again-${id}' class='try-again' style='display: none'>
          Try again
        </button>
      </div>`;
  },

  createAiReplyBubble(id, message) {
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
    const id = StringUtils.getRawID(fullWindowID);
    DomQuery.showElement(`floating-window-${id}`, state);
  },

  clearSuggestInputField(rawID) {
    DomQuery.updateInnerHTML(`suggest-input-container-${rawID}`, '');
  },

  destroyFloatingWindow(fullWindowID) {
    DomQuery.removeElement(fullWindowID);
  },

  createAndAttachTryAgainButton(rawID) {
    const button = FloatingWindowUI.createTryAgainButton(rawID);
    const floatingWindowID = `floating-window-${rawID}`;
    Ui.attachElementToFloatingWindow(floatingWindowID, button);
  },

  createTryAgainButton(rawID) {
    const button = FloatingWindowUI.createTryAgainButton(rawID);
    const elementDOM = DomQuery.htmlTemplateToDOM(button);
    return elementDOM;
  },

  attachFloatingWindow(elementHTML) {
    const elementDOM = DomQuery.htmlTemplateToDOM(elementHTML);
    DomQuery.appendChild('tabs-and-editor', elementDOM);
  },

  attachElementToFloatingWindow(fullWindowID, elementHTML) {
    const elementDOM = DomQuery.htmlTemplateToDOM(elementHTML);
    DomQuery.appendChild(fullWindowID, elementDOM);
  },

  appendElementToFloatingWindow(fullWindowID, element) {
    DomQuery.appendChild(fullWindowID, element);
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
    const id = StringUtils.getRawID(fullWindowID);
    DomQuery.updateText(`floating-window-msg-${id}`, newContent);
  },

  getFloatingWindowElement(fullWindowID) {
    return DomQuery.getElement(fullWindowID);
  },
}

const PromptHandler = {
  async buildPrompt(data, fromExplainText=true) {
    const fileContents = await FileHandler.readFile(data.fileName);
    let prompt;

    if (fromExplainText) {
      prompt = PromptOptions.explainTextPrompt;
      prompt = `${prompt}\n\nTEXT TO EXPLAIN: ${data.selectedText}\n\n`;
      prompt = `${prompt}\n\nREFERENCE FILE CONTENTS: ${fileContents}\n\n`;
    }

    else {
      prompt = PromptOptions.suggestEditPrompt;
      prompt = `${prompt}\n\nFILE NAME: ${data.fileName}\n\n`;
      prompt = `${prompt}REFERENCE FILE CONTENTS: ${fileContents}\n\n`;
      prompt = `${prompt}SELECTED CODE: ${data.selectedText}\n\n`;
      prompt = `${prompt}USER INSTRUCTIONS: ${data.userInstructions}\n\n`;
    }

    return prompt;
  },
}

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

const SuggestEditUI = {
  createNoChanges(id, tryAgainFn) {
    const noChangesMessage = `
      <div id='no-changes-${id}' class="ai-response">
        <em>
          No changes are required. The selected code looks good as-is.
        </em>
      </div>
      <br><br>`;

    const mdParsed = MarkdownParser.parse(noChangesMessage);
    const noChangesHTML = FloatingWindowUI.createAiReplyBubble(id, mdParsed);
    const fWindowID = `floating-window-${id}`;
    const clarifyHTML = Ui.attachElementToFloatingWindow(fWindowID, noChangesHTML);

    Controller.create(id);
    Ui.createAndAttachTryAgainButton(id);

    const tryAgainBtn = FloatingWindow.getElement(`try-again-${id}`);
    const controller = Controller.get(id).signal;

    tryAgainBtn.addEventListener('click', tryAgainFn, { once: true, signal: controller });
  },

  createClarifyMatch(id, clarifyMatch, tryAgainFn) {
    const parsedMatch = MarkdownParser.parse(clarifyMatch[1].trim());
    const clarifyMessage = `
      <div id='clarify-${id}' class="ai-response">
        <p><strong>I need clarification:</strong></p>
        <p>${parsedMatch}</p>
      </div>
      <br><br>`;

    FloatingWindowUI.createAiReplyBubble(id, clarifyMessage);
    const fWindowID = `floating-window-${id}`;
    const clarifyHTML = Ui.attachElementToFloatingWindow(fWindowID, clarifyMessage);

    Controller.create(id);
    Ui.createAndAttachTryAgainButton(id);

    const tryAgainBtn = FloatingWindow.getElement(`try-again-${id}`);
    const controller = Controller.get(id).signal;

    tryAgainBtn.addEventListener('click', tryAgainFn, { once: true, signal: controller });
  },
}

const Controller = {
  controllerMap: new Map,

  create(clickedButtonID) {
    this.controllerMap.set(clickedButtonID, new AbortController());
  },

  get(clickedButtonID) {
    return this.controllerMap.get(clickedButtonID);
  },

  abort(clickedButtonID) {
    const c = this.controllerMap.get(clickedButtonID);
    c?.abort();
    this.controllerMap.delete(clickedButtonID);
  }
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

      const data = {
        selectedText: text,
        fileName: fileName,
      }

      const prompt = await PromptHandler.buildPrompt(data);
      const aiReply = await AiResponse.generate(prompt);
      const mdAiResponse = MarkdownParser.parse(aiReply);
      const respHTML = FloatingWindowUI.createAiReplyBubble(id, mdAiResponse);

      Ui.showElement(thinkingID, false);
      Ui.attachElementToFloatingWindow(fWindowID, respHTML);

      function tryAgain() {
        Ui.removeFloatingWindowElement(`floating-window-msg-${id}`);
        Ui.removeFloatingWindowElement(`try-again-${id}`);
        Ui.showElement(thinkingID, true);

        FloatingButtonsAction.explainText(clickedButtonID, text, fileName);
      }

      Controller.create(id);
      Ui.createAndAttachTryAgainButton(id);

      const tryAgainBtn = FloatingWindow.getElement(`try-again-${id}`);
      const controller = Controller.get(id).signal;

      tryAgainBtn.addEventListener('click', tryAgain, { once: true, signal: controller });
      Ui.showElement(`try-again-${id}`, true);
    }

    catch(e) {
      Ui.showElement(thinkingID, false);
      FloatingButtons.show(id, false);
      console.error(e);
      const errHTML = FloatingWindowUI.createErrorBubble(id, e);
      Ui.attachElementToFloatingWindow(fWindowID, errHTML);
    }
  },

  async suggestEdit(clickedButtonID, text, fileName, userInstructions) {
    const id = StringUtils.getRawID(clickedButtonID);
    const floatingWindow = FloatingWindow.element(id);
    const fWindowID = floatingWindow.id;
    const thinkingID = `floating-thinking-${id}`;

    try {
      function tryAgain() {
        Ui.removeFloatingWindowElement(`floating-window-msg-${id}`);
        Ui.removeFloatingWindowElement(`try-again-${id}`);
        Ui.removeFloatingWindowElement(`no-changes-${id}`);
        Ui.removeFloatingWindowElement(`clarify-${id}`);
        Ui.showElement(thinkingID, true);

        FloatingButtonsAction.suggestEdit(clickedButtonID, text, fileName, userInstructions);
      }

      const prompt = await PromptHandler.buildPrompt({
        selectedText: text,
        fileName: fileName,
        userInstructions: userInstructions,
      }, false);

      const aiReply = await AiResponse.generate(prompt);

      if (/^\s*NO_CHANGES\s*$/i.test(aiReply)) {
        SuggestEditUI.createNoChanges(id, tryAgain);
        Ui.showElement(thinkingID, false);
        Ui.showElement(`try-again-${id}`, true);
        return;
      }

      const clarifyMatch = aiReply.match(/<CLARIFY>([\s\S]*?)<\/CLARIFY>/i);

      if (clarifyMatch) {
        SuggestEditUI.createClarifyMatch(id, clarifyMatch, tryAgain);
        Ui.showElement(thinkingID, false);
        Ui.showElement(`try-again-${id}`, true);
        return;
      }

      const diffBlocks = FileEditor.parseDiffBlocks(aiReply);

      if (diffBlocks.length === 0) {
        SuggestEditUI.createNoChanges(id, tryAgain);
        Ui.showElement(thinkingID, false);
        Ui.showElement(`try-again-${id}`, true);
        return;
      }

      const diffSummary = FileEditor.buildDiffSummary(diffBlocks);

      if (diffBlocks.length === 1) {
        diffBlocks[0].search = text;
      }

      const editorID = `editor-container-${id}`;
      const currentEditor = FileEditor.getEditorElement(editorID);
      const mdSummary = MarkdownParser.parse(diffSummary);
      const respHTML = FloatingWindowUI.createAiReplyBubble(id, mdSummary);

      FileEditor.createEditorDiffs(currentEditor, diffBlocks);
      Ui.showElement(thinkingID, false);
      Ui.attachElementToFloatingWindow(fWindowID, respHTML);

      const tryAgainBtn = FloatingWindow.getElement(`try-again-${id}`);
      const controller = Controller.get(id).signal;

      tryAgainBtn.addEventListener('click', tryAgainFn, { once: true, signal: controller });
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
      //FloatingWindowUI.createTryAgainButton(rawID),
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

  destroy(rawID) {
    Ui.removeFloatingWindowElement(`floating-window-${rawID}`);
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

  getElement(fullElementID) {
    return Ui.getFloatingWindowElement(fullElementID);
  },

  showElement(fullWindowID, state) {
    return Ui.showElement(fullWindowID, state);
  },

  clearInputField(rawID) {
    Ui.clearSuggestInputField(rawID);
  },

  async explainText(btnD, text, fileName) {
    return await FloatingButtonsAction.explainText(btnD, text, fileName);
  },

  async suggestEdit(clickedButtonID, text, fileName, userInstructions) {
    return await FloatingButtonsAction.suggestEdit(
      clickedButtonID,
      text,
      fileName,
      userInstructions
    );
  },
}

export { FloatingWindow }

