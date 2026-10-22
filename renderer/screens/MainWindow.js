import { createSidebar } from '../components/SideBar.js';
// import { createChatPanel } from '../components/ChatPanel.js';
import { ChatPanel } from '../components/ChatPanel.js';

/* No longer used
import {
  AttachSelectedFiles,
  AttachSelectedFilesClickHandler,
} from '../components/AttachSelectedFiles.js';
*/


import {
  FileTab,
  FileTabManager
} from '../components/FileTab.js';

import {
  FloatingWindow,
  FloatingWindowManager,
} from '../components/FloatingWindow.js';

import {
  FloatingButtons,
  FloatingButtonsManager,
} from '../components/FloatingButtons.js';

// ChatTabManager no longer exists
import { ChatTab } from '../components/ChatTab.js';

import {
  StringUtils,
  UuidGenerator,
  DomQuery,
  MarkdownParser,
} from '../utility/utilities.js';

const Constants = {
  explainTextPrompt(text, fileContentsSummary) {
    return `Explain the following text based on the provided file contents.
      TEXT TO EXPLAIN:
      ---
      ${text}
      ---

      REFERENCE FILE CONTENTS:
      ---
      ${fileContentsSummary}
      ---`;
  },

  suggestEditPrompt(fileName, fileContents, selectedText, userInstruction) {
    return `The user wants to modify code in a file.

    ANALYSIS STEP:
    First, evaluate whether the user's instruction is clear and actionable
    in the context of the selected code. If the instruction is:
    - Nonsensical, random, or unrelated to the code
    - Ambiguous with multiple valid interpretations

    Then output a <CLARIFY> block asking the user to clarify their intent.
    Do NOT output a SEARCH/REPLACE block if you are not confident about
    what change to make.

    If the instruction IS clear and actionable, output one or more
    SEARCH/REPLACE blocks in this exact format:

    <EXPLANATION>
    One or two sentences describing WHAT this change does and WHY it improves the code.
    </EXPLANATION>
    <SEARCH>
    exact code to find, including whitespace
    </SEARCH>
    <REPLACE>
    new code to replace it with
    </REPLACE>

    Rules:
    - The SEARCH text must match exactly what is in the file
    - Every SEARCH/REPLACE pair must be preceded by an EXPLANATION block
    - Only output the blocks, no prose outside them
    - Never write any text between </SEARCH> and <REPLACE> or between consecutive block pairs
    - If no changes are needed, say "NO_CHANGES"

      FILE:
      ---
      ${fileName}
      ---

      FULL FILE CONTENTS:
      ---
      ${fileContents}
      ---

      SELECTED CODE:
      ---
      ${selectedText}
      ---

      USER REQUEST:
      ---
      ${userInstruction}
      ---`;
  },
}

const Backend = {
  async saveData(data) {
    await window.electronAPI.writeToConfigFile(data);
  },

  async readFile(filePath) {
    return await window.electronAPI.readFile(filePath);
  },

  async searchWorkspace(searchQuery) {
    return await window.electronAPI.searchWorkspace(searchQuery);
  },

  async summarizeText(textToSum, textToInclude) {
    return window.electronAPI.summarizeText(textToSum, textToInclude);
  },

  async suggestEdit(fileName, selectedText, userInstruction, model) {
    const fileContents = await this.readFile(fileName);
    const prompt = Constants.suggestEditPrompt(
      fileName,
      selectedText,
      userInstruction,
      model,
    );

    return await this.sendOllamaChat(prompt, model);
  }
}

const fileTabManager = new FileTabManager();
const floatingWindowManager = new FloatingWindowManager();
const floatingButtonsManager = new FloatingButtonsManager();

class MainWindowUI {
  constructor() {
    this.mainWindowUI = document.getElementById('main-window-ui');
    this.tabsAndEditorParent = document.getElementById('tabs-and-editor');
    this.fileTabsContainer = document.getElementById('file-tabs');
    this.chatTabsContainer = document.getElementById('chat-tabs');

    this.chatPanel = null;
    this.currentFileTab = null;
  }

