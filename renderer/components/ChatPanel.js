import {
  StringUtils,
  UuidGenerator,
  DomQuery,
  MarkdownParser,
} from '../utility/utilities.js';

import { ChatTab } from './ChatTab.js';
import { FilePreview } from './FilePreview.js';

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

const Config = {
  async getSelectedFramework() {
    const config = await window.electronAPI.readConfigFile();
    return config.modelFramework;
  },

  async getSelectedModel() {
    const config = await window.electronAPI.readConfigFile();
    return config.selectedModel;
  },

  async saveToConfig(data) {
    await window.electronAPI.writeToConfigFile({ showChatPanel: data.showChatPanel });
  },
}

const EnvHandler = {
  /*
  async getEnvEntry(key) {
    return winow.electronAPI.readEnvKey(key)
  },
  */
}

const AiBackend = {
  async sendOllamaChat(message, chosenModel) {
    return window.electronAPI.chatOllama(message, chosenModel);
  },

  async sendOpenaiChat(message, chosenModel) {
    return window.electronAPI.chatOpenai(message, chosenModel);
  },

  async supportsVision(model) {
    return window.electronAPI.modelSupportsImages(model);
  }
}

const FileHandler = {
  async openFileChooser() {
    return window.electronAPI.openFile();
  },

  async readFile(filePath) {
    return window.electronAPI.readFile(filePath);
  },
}

const ImageHandler = {
  async cleanImage(imagePath) {
    return window.electronAPI.cleanImage(imagePath);
  },

  async isImage(filePath) {
    return window.electronAPI.isImage(filePath);
  },
}

const PanelWidth = {
  width: 440,

  get() {
    return PanelWidth.width;
  },

  set(newWidth) {
    PanelWidth.width = newWidth;
  },
}

const ChatAreaHeight = {
  height: 180,

  get() {
    return ChatAreaHeight.height;
  },

  set(newHeight) {
    ChatAreaHeight.height = newHeight;
  },
}

const Ui = {
  showPanel(state) {
    DomQuery.showElement('.ai-panel-container', state);
    DomQuery.showElement('no-ai-panel', state);
    DomQuery.showElement('show-ai-panel', state === true ? false : true);
    DomQuery.showElement('tabs-section', state);
  },

  attachPanel(panelHTML) {
    const html = DomQuery.htmlTemplateToDOM(panelHTML);
    html.firstElementChild.style.width = PanelWidth.get();

    const chatArea = html.querySelector('.chat-input');
    chatArea.style.height = ChatAreaHeight.get();

    DomQuery.appendChild('.ai-panel-container', html);
  },

  removePanel(fullTabID) {
    const id = ChatTab.getTabRawID(fullTabID);
    DomQuery.removeElement(`ai-panel-${id}`);
  },

  clearChatbox(fullTabID) {
    const id = ChatTab.getTabRawID(fullTabID);
    DomQuery.updateInputValue(`user-prompt-${id}`, '');
  },

  // Probably won't be used
  clearChats(fullTabID) {
    const id = ChatTab.getTabRawID(fullTabID);
    DomQuery.updateInnerHTML(`chat-content-${id}`, '');
  },

  scrollToBottom(fullTabID) {
    const id = ChatTab.getTabRawID(fullTabID);
    const chatArea = DomQuery.getElement(`chat-content-${id}`);

    chatArea.scrollTop = chatArea.scrollHeight;
  },

  displayThinkingDiv(fullTabID) {
    const id = ChatTab.getTabRawID(fullTabID);
    const thinkingDiv = ChatPanelUi.createThinkingDiv(id);
    const thinkingDivHTML = DomQuery.htmlTemplateToDOM(thinkingDiv);

    DomQuery.appendChild(`chat-content-${id}`, thinkingDivHTML);
    this.scrollToBottom(fullTabID);
  },

  displayUserMessage(fullTabID, message) {
    const id = ChatTab.getTabRawID(fullTabID);
    const bubble = ChatPanelUi.createUserMessageBubble(message);
    const bubbleHTML = DomQuery.htmlTemplateToDOM(bubble);

    DomQuery.removeElement(`panel-msg-${id}`);
    DomQuery.appendChild(`chat-content-${id}`, bubbleHTML);
    this.scrollToBottom(fullTabID);
  },

  displayAiResponse(fullTabID, message) {
    const id = ChatTab.getTabRawID(fullTabID);
    const bubble = ChatPanelUi.createAiResponseUI(message);
    const bubbleHTML = DomQuery.htmlTemplateToDOM(bubble);

    DomQuery.appendChild(`chat-content-${id}`, bubbleHTML);
    this.scrollToBottom(fullTabID);
  },

  displayErrorMessage(fullTabID, message) {
    const id = ChatTab.getTabRawID(fullTabID);
    const bubble = ChatPanelUi.createErrorBubble(message);
    const bubbleHTML = DomQuery.htmlTemplateToDOM(bubble);

    DomQuery.removeElement(`panel-msg-${id}`);
    DomQuery.appendChild(`chat-content-${id}`, bubbleHTML);
    this.scrollToBottom(fullTabID);
  },

  removeThinkingDiv(fullTabID) {
    const id = ChatTab.getTabRawID(fullTabID);
    return DomQuery.removeElement(`thinking-${id}`);
  },

  getUserPrompt(fullTabID) {
    const id = ChatTab.getTabRawID(fullTabID);
    return DomQuery.getElement(`user-prompt-${id}`).value.trim();
  }
}

