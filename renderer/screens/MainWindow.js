import { createSidebar } from '../components/SideBar.js';
import { createChatPanel } from '../components/ChatPanel.js';

import {
  AttachSelectedFiles,
  AttachSelectedFilesClickHandler,
} from '../components/AttachSelectedFiles.js';

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

import {
  ChatTab,
  ChatTabManager,
} from '../components/ChatTab.js';

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

  async sendOllamaChat(message, chosenModel) {
    return await window.electronAPI.chatOllama(message, chosenModel);
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

const Utility = {
  getRawID(id) {
    const element = id.substring(id.lastIndexOf('-') + 1);
    return !element ? id.substring(id?.id.lastIndexOf('-') + 1) : element;
  },

  createRandomUUID() {
    return crypto.randomUUID().substring(0, 8);
  },

  parseMarkdown(text) {
    if (!text)
      return '';

    // Extract code blocks first to protect them from newline replacement
    const codeBlocks = [];
    let processedText = text
      .replace(/&/g, '&amp;')
      //.replace(/</g, '&lt;')
      //.replace(/\>/g, '&gt;')
      .replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
        // Get language
        const language = lang || 'text';
        // Apply highlighting
        const highlighted = hljs.highlight(code.trim(), { language: language }).value;

        //const language = lang || 'text';
        const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
        codeBlocks.push(`
        <div>
          <pre>
            <code class="hljs language-${language}">${highlighted}</code>
          </pre>
        </div>`);

        return placeholder;
      })
      .replace(/^(?:\/\/.*)$/gm, '<span class="comment">$1</span>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/((?:^\d+\.\s+.+$\n?)+)/gm, (match) => {
        const items = match.trim().split('\n').map(line => {
          const content = line.replace(/^\d+\.\s+/, '');
          return `<li>${content}</li>`;
        }).join('');

        return `<ol>${items}</ol>`;
      })
      .replace(/((?:^[-*]\s+.+$\n?)+)/gm, (match) => {
        const items = match.trim().split('\n').map(line => {
          const content = line.replace(/^[-*]\s+/, '');
          return `<li>${content}</li>`;
        }).join('');

        return `<ul>${items}</ul>`;
      })
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');

    codeBlocks.forEach((block, index) => {
      processedText = processedText.replace(`__CODE_BLOCK_${index}__`, block);
    });

    return processedText;
  },

  parseDiffBlocks(text) {
    let match;
    //const regex = /<SEARCH>([\s\S]*?)<\/SEARCH>\s*<REPLACE>([\s\S]*?)<\/REPLACE>/g;
    const regex = /<EXPLANATION>([\s\S]*?)<\/EXPLANATION>\s*<SEARCH>([\s\S]*?)<\/SEARCH>\s*<REPLACE>([\s\S]*?)<\/REPLACE>/gs;
    const blocks = [];

    while ((match = regex.exec(text)) !== null) {
      blocks.push({
        explanation: match[1],
        search: match[2],
        replace: match[3],
        /*
        search: match[1],
        replace: match[2],
        */
      });
    }
    return blocks;
  },

  renderDiffsInEditor(editorContainer, diffBlocks) {
    const editor = monaco.editor.getEditors().find(
      e => e.getDomNode()?.parentElement?.id === editorContainer.id
    );

    const model = editor.getModel();
    const fullText = model.getValue();
    const language = model.getLanguageId();

    this._activeDiffs = this._activeDiffs || new Map();

    diffBlocks.forEach((block, i) => {
      const startOffset = fullText.indexOf(block.search);

      if (startOffset === -1) {
        console.warn(`Search text not found for diff block ${i}`);
        return;
      }

      const startPos = model.getPositionAt(startOffset);
      const endPos   = model.getPositionAt(startOffset + block.search.length);

      const decorationId = editor.deltaDecorations([], [{
        range: new monaco.Range(
          startPos.lineNumber, 1,
          endPos.lineNumber, model.getLineMaxColumn(endPos.lineNumber)
        ),
        options: {
          isWholeLine: true,
          inlineClassName: 'diff-line-deleted',
          linesDecorationsClassName: 'diff-glyph-deleted',
          stickiness: monaco
            .editor
            .TrackedRangeStickiness
            .NeverGrowsWhenTypingAtEdges
          }
      }]);

      const replaceLines = block.replace.split('\n');
      const zoneNode = document.createElement('div');

      zoneNode.className = 'diff-viewzone';
      replaceLines.forEach(line => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'diff-line-inserted';
        lineDiv.textContent = '+ ' + line;
        zoneNode.appendChild(lineDiv);
      });

      let viewZoneId;
      editor.changeViewZones(acc => {
        viewZoneId = acc.addZone({
          afterLineNumber: endPos.lineNumber,
          heightInLines: replaceLines.length + 1,
          domNode: zoneNode,
          suppressionConfig: {}
        });
      });

      const widgetId = `diff-widget-${editorContainer.id}-${i}`;
      const wdgNode = document.createElement('div');
      wdgNode.className = 'diff-actions-inline';
      wdgNode.innerHTML = `
        <button class="accept-diff">✓ Accept</button>
        <button class="reject-diff">✗ Reject</button>
      `;

      const widget = {
        getId: () => widgetId,
        getDomNode: () => wdgNode,
        getPosition: () => ({
          position: { lineNumber: endPos.lineNumber + 1, column: 1 },
          preference: [monaco.editor.ContentWidgetPositionPreference.BELOW]
        })
      };
      editor.addContentWidget(widget);

      const acceptBtn = wdgNode.querySelector('.accept-diff');
      const rejectBtn = wdgNode.querySelector('.reject-diff');

      const clear = () => {
        editor.deltaDecorations(decorationId, []);
        editor.changeViewZones(acc => acc.removeZone(viewZoneId));
        editor.removeContentWidget(widget);
      };

      acceptBtn.addEventListener('click', () => {
        model.applyEdits([{
          range: new monaco.Range(
            startPos.lineNumber, 1,
            endPos.lineNumber, model.getLineMaxColumn(endPos.lineNumber)
          ),
          text: block.replace
        }]);
        clear();
      }, { once: true });

      rejectBtn.addEventListener('click', clear, { once: true });
    });
  },

  buildDiffSummary(diffBlocks) {
    const items = diffBlocks.map((block, i) => `
    <li>
      <strong>Change ${i + 1}:</strong>
      ${block.explanation || '<em>(No explanation provided.)</em>'}
    </li>`).join('');

    return `
      <div class="ai-response">
        <p>The assistant proposed <strong>${diffBlocks.length}</strong>
        change${diffBlocks.length === 1 ? '' : 's'}. Review each one in
        the editor and use the inline <em>Accept</em> / <em>Reject</em>
        buttons to apply or discard them:</p><br>
        <ul>${items}</ul>
      </div>`;
  },

  getElement(element) {
    if (element.includes('.') || element.includes('#'))
      return document.querySelector(element)

    return document.getElementById(element);
  },
}