  init() {
    ChatPanel.newChatTab();
  }

  show() {
    this.mainWindowUI.style.contentVisibility = '';
    this.init();
  }

  //===> Chat tab logic <===//
  removeChatTab(id) {
    ChatPanel.closeTab(`ai-tab-${id}`);
  }

  switchToChatTab(id) {
    ChatPanel.switchToTab(id);
  }

  displayErrorMessageInFloatingWindow(id, error) {
    const rawID = StringUtils.getRawID(id);
    const thinkingDiv = this.chatPanel.getThinkingDiv(rawID);

    if (thinkingDiv)
      thinkingDiv.remove();

    const bubble = document.createElement('div');
    bubble.className = "error-msg-bubble";
    bubble.textContent = "Error: " + error;

    if (!fromFloatingWindow) {
      const chatArea = this.chatPanel.getChatHistoryContainer(rawID);
      chatArea.appendChild(bubble);
      this.scrollToBottom(rawID);
    }

    else {
      floatingWindowManager
        .get(rawID)
        .element()
        .appendChild(bubble);
    }
  }

  createLoadingDivInFloatingWindow(id, defaultText=true) {
    const rawID = StringUtils.getRawID(id);
    const floatingWindow = floatingWindowManager.get(rawID);

    const thinkingDiv = document.createElement("div");
    const thinkingMsg = document.createElement("p");
    const spinner = document.createElement("div");

    thinkingDiv.style.display = "flex";
    thinkingDiv.style.flexDirection = "row";
    thinkingDiv.id = `thinking-${rawID}`;
    thinkingMsg.className = "secondary-text";
    spinner.className = "loading";

    defaultText ?
      thinkingMsg.textContent = "Analyzing selected text..."
      : thinkingMsg.textContent = "Thinking..."

    thinkingDiv.appendChild(spinner);
    thinkingDiv.appendChild(thinkingMsg);


    floatingWindow.element().appendChild(thinkingDiv);
    return thinkingDiv;
  }

  //===> File tab logic <===//
  newFileTab(fileName) {
    const id = Utility.createRandomUUID();

    this.currentFileTab = new FileTab(
      id,
      fileName,
      floatingWindowManager,
      floatingButtonsManager,
      fileTabManager,
    );

    fileTabManager.add(
      id,
      this.currentFileTab,
      fileName,
      this.currentFileTab.editor,
      null,
      null,
    );

    this.fileTabsContainer.appendChild(this.currentFileTab.element());
    return this.currentFileTab;
  }

  removeFileTab(id) {
    const rawID = StringUtils.getRawID(id);
    fileTabManager.remove(rawID);
  }

  hideAllFileTabs() {
    this.currentFileTab.hideAllFileTabs();
  }

  switchToFileTab(id) {
    this.hideAllFileTabs();

    const targetTab = fileTabManager.get(StringUtils.getRawID(id));
    const targetEditor = targetTab.editor;

    targetTab.fileTab.show();
    //targetEditor.editor.show();

    this.currentFileTab = targetTab.fileTab;
  }
}

class EventHandler {
  constructor(ui, coordinator) {
    this.ui = ui;
    this.coordinator = coordinator;
    this.controller = new AbortController();
  }

  addListener(element, event, handler) {
    element.addEventListener(event, handler, {
      signal: this.controller.signal,
    });
  }