const Controller = {
  controllerMap: new Map(),

  add(id) {
    this.controllerMap.set(id, new AbortController());
    return this.controllerMap.get(id)
  },

  get(id) {
    return this.controllerMap.get(id);
  },

  abort(id) {
    const c = this.controllerMap.get(id);
    c.abort();
    this.controllerMap.delete(id);
  },
}

const EventHandler = {
  setupShowPanelEvent(elems) {
    elems.forEach(({ id, fn }) => {
      const elem = DomQuery.getElement(id);
      elem.addEventListener('click', fn);
    });
  },

  setupInputEvent(element, fn, abortSignal) {
    const el = DomQuery.getElement(element);

    if (el) {
      el.addEventListener('keydown', fn, { signal: abortSignal });
    }
  },

  setupClickEvents(elems, abortSignal) {
    elems.forEach(({ id, fn }) => {
      const elem = DomQuery.getElement(id);

      if (elem) {
        // Check if new tab event is set
        if (elem.id === 'new-chat-tab') {
          const classes = Array.from(elem.classList);

          // Only register new-chat-tab event once
          if (!classes.includes('setup')) {
            elem.addEventListener('click', fn, { signal: abortSignal })
            DomQuery.setElementClass('new-chat-tab', 'setup');
          }
        }
        else {
          elem.addEventListener('click', fn, { signal: abortSignal });
        }
      }
    });
  },

  setupResizeHandleEvent(element, fn, abortSignal) {
    const el = DomQuery.getElement(element);

    if (el) {
      el.addEventListener('mousedown', (e) => {
        fn(e);
        // Only Attach global listeners after mousedown occurs
        window.addEventListener('mousemove', ResizeManager.resize);
        window.addEventListener('mouseup', ResizeManager.stopResize);
      }, { signal: abortSignal });
    }
  },

  setupResizeChatAreaEvent(element, fn, abortSignal) {
    const el = DomQuery.getElement(element);

    if (el) {
      el.addEventListener('mousedown', (e) => {
        fn(e);
        // Only Attach global listeners after mousedown occurs
        window.addEventListener('mousemove', ResizeManager.resizeChatArea);
        window.addEventListener('mouseup', ResizeManager.stopResizeChatArea);
      }, { signal: abortSignal });
    }
  },

  setupFilePreview(rawID, element, abortSignal) {
    const el = DomQuery.getElement(element);

    el.addEventListener('click', async () => {
      const selected = await FileHandler.openFileChooser();
      let fileArray;

      if (Array.isArray(selected)) {
        const fnames = selected.map(f => StringUtils.getFileName(f));
        const paths = selected.map(f => f.replace(StringUtils.getFileName(f), ''));

        fileArray = selected.map(f => {
          return {
            fileName: StringUtils.getFileName(f),
            filePath: f.replace(StringUtils.getFileName(f), ''),
            count: selected.length,
          };
        });
      }

      else {
        const fname = StringUtils.getFileName(selected);
        const path = selected.replace(fname, '');

        fileArray = [{
          fileName: fname ,
          filePath: path,
          count: 1,
        }]
      }

      FilePreview.init(rawID, fileArray);
    }, { signal: abortSignal });
  },
}