const PathUtils = {
  getFileName(path) {
    if (path) {
      const normalized = path.replaceAll('\\', '/').trim();
      return normalized.substring(normalized.lastIndexOf('/') + 1);
    }
    else
      return path;

    return 'Untitled';
  }
}

const DomQuery = {
  getElement(element) {
    if (element.includes('.') || element.includes('#'))
      return document.querySelector(element)

    return document.getElementById(element);
  },
}

const chatTabManager = new ChatTabManager();
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
    this.chatPanel = createChatPanel(chatTabManager);
    const rID = Utility.getRawID(this.chatPanel.ui.currentChatTab.id)
    this.chatPanel.setMainChatTabTitle('Untittled');
    this.chatPanel.init();

    const id = rID
    const elements = [
      Utility.getElement('.tabRA'),
      Utility.getElement('.floating-buttons'),
      Utility.getElement('.floating-window'),
      Utility.getElement('explain-selection'),
      Utility.getElement('modify-with-ai'),
    ];
    elements.forEach(el => {
      el.id = `${el.id}-${id}`;
    });
  }

  show() {
    this.mainWindowUI.style.contentVisibility = '';
    this.init();
  }

  //===> Chat tab logic <===//
  newChatTab() {
    this.currentChatTab = this.chatPanel.newChatTab();
  }

  removeChatTab(id) {
    this.chatPanel.removeChatTab(Utility.getRawID(id));
  }

  switchToChatTab(id) {
    this.chatPanel.switchToTab(Utility.getRawID(id));
  }

  currentChatTab() {
    return this.chatPanel.currentChatTab;
  }

  setChatTabTitle(id, title) {
    this.chatPanel.setChatTabTitle(Utility.getRawID(id), title);
  }

  clearChatBox(id) {
    this.chatPanel.clearChatBox(Utility.getRawID(id));
  }

  clearChats(id) {
    this.chatPanel.clearChats(Utility.getRawID(id));
  }

  scrollToBottom(id) {
    this.chatPanel.scrollToBottom(Utility.getRawID(id));
  }

  displayErrorMessageInFloatingWindow(id, error) {
    const rawID = Utility.getRawID(id);
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

  displayErrorMessage(id, error) {
    this.chatPanel.displayErrorMessage(id, error);
  }

  createLoadingDiv(id) {
    return this.chatPanel.createLoadingDiv(Utility.getRawID(id));
  }

  createLoadingDivInFloatingWindow(id, defaultText=true) {
    const rawID = Utility.getRawID(id);
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
    const rawID = Utility.getRawID(id);
    fileTabManager.remove(rawID);
  }

  hideAllFileTabs() {
    this.currentFileTab.hideAllFileTabs();
  }

  switchToFileTab(id) {
    this.hideAllFileTabs();

    const targetTab = fileTabManager.get(Utility.getRawID(id));
    const targetEditor = targetTab.editor;

    targetTab.fileTab.show();
    //targetEditor.editor.show();

    this.currentFileTab = targetTab.fileTab;
  }

  //////////////////////

  hideChatPanel() {
    this.chatPanel.hide();
  }

  showChatPanel() {
    this.chatPanel.show();
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
        this.coordinator.closeChatTab(Utility.getRawID(tab.id));

      else if (tab)
        this.coordinator.switchToChatTab(tab.id);
    });

    this.addListener(this.ui.fileTabsContainer, 'click', (e) => {
      let rawID = null;
      const tab = e.target.closest('.tabRA');
      const closeButton = e.target.closest('.tab-close');

      if (closeButton) {
        rawID = Utility.getRawID(tab.id);
        let fileName = fileTabManager.get(rawID).fileName;
        const element = `.file-item[data-path="${fileName}"]`;
        const sidebarItem = Utility.getElement(element);

        fileName = PathUtils.getFileName(fileName);
        sidebarItem.classList.remove('selected');

        const allOpenedFiles = Array.from(document.querySelectorAll('.checkbox-style'));

        if (allOpenedFiles) {
          if (allOpenedFiles.length > 1) {
            const attachedFile = allOpenedFiles.findLast(elem => elem.id === fileName);

            if (attachedFile)
              attachedFile.remove();
          }
          // Only one item remaining in selected list
          else {
            const attachOpenedFile = DomQuery.getElement('attach-opened-file');
            attachOpenedFile.dataset.tooltip = 'Open a file through sidebar to attach a file to chat';
            attachOpenedFile.style.cursor = 'not-allowed';
            attachOpenedFile.disabled = true;

            DomQuery.getElement('.checkbox-style').remove();
            AttachSelectedFiles.hide();
          }
        }

        this.coordinator.removeFileTab(rawID);
      }

      else if (tab) {
        rawID = Utility.getRawID(tab.id);
        this.coordinator.switchToFileTab(rawID);
      }
    });

    this.addListener(this.ui.tabsAndEditorParent, 'click', async (e) => {
      let rawID = null;
      let floatingWindow = null;
      const buttonPressed = e.target.closest('.floating-button-action');

      if (!buttonPressed)
        return;

      if (buttonPressed.id.includes('explain')) {
        try {
          rawID = Utility.getRawID(buttonPressed.id);
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
        const rawID = Utility.getRawID(buttonPressed.id);
        const activeEditor = Utility.getElement(`editor-container-${rawID}`);

        const activeFloatingWindow = floatingWindowManager.get(rawID);
        let inputField = Utility.getElement(`suggest-input-${rawID}`);

        if (!inputField) {
          activeFloatingWindow.createSendChangeField();
          inputField = Utility.getElement(`suggest-input-${rawID}`);
        }

        else {
          const cont = Utility.getElement(`suggest-input-container-${rawID}`);
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

        const suggestionBtn = Utility.getElement(`send-suggestion-${rawID}`);
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

/*
    document.addEventListener('click', (e) => {
      const target = e.target.closest('.checkbox-style');

      if (DomQuery.getElement('.checkbox-style') && !target)
        AttachSelectedFiles.hide();
    });
    */
  }
}

class MainWindow {
  constructor(
    backend,
    ui,
    eventHandler,
    chatManager,
    sidebar,
    config
  ) {
    this.service = backend;
    this.ui = ui;
    this.eventHandler = eventHandler;
    this.chatManager = chatManager;
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
  }

  async show() {
    await this.init();
    this.ui.show();
  }

  newChatTab() {
    this.ui.createNewChatTab();
  }

  closeChatTab(id) {
    this.ui.removeChatTab(id);
  }

  switchToChatTab(id) {
    this.ui.switchToChatTab(id);
  }

  currentChatTab() {
    return this.ui.chatPanel.currentChatTab;
  }

  setChatTabTitle(id, title) {
    this.ui.setChatTabTitle(id, title);
  }

  clearChatBox(id) {
    this.ui.clearChatBox(id);
  }

  clearChats(id) {
    this.ui.clearChats(id);
  }

  scrollToBottom(id) {
    this.ui.scrollToBottom(id);
  }

  switchToFileTab(id) {
    this.ui.switchToFileTab(id);
  }

  removeFileTab(id) {
    this.ui.removeFileTab(id);
  }

  async displayAiResponse(message) {
    this.ui.chatPanel.displayAiResponse(message);
  }

  async explainText(id, text, fileName) {
    const fileContents = await this.service.readFile(fileName);
    const fileContensSummary = await this.service.summarizeText(fileContents, text);
    const prompt = Constants.explainTextPrompt(text, fileContents);
    const rawID = Utility.getRawID(id);
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
      .get(Utility.getRawID(id))
      .setContent('');

    const input = Utility.getElement(`suggest-input-${id}`);

    this.suggestEdit(id, input ? input.value.trim() : 'How to improve this?');
  }

  async suggestEdit(id, userProvidedInstructions) {
    const rawID = Utility.getRawID(id);
    const editorContainer = Utility.getElement(`editor-container-${rawID}`);
    const ftab = fileTabManager.get(rawID);
    const floatingWindow = floatingWindowManager.get(rawID);
    const selectedText = floatingButtonsManager.get(rawID).getSelectedText();
    const userInstruction = userProvidedInstructions;
    const cont = Utility.getElement(`suggest-input-container-${rawID}`);

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

      Utility.getElement(`try-again-${rawID}`)
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
    chatTabManager,
    sidebar,
    config
  );

  eventHandler.coordinator = mainWindow;
  sidebar.mainUI = mainWindow;

  return mainWindow;
}