  init() {
    const chatTabsContainer = this.ui.chatTabsContainer;

    this.addListener(chatTabsContainer, 'click', (e) => {
      const tab = e.target.closest('.tabAI');
      const closeButton = e.target.closest('.tab-close');

      if (closeButton)
        this.coordinator.closeChatTab(StringUtils.getRawID(tab.id));

      else if (tab)
        this.coordinator.switchToChatTab(tab.id);
    });


    this.addListener(this.ui.tabsAndEditorParent, 'click', async (e) => {
      let rawID = null;
      let floatingWindow = null;
      const buttonPressed = e.target.closest('.floating-button-action');

      if (!buttonPressed)
        return;

      if (buttonPressed.id.includes('explain')) {
        try {
          rawID = StringUtils.getRawID(buttonPressed.id);
          const floatingButtons = floatingButtonsManager.get(rawID);
          const fileTab = fileTabManager.get(rawID).fileTab;

          floatingWindow = floatingWindowManager.get(rawID);
          floatingButtons.hide();
          floatingWindow.show();

          await this.coordinator.explainText(
            //this.ui.currentFileTab.editor,
            fileTab.editorElement().element().id,
            floatingButtons.getSelectedText(),
            fileTabManager.get(rawID).fileName
          );

        }
        catch(e) {
          console.error(e);
          floatingWindow.setContent(e);
        }
      }

      else if (buttonPressed.id.includes('modify')) {
        const rawID = StringUtils.getRawID(buttonPressed.id);
        const activeEditor = DomQuery.getElement(`editor-container-${rawID}`);

        const activeFloatingWindow = floatingWindowManager.get(rawID);
        let inputField = DomQuery.getElement(`suggest-input-${rawID}`);

        if (!inputField) {
          activeFloatingWindow.createSendChangeField();
          inputField = DomQuery.getElement(`suggest-input-${rawID}`);
        }

        else {
          const cont = DomQuery.getElement(`suggest-input-container-${rawID}`);
          cont.style.display = 'block';
        }

        activeFloatingWindow.show();
        floatingButtonsManager.get(rawID).hide();

        inputField.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();

            const value = inputField.value.trim();

            if (value !== '') {
              this.coordinator.suggestEdit(activeEditor.id, value);
            }
          }
        });

        const suggestionBtn = DomQuery.getElement(`send-suggestion-${rawID}`);
        suggestionBtn.addEventListener('click', () => {
          const value = inputField.value.trim();

          if (value !== '') {
            this.coordinator.suggestEdit(
              activeEditor.id,
              inputField.value.trim()
            );
          }
        });
      }
    });
  }
}

class MainWindow {
  constructor(
    backend,
    ui,
    eventHandler,
    sidebar,
    config
  ) {
    this.service = backend;
    this.ui = ui;
    this.eventHandler = eventHandler;
    this.sidebar = sidebar;
    this.config = config;

    this.boundTryAgain = this.tryAgain.bind(this);
  }

  async init() {
    this.eventHandler.init();

    /*
    if (this.config.workspacePath) {
      this.service.indexWorkspace(workspace);
    }
    */

    if (this.config.showSidebar)
      this.sidebar.show();

    else
      this.sidebar.hide();

    if (this.config.showChatPanel)
      ChatPanel.show(true);

    else
      ChatPanel.show(false);
  }

  async show() {
    await this.init();
    this.ui.show();
  }

  newChatTab() {
    ChatPanel.newChatTab();
  }

  closeChatTab(id) {
    ChatPanel.closeTab(`ai-tab-${id}`);
  }

  switchToChatTab(id) {
    ChatPanel.switchToTab(id);
  }

  switchToFileTab(id) {
    this.ui.switchToFileTab(id);
  }

  removeFileTab(id) {
    this.ui.removeFileTab(id);
  }

  displayAiResponse(message) {
    ChatPanel.displayAiResponse(message);
  }