const ChatsHandler = {
  getChatsForTab(fullTabID) {
    ChatTab.getTabChats(fullTabID);
  },

  addChatForTab(fullTabID, chats) {
    ChatTab.addTabToHistory(fullTabID, chats);
  },
}

const TabHandler = {
  showTabContents(fullTabID, shouldShow) {
    const id = ChatTab.getTabRawID(fullTabID);
    DomQuery.showElement(`ai-panel-${id}`, shouldShow);
  },

  createNewTab() {
    ChatTab.create();

    if (ChatTab.getTabCount() > 1) {
      const newTabID = ChatTab.getActiveTabRawID();
      ChatTab.switchChatTabs(`ai-tab-${newTabID}`);
    }
  },

  setTabTitle(fullTabID, newTitle) {
    ChatTab.updateTabTitle(fullTabID, newTitle);
  },

  getActiveTab() {
    return ChatTab.getActiveTab();
  },

  getActiveTabRawID() {
    return ChatTab.getActiveTabRawID();
  },

  getTabRawID(fullTabID) {
    return ChatTab.getTabRawID(fullTabID);
  },
}

const ResizeManager = {
  startMouseX : 0,
  startWidth : 0,
  startMouseYChat : 0,
  startHeightChat : 0,

  startResize(e) {
    const currentPanel = `ai-panel-${TabHandler.getActiveTabRawID()}`;
    const box = DomQuery.getElement(currentPanel);
    ResizeManager.startMouseX = e.clientX;
    ResizeManager.startWidth = box.offsetWidth;
  },

  resize(e) {
    const currentPanel = `ai-panel-${TabHandler.getActiveTabRawID()}`;
    const box = DomQuery.getElement(currentPanel);
    const minWidth = 440;
    const maxWidth = window.innerWidth * 0.875;

    const deltaX = e.clientX - ResizeManager.startMouseX;
    let newWidth = ResizeManager.startWidth - deltaX;

    newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
    box.style.width = newWidth + 'px';

    // Set width for all panels
    const allPanels = document.querySelectorAll('.ai-panel');
    Array.from(allPanels).forEach(p => {
      p.style.width = box.style.width;
    });

    PanelWidth.set(box.style.width);

    const showPanelBtn = DomQuery.getElement('show-panel');

    if (showPanelBtn) {
      showPanelBtn.style.right = '13px';
      DomQuery.getElement('no-ai-panel').style.right = newWidth + 'px';
    }
  },

  stopResize() {
    window.removeEventListener('mousemove', ResizeManager.resize);
    window.removeEventListener('mouseup', ResizeManager.stopResize);
  },

  startResizeChatArea(e) {
    const currentPanel = `user-prompt-${TabHandler.getActiveTabRawID()}`;
    const box = DomQuery.getElement(currentPanel);
    ResizeManager.startMouseYChat = e.clientY;
    ResizeManager.startHeightChat = box.offsetHeight;
  },

  resizeChatArea(e) {
    const currentPanel = `user-prompt-${TabHandler.getActiveTabRawID()}`;
    const box = DomQuery.getElement(currentPanel);
    const minHeight = 70;
    const maxHeight = window.innerHeight * 0.7;
    const deltaY = e.clientY - ResizeManager.startMouseYChat;
    let newHeight = ResizeManager.startHeightChat - deltaY;

    newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
    box.style.height = newHeight + 'px';

    const allChatArea = document.querySelectorAll('.chat-input');
    Array.from(allChatArea).forEach(ca => {
      ca.style.height = box.style.height;
    });

    ChatAreaHeight.set(box.style.height);
  },

  stopResizeChatArea() {
    window.removeEventListener('mousemove', ResizeManager.resizeChatArea);
    window.removeEventListener('mouseup', ResizeManager.stopResizeChatArea);
  },
}