  async explainText(id, text, fileName) {
    const fileContents = await this.service.readFile(fileName);
    const fileContensSummary = await this.service.summarizeText(fileContents, text);
    const prompt = Constants.explainTextPrompt(text, fileContents);
    const rawID = StringUtils.getRawID(id);
    const activeFloatingWindow = floatingWindowManager.get(rawID);

    if (activeFloatingWindow.contentLength() !== 0) {
      // Wipe previous response
      activeFloatingWindow.setContent('');
    }

    this.ui.createLoadingDivInFloatingWindow(id);

    try {
      const chosenModel = // this.config.selectedModel;
      // "gemma4:31b-cloud";
      "minicpm-v4.6:latest";
      // "qwen:0.5b";

      const result = await this.service.sendOllamaChat(prompt, chosenModel);

      /*
      modelFramework === 'ollama' ?
        await this.service.sendOllamaChat(prompt, chosenModel)
        : openAI implementation;
      */

      const aiResponse = result.message.content;

      activeFloatingWindow.setContent(Utility.parseMarkdown(aiResponse));
    }
    catch (e) {
      this.ui.displayErrorMessageInFloatingWindow(id, e.message)
    }
  }

  tryAgain(id) {
    floatingWindowManager
      .get(StringUtils.getRawID(id))
      .setContent('');

    const input = DomQuery.getElement(`suggest-input-${id}`);

    this.suggestEdit(id, input ? input.value.trim() : 'How to improve this?');
  }

  async suggestEdit(id, userProvidedInstructions) {
    const rawID = StringUtils.getRawID(id);
    const editorContainer = DomQuery.getElement(`editor-container-${rawID}`);
    const ftab = fileTabManager.get(rawID);
    const floatingWindow = floatingWindowManager.get(rawID);
    const selectedText = floatingButtonsManager.get(rawID).getSelectedText();
    const userInstruction = userProvidedInstructions;
    const cont = DomQuery.getElement(`suggest-input-container-${rawID}`);

    if (cont) {
      cont.remove();
    }

    floatingWindow.show();
    const thinkingDiv = this.ui.createLoadingDivInFloatingWindow(id, false);

    try {
      const chosenModel = // this.config.selectedModel;
      //'gemma4:31b-cloud';
      "minicpm-v4.6:latest";
      const aiText = await this.service.suggestEdit(
          ftab.fileName,
          selectedText,
          userInstruction,
          chosenModel
      );

      thinkingDiv.remove();
      const responseContent = aiText.message?.content;

      if (/^\s*NO_CHANGES\s*$/i.test(responseContent)) {
        floatingWindow.setContent(`
          <div class="ai-response">
            <em>
              No changes are required. The selected code looks good as-is.
            </em>
          </div>
          <br><br>`);

        floatingWindow.createTryAgainButton();
        return;
      }

      const clarifyMatch = responseContent.match(/<CLARIFY>([\s\S]*?)<\/CLARIFY>/i);

      if (clarifyMatch) {
        floatingWindow.setContent(`
          <div class="ai-response">
            <p><strong>I need clarification:</strong></p>
            <p>${Utility.parseMarkdown(clarifyMatch[1].trim())}</p>
          </div>
          <br><br>`);

        floatingWindow.createTryAgainButton();
        return;
      }

      const diffBlocks = Utility.parseDiffBlocks(responseContent);

      if (diffBlocks.length === 0) {
        console.error(responseContent);
        return;
      }

      if (diffBlocks.length === 1) {
        diffBlocks[0].search = selectedText;
      }

      Utility.renderDiffsInEditor(editorContainer, diffBlocks);
      floatingWindow.setContent(Utility.buildDiffSummary(diffBlocks));
      floatingWindow.createTryAgainButton();

      DomQuery.getElement(`try-again-${rawID}`)
        .addEventListener('click', () => {
          this.boundTryAgain(rawID);
        }, { once: true });
    }
    catch (e) {
      console.error(e);
    }
  }
}

export function createMainWindow(config) {
  const ui = new MainWindowUI();
  const eventHandler = new EventHandler(ui, null);

  const sidebar = createSidebar(fileTabManager);

  const mainWindow = new MainWindow(
    Backend,
    ui,
    eventHandler,
    sidebar,
    config
  );

  eventHandler.coordinator = mainWindow;
  sidebar.mainUI = mainWindow;

  return mainWindow;
}