const EventSetup = {
  init(rawID, chatPanel) {
    const id = rawID;
    const controller = Controller.add(id);

    EventHandler.setupFilePreview(
      id,
      `attach-file-${id}`,
      controller.signal,
    );

    EventHandler.setupShowPanelEvent([
      { id: 'show-ai-panel', fn: () => chatPanel.show(true) },
      { id: 'no-ai-panel', fn: () => chatPanel.show(false) },
    ]);

    EventHandler.setupClickEvents([
      { id: 'new-chat-tab', fn: () => chatPanel.newChatTab() },
      { id: `send-chat-${id}`, fn: () => {
        const inputData = Ui.getUserPrompt(`user-prompt-${id}`);
        chatPanel.displayAiResponse(inputData);
      }},
      { id: `show-ai-panel-${id}`, fn: () => chatPanel.show(true) },
      { id: `no-ai-panel-${id}`, fn: () => chatPanel.show(false) },
      controller.signal
    ]);

    EventHandler.setupInputEvent(
      `user-prompt-${id}`,
      (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const inputData = Ui.getUserPrompt(`user-prompt-${id}`);
          chatPanel.displayAiResponse(inputData);
        }
      },
      controller.signal
    );

    EventHandler.setupResizeHandleEvent(
      `handle-${id}`,
      (e) => {
        e.preventDefault();
        ResizeManager.startResize(e);
      },
      controller.signal
    );

    EventHandler.setupResizeChatAreaEvent(
      `handle-chat-${id}`,
      (e) => {
        e.preventDefault();
        ResizeManager.startResizeChatArea(e);
      },
      controller.signal
    );
  },
}

const AttachedFiles = {
  attached: {
    fileName: [],
    fileType: [],
    fileContents: [],
  },

  clear() {
    this.attached = {
      fileName: [],
      fileType: [],
      fileContents: [],
    }
  },
}

const AttachedFilesHandler = {
  loadAttachedFiles(id) {
    const container = DomQuery.getElement(`chat-file-container-${id}`);
    const allAttachedFiles = container.querySelectorAll('.chat-file-item');

    if (allAttachedFiles) {
      Array.from(allAttachedFiles).forEach(ftab => {
        const ftabID = ftab.id;
        const fileData = FilePreview.getAttachedFileData(ftabID);

        AttachedFiles.attached.fileName.push(fileData.fileName);
        AttachedFiles.attached.fileType.push(fileData.fileType);
        AttachedFiles.attached.fileContents.push(fileData.fileContents);
      });
    }
  },

  handleAttachedFiles(id) {
    AttachedFilesHandler.loadAttachedFiles(id);

    const attachedFileNames = [];
    const attachedFiles = [];
    const attachedImages = [];
    const arrayLength = AttachedFiles.attached.fileType.length;

    if (arrayLength > 0) {
      for (let i = 0; i < arrayLength; i++) {
        const fname = AttachedFiles.attached.fileName[i];
        attachedFileNames.push(fname);

        const ftype = AttachedFiles.attached.fileType[i];

        if (ftype === 'file') {
          const fcontents = AttachedFiles.attached.fileContents[i];
          attachedFiles.push(fcontents);
        }

        else {
          const fcontents = AttachedFiles.attached.fileContents[i];
          attachedImages.push(fcontents);
        }
      }

      return {
        fileNames: attachedFileNames,
        files: attachedFiles,
        images: attachedImages
      };
    }

    else return null;
  },
}

const BlobHandler = {
  convertToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },
}

const AiResponse = {
  // Ollama expects a string
  normalize(data) {
    const textParts = data.content
      .filter(p => p.type === 'text')
      .map(p => p.text)
      .join('\n');

    const images = data.content
      .filter(p => p.type === 'image_url')
      .map(p => {
        const url = p.image_url.url;
        return url.startsWith('data:') ? url.split(',')[1] : url;
      });

    return {
      ...data,
      content: textParts,
      ...(images.length ? { images } : {})
    }
  },

  async buildContextString(selectedModel, supportsVision, attachedFiles) {
    let contextString = '\n\nAttached Files Context:\n\n';
    const imagePayloads = [];
    const errMsg = `${selectedModel} does not support images.
    Please remove attached images, and try again, or select a different model`;

    const totalFiles = attachedFiles.files.length;
    const totalImages = attachedFiles.images.length;

    try {
      if (totalFiles > 0) {
        contextString = '\n\nAttached Files Context:\n\n';

        for (let i = 0; i < totalFiles; i++) {
          const fileContent = attachedFiles.files[i];
          const fileName = attachedFiles.fileNames[i];
          contextString += `File name:${fileName}, file contents: ${fileContent}\n\n`;
        }
      }

      if (totalImages > 0) {
        if (!supportsVision) {
          throw errMsg;
        }

        for (let i = 0; i < totalImages; i++) {
          const imageBlob = attachedFiles.images[i];
          const fileName = attachedFiles.fileNames[i];
          const base64Image = await BlobHandler.convertToBase64(imageBlob);

          imagePayloads.push({
            fileName: fileName,
            imageBlob: base64Image
          });
        }
      }

      if (totalImages > 0 || totalFiles > 0) {
        FilePreview.destroy(TabHandler.getActiveTab());
        AttachedFiles.clear();
      }

      return { contextString: contextString, imagePayloads: imagePayloads }
    }
    catch(e) {
      throw e;
    }
  },

  async generate(prevChats, message, attachedFiles=null) {
    let history = [];

    for (let i = 0; i < prevChats.user.length; i++) {
      history.push({
        role: 'user',
        content: prevChats.user[i]
      });

      history.push({
        role: 'assistant',
        content: prevChats.system[i]
      });
    }

    const selectedModel = await Config.getSelectedModel();
    const selectedFramework = await Config.getSelectedFramework();

    if (attachedFiles) {
      try {
        let supportsVision;
        let fullTextMessage;

        if (selectedFramework === 'ollama')
          supportsVision = await AiBackend.supportsVision(selectedModel);

        const context = await AiResponse.buildContextString(
          selectedModel,
          supportsVision,
          attachedFiles
        );

        const contextString = context.contextString;
        const imagePayloads = context.imagePayloads;

        fullTextMessage = message + contextString;

        let finalUserContent = fullTextMessage;

        if (imagePayloads.length > 0) {
          finalUserContent = [
            { type: 'text', text: fullTextMessage },
            ...imagePayloads.map(img => ({
              type: 'image_url',
              image_url: { url: img.imageBlob }
            }))
          ];
        }

        if (selectedFramework === 'ollama') {
          if (Array.isArray(finalUserContent)) {
            finalUserContent = AiResponse.normalize({
              role: 'user',
              content: finalUserContent
            });
          }

          else finalUserContent = {
            role: 'user',
            content: finalUserContent
          };
        }

        const messages = [
          ...history.slice(0, -1),
          selectedFramework === 'ollama'
            ? finalUserContent
            : { role: 'user', content: finalUserContent }
        ];

        prevChats.user.push(fullTextMessage);

        return selectedFramework === 'ollama'
          ? AiBackend.sendOllamaChat(messages, selectedModel)
          : AiBackend.sendOpenaiChat(messages, selectedModel);
      }

      catch(e) {
        throw e;
      }
    }

    else {
      prevChats.user.push(message);

      const messages = [
        ...history.slice(0, -1),
        { role: 'user', content: message }
      ];

      return selectedFramework === 'ollama'
        ? AiBackend.sendOllamaChat(messages, selectedModel)
        : AiBackend.sendOpenaiChat(messages, selectedModel);
    }
  },
}

const ChatPanel = {
  async show(shouldShow) {
    Ui.showPanel(shouldShow);
    await Config.saveToConfig({ showChatPanel: shouldShow });
  },

  createEvents(rawID) {
    EventSetup.init(rawID, this);
  },


  newChatTab() {
    const tabCount = ChatTab.getTabCount();

    if (tabCount !== 0) {
      const oldID = TabHandler.getActiveTabRawID();
      DomQuery.showElement(`ai-panel-${oldID}`, false);
    }

    ChatTab.create();
    const id = TabHandler.getActiveTabRawID();
    const newPanel = ChatPanelUi.create(id);

    Ui.attachPanel(newPanel);
    this.createEvents(id);
  },


  switchToTab(fullTabID) {
    const oldID = ChatTab.getActiveTabRawID();
    DomQuery.showElement(`ai-panel-${oldID}`, false);

    const newID = ChatTab.getTabRawID(fullTabID);
    DomQuery.showElement(`ai-panel-${newID}`, true);

    ChatTab.switchChatTabs(oldID, newID);
  },

  clearChats(fullTabID) {
    Ui.clearChats(fullTabID);
  },

  closeTab(fullTabID) {
    const tabCount = ChatTab.getTabCount();

    if (tabCount === 1) {
      const firstTab = ChatTab.getFirstTab();
      const firstTabID = ChatTab.getTabRawID(firstTab);

      ChatsHandler.addChatForTab(firstTabID, {
        title: 'Untitled',
        user: [],
        system: []
      });

      Ui.clearChatbox(firstTabID);
      Ui.clearChats(firstTabID);
      TabHandler.setTabTitle(firstTabID, 'Untitled');
    }

    const tabToRemoveRawID = ChatTab.getTabRawID(fullTabID);

    if (tabCount > 1) {
      if (ChatTab.getFirstTab() !== fullTabID) {
        const prev = ChatTab.getPreviousTabFrom(fullTabID);
        const prevRawID = ChatTab.getTabRawID(prev);

        if (ChatTab.getActiveTab() === fullTabID) {
          ChatTab.switchChatTabs(tabToRemoveRawID, prevRawID);
        }

        DomQuery.showElement(`ai-panel-${prevRawID}`, true);
      }

      else {
        const next = ChatTab.getNextTabFrom(fullTabID);
        const nextRawID = ChatTab.getTabRawID(next);

        if (ChatTab.getActiveTab() === fullTabID) {
          ChatTab.switchChatTabs(tabToRemoveRawID, nextRawID);
        }

        DomQuery.showElement(`ai-panel-${nextRawID}`, true);
      }

      Ui.removePanel(fullTabID);
      Controller.abort(tabToRemoveRawID);
      ChatTab.remove(fullTabID);
    }
  },

  displayAiResponse(message) {
    if (!message || message.length === 0)
      return;

    const id = TabHandler.getActiveTab();
    const chats = ChatTab.getTabChats(id);
    const title = message.substring(0, 12);
    const rawID = ChatTab.getTabRawID(id);
    const attachedFiles = AttachedFilesHandler.handleAttachedFiles(rawID);

    Ui.clearChatbox(id);
    Ui.displayUserMessage(id, message);
    Ui.displayThinkingDiv(id);
    TabHandler.setTabTitle(id, title);

    AiResponse.generate(chats, message, attachedFiles).then(aiReply => {
      Ui.removeThinkingDiv(id);

      const aiMsg = aiReply.message.content;
      Ui.displayAiResponse(id, aiMsg);
      chats.system.push(aiMsg);

      ChatsHandler.addChatForTab(id, {
        title: title,
        user: chats.user,
        system: chats.system
      });
    })
    .catch(e => {
      console.error(e);
      Ui.removeThinkingDiv(id);
      Ui.displayErrorMessage(id, e);
    });
  },
}

export { ChatPanel };

