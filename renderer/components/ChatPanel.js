import { ChatTab } from './ChatTab.js';
import { AttachSelectedFiles } from '../components/AttachSelectedFiles.js';

const Constants = {
  searchMessage(contextString, message) {
    return `${contextString}\n\n` +
      `Question: ${message}\n\n` +
      `Answer using the Context above when relevant.`;
  },
}

const Backend = {
  async sendOllamaChat(message, chosenModel) {
    return await window.electronAPI.chatOllama(message, chosenModel);
  },

  async searchWorkspace(searchQuery) {
    return await window.electronAPI.searchWorkspace(searchQuery);
  },

  async addFile() {
    return await window.electronAPI.openFile();
  },

  async readFile(filePath) {
    return await window.electronAPI.readFile(filePath);
  },

  async cleanImage(imagePath) {
    return await window.electronAPI.cleanImage(imagePath);
  },

  async isImage(filePath) {
    return await window.electronAPI.isImage(filePath);
  },

  async getAiResponse(id, tabManager, prevChats, message) {
    let contextString = null;
    let fetchedData = null;
    const selectedFiles = Array.from(document.querySelectorAll('.checkbox-style'));
    const res = await Backend.searchWorkspace(message);


    if (res && Array.isArray(res) && res.length > 0) {
      contextString = "\n\nRelevant Project Context:\n" + res.join("\n\n");
    }

    if (selectedFiles && selectedFiles.length !== 0) {
      if (contextString.includes('Relevant Project Context'))
        contextString += "\n\n";

      else
        contextString = '\n\nRelevant Project Context:\n';

      for (const checkbox of selectedFiles) {
        const fname = checkbox.id;
        const fileContent = await Backend.readFile(fname);

        contextString += `${fileContent}\n\n`;
      }
    }

    try {
      if (!message || message.length === 0)
        return;

      const chosenModel =
      // 'gemma4:31b-cloud';
      'qwen:0.5b';
      //"minicpm-v4.6:latest";

      const title = message.substring(0, 8);
      const history = [];

      for (let i = 0; i < prevChats.user.length; i++) {
        history.push({
          role: 'user',
          content: prevChats.user[i]
        });

        if (prevChats.system[i]) {
          history.push({
            role: 'assistant',
            content: prevChats.system[i]
          });
        }
      }

      history.push({ role: 'user', content: message });

      const msgWithSearch = await Constants.searchMessage(contextString, message);
      const isSearchEmpty = res.length === 0;

      const messages = [
        ...history.slice(0, -1),
        { role: 'user', content: isSearchEmpty ? message : msgWithSearch }
      ];

      fetchedData = await Backend.sendOllamaChat(messages, chosenModel);

      const response = fetchedData.message.content;
      history.push({ role: 'assistant', content: response });

      console.log(history);

      tabManager.replace(id, {
        title: title,
        chatTab: prevChats.chatTab,
        user: history.filter(x => x.role === 'user').map(x => x.content),
        system: history.filter(x => x.role === 'assistant').map(x => x.content),
      });

      return response;
    }
    catch(e) {
      throw e;
    }
  },
}

const Utility = {
  getRawID(id) {
    const element = id.substring(id.lastIndexOf('-') + 1);
    return !element ? id.substring(id?.id.lastIndexOf('-') + 1) : element;
  },

  createRandomUUID() {
    return crypto.randomUUID().substring(0, 8);
  },
}

const DomQuery = {
  getElement(element) {
    if (element.includes('.') || element.includes('#'))
      return document.querySelector(element)

    return document.getElementById(element);
  },

  removeElements(elements) {
    elements.forEach(elem => DomQuery.getElement(elem)?.remove());
  },

  createDiv() {
    return document.createElement('div');
  },

  createButton() {
    return document.createElement('button');
  },

  createSpan() {
    return document.createElement('span');
  },
}

const MarkdownParser = {
  parseMarkdown(text) {
    if (!text)
      return '';

    // Extract code blocks first to protect them from newline replacement
    const codeBlocks = [];
    let processedText = text
      .replace(/&/g, '&amp;')
      .replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
        // Get language
        const language = lang || 'text';
        // Apply highlighting
        const highlighted = hljs.highlight(code.trim(), { language: language }).value;

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
  },

  getExt(filePath) {
    const extension = filePath.split('.').pop().toLowerCase();
    const extToLang = {
      js: 'javascript', ts: 'typescript', jsx: 'javascript',
      tsx: 'typescript', py: 'python', java: 'java',
      c: 'c', cpp: 'cpp', cs: 'csharp',
      html: 'xml', css: 'css', json: 'json',
      md: 'markdown',xml: 'xml', yml: 'yaml',
      yaml: 'yaml', sh: 'bash', sql: 'sql',
      php: 'php', rb: 'ruby', go: 'go',
      rs: 'rust', kt: 'kotlin', swift: 'swift',
      scala: 'scala', r: 'r', lua: 'lua',
    };

    const language = extToLang[extension] || extension || 'plaintext';
    return language;
  }
}

class ResizeManager {
  constructor(ui) {
    this.startMouseX = 0;
    this.startWidth = 0;
    this.startMouseYChat = 0;
    this.startHeightChat = 0;

    this.ui = ui;
    this.boundResize = this.resize.bind(this);
    this.boundStopResize = this.stopResize.bind(this);
    this.boundResizeChatArea = this.resizeChatArea.bind(this);
    this.boundStopResizeChatArea = this.stopResizeChatArea.bind(this);
  }

   startResize(e) {
    this.startMouseX = e.clientX;
    this.startWidth = this.ui.aiPanel.offsetWidth;
  }

  resize(e) {
    const box = this.ui.aiPanel;
    const minWidth = 280;
    const maxWidth = window.innerWidth * 0.875;

    // Calculate how much the mouse has moved since the click
    const deltaX = e.clientX - this.startMouseX;
    let newWidth = this.startWidth - deltaX;

    // Clamp the value
    newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

    box.style.width = newWidth + 'px';

    const showPanelBtn = DomQuery.getElement('show-panel');

    if (showPanelBtn) {
      showPanelBtn.style.right = '13px';
      DomQuery.getElement('no-ai-panel').style.right = newWidth + 'px';
    }
  }

  stopResize() {
    window.removeEventListener('mousemove', this.boundResize);
    window.removeEventListener('mouseup', this.boundStopResize);
  }

  startResizeChatArea(e) {
    this.startMouseYChat = e.clientY;
    this.startHeightChat = this.ui.chatContainer.offsetHeight;
  }

  resizeChatArea(e) {
    const box = this.ui.chatContainer;
    const minHeight = 200;
    const maxHeight = window.innerHeight * 0.6;
    const deltaY = e.clientY - this.startMouseYChat;
    const newHeight = this.startHeightChat - deltaY;

    box.style.height = Math.max(minHeight, Math.min(newHeight, maxHeight)) + 'px';
  }

  stopResizeChatArea() {
    window.removeEventListener('mousemove', this.boundResizeChatArea);
    window.removeEventListener('mouseup', this.boundStopResizeChatArea);
  }
}

class fileDisplay {
  static _activeElement = null;

  constructor(fileName, fileType) {
    this.file = fileName;
    this.fileType = fileType;
    this.fileModal = DomQuery.getElement('display-selected-files');
    this.fileModalContent = DomQuery.getElement('expand-uploaded-contents');

    this._isHovered = false;

    this._initModalEvents();
  }

  _initModalEvents() {
    this.fileModal.addEventListener('mouseenter', () => {
      this._isHovered = true;
    });

    this.fileModal.addEventListener('mouseleave', () => {
      this._isHovered = false;
      this.hide();
    });
  }

  async _init() {
    this.fileModalContent.innerHTML = '';
    const fileType = this.fileType;

    if (fileType === 'file') {
      let highlighted = null;
      const fileContents = await Backend.readFile(this.file);
      const language = PathUtils.getExt(this.file);

      try {
        highlighted = hljs.highlight(fileContents, { language, ignoreIllegals: true }).value;
      }
      catch (e) {
        highlighted = fileContents
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }

      const fileElement = document.createElement('div');
      fileElement.id = 'expanded-file-contents';
      fileElement.style.height = '512px';
      fileElement.style.width = '1024px';
      fileElement.style.padding = '0.5rem';
      fileElement.style.background = 'transparent';
      fileElement.style.pointerEvents = 'auto'; // allow scrolling file contents
      fileElement.style.overflowY = 'auto';
      fileElement.style.whiteSpace = 'pre';
      fileElement.style.userSelect = 'text';
      fileElement.innerHTML = `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;

      this.fileModalContent.append(fileElement);
      fileDisplay._activeElement = this;
    }

    if (fileType !== 'file') {
      const img = await Backend.cleanImage(this.file);
      const blob = new Blob([new Uint8Array(img)], { type: `image/${fileType}`});

      const imageElement = document.createElement('img');
      imageElement.id = 'expanded-file-contents';
      imageElement.style.height = '512px';
      imageElement.style.width = '512px';
      imageElement.style.background = 'transparent';
      imageElement.style.imageRendering = 'crisp-edges';
      imageElement.style.pointerEvents = 'none';
      imageElement.setAttribute("src", URL.createObjectURL(blob));
      imageElement.onload = () => URL.revokeObjectURL(imageElement.src);

      this.fileModalContent.append(imageElement);
    }
  }

  async show() {
    if (fileDisplay._activeInstance) {
      fileDisplay._activeInstance.hide();
    }

    await this._init();

    this.fileModal.style.display = 'flex';
    this.fileModal.style.contentVisibility = '';
    this.fileModal.style.opacity = 1;
    this.fileModal.style.visibility = "visible";

    fileDisplay._activeInstance = this;
    return this;
  }

  hide() {
    this.fileModal.style.display = 'none';
    this.fileModal.style.contentVisibility = 'hidden';
    this.fileModal.style.opacity = 0;
    this.fileModal.style.visibility = "hidden";

    if (fileDisplay._activeInstance === this) {
      fileDisplay._activeInstance = null;
      return;
    }

    fileDisplay._activeInstance = null;
  }
}


class ChatPanelUI {
  constructor(chatTabManager) {
    this.panelContainer = document.querySelector('.ai-panel-container');
    this.hidePanelButton = document.getElementById('no-ai-panel');
    this.showPanelButton = document.getElementById('show-ai-panel');
    this.chatContainer = document.getElementById("chat-input-area");

    this.chatButtons = document.querySelector(".chat-action-container");
    this.userPrompt = document.getElementById("user-prompt");
    this.chatButton = document.getElementById("send-chat");
    this.chatArea = document.getElementById("chat-content");
    this.aiPanel = document.getElementById("ai-panel");
    this.chatTabsContainer = document.getElementById("chat-input-area");
    this.panelMsg = document.getElementById('panel-msg');
    this.chatTabs = document.getElementById('chat-tabs');
    this.newTabButton = document.getElementById("new-chat-tab");

    this.resizeHandle = document.getElementById("handle");
    this.resizeHandleChat = document.getElementById("handle-chat");

    this.chatTabManager = chatTabManager;
    this.defaultChatTab = this._createDefaultChatTab();
    this.currentChatTab = this.defaultChatTab;
  }

  _createDefaultChatTab() {
    const id = Utility.createRandomUUID();
    const newTab = new ChatTab(id);

    this.chatTabManager.create(id, newTab);
    this.currentChatTab = newTab;

    newTab.element().id = `ai-tab-${id}`;
    newTab.element().classList.add('tabAI')
    newTab.element().classList.add('active');

    this.chatTabs.appendChild(newTab.element());
    this.chatTabs.appendChild(this.newTabButton);

    return newTab;
  }

  _createUserMessageBubble(message) {
    const bubble = DomQuery.createDiv();
    bubble.className = "user-msg-bubble";
    bubble.innerHTML = MarkdownParser.parseMarkdown(message);

    return bubble;
  }

  _createErrorBubble(errorMessage) {
    const bubble = document.createElement('div');
    bubble.className = "error-msg-bubble";
    bubble.textContent = errorMessage

    return bubble;
  }

  _createAiResponseUI(text) {
    const parsedText = MarkdownParser.parseMarkdown(text);

    const aiResponseDiv = document.createElement('div');
    aiResponseDiv.className = 'ai-response';
    aiResponseDiv.innerHTML = `${parsedText}<br><br>`;

    return aiResponseDiv.innerHTML;
  }

  _resetMainChatTabTitle() {
    this.defaultChatTab.updateTabTitle('Untitled');
  }

  getChatBox(rawID) {
    const chatBox = DomQuery.getElement(`user-prompt-${rawID}`);
    return chatBox;
  }

  getChatHistoryContainer(rawID) {
    const chats = DomQuery.getElement(`chat-content-${rawID}`);
    return chats;
  }

  getThinkingDiv(rawID) {
    const thinkingDiv = DomQuery.getElement(`thinking-${rawID}`);
    return thinkingDiv;
  }

  removeActiveState() {
    this.currentChatTab.element().classList.remove('active');
  }

  addActiveState() {
    this.currentChatTab.element().classList.add('active');
  }

  newChatTab() {
    try {
      const id = Utility.createRandomUUID();
      const newTab = new ChatTab(id).create();

      this.chatTabManager.create(id, newTab);

      this.removeActiveState();
      this.currentChatTab = newTab;
      this.addActiveState();

      console.log(newTab.element().id);

      const clonedDOM = this.aiPanel.cloneNode(true);
      clonedDOM.querySelectorAll('[id]').forEach(el => {
        const base = el.id.replace(/-[^-]+$/, '');
        el.id = `${base}-${id}`;
      });
      console.log(clonedDOM.children);
      clonedDOM.id = `ai-panel-${id}`;

      this.chatTabs.appendChild(newTab.element());
      this.chatTabs.appendChild(this.newTabButton);
      this.panelContainer.appendChild(clonedDOM);
      return newTab;
    }
    catch(e) {
      console.error(e);
      throw e;
    }
  }

  displayUserMessage(rawID, message) {
    try {
      const bubble = this._createUserMessageBubble(message);
      const chatArea = this.getChatHistoryContainer(rawID);

      this.panelMsg.remove();

      if (chatArea)
        chatArea.appendChild(bubble);

      else
        this.chatArea.appendChild(bubble);

      this.scrollToBottom(rawID);
    }
    catch(e) {
      console.error(e.message);
      throw e;
    }
  }

  removeChatTab(rawID) {
    const id = rawID;
    const thinkingDiv = this.getThinkingDiv(id);

    if (thinkingDiv)
      thinkingDiv.remove();

    this.clearChats(id);
    this.clearChatBox(id);

    // Get all chat tabs
    const count = this.chatTabManager.getAllChats().size;

    if (count === 1) {
      this._resetMainChatTabTitle();
      return;
    }

    else {
      let previousChat = this.chatTabManager.getPreviousChat(id);

      if (previousChat) {
        const prevID = previousChat.chatTab.element().id;

        this.currentChatTab = previousChat.chatTab;
        this.currentChatTab.element().classList.add('active');

        for (let i = 0; i < previousChat.user.length; i++) {
          this.displayUserMessage(prevID, previousChat.user[i]);
          this.displayAiResponse(prevID, previousChat.system[i], null);
        }
      }

      else {
        const prevID = Utility.getRawID(this.currentChatTab.id);
        previousChats = this.chatTabManager.get(prevID);

        for (let i = 0; i < previousChat.user.length; i++) {
          this.displayUserMessage(prevID, previousChat.user[i]);
          this.displayAiResponse(prevID, previousChat.system[i], null);
        }
      }

      this.chatTabManager.get(id).chatTab.remove();
      this.chatTabManager.remove(id);
    }
  }

  setMainChatTabTitle(title) {
    this.defaultChatTab.updateTabTitle(title);
  }

  setChatTabTitle(rawID, title) {
    const tab = this.chatTabManager.get(rawID);
    const bckup = tab;

    tab.chatTab.updateTabTitle(title);

    this.chatTabManager.replace(rawID, {
      title: title,
      chatTab: bckup.chatTab,
      user: bckup.user,
      system: bckup.system
    });
  }

  switchToTab(rawID) {
    this.clearChats(rawID);

    document.querySelectorAll('.tabAI.active').forEach(el => {
      el.classList.remove('active')
    });

    this.currentChatTab = this.chatTabManager.get(rawID).chatTab;
    this.currentChatTab.element().classList.add('active');

    const prevChats = this.chatTabManager.get(rawID);
    console.log(`chats for tab ID ${rawID}:`, prevChats);

  }

  hide() {
    this.panelContainer.style.display = 'none';
    this.panelContainer.style.width = '0';
    this.showPanelButton.style.display = 'block';
    this.hidePanelButton.style.display = 'none';
  }

  show() {
    this.panelContainer.style.display = 'block';
    this.panelContainer.style.width = '';
    this.showPanelButton.style.display = 'none';
    this.hidePanelButton.style.display = 'block';
  }

  clearChatBox(rawID) {
    try {
      const chatBox = this.getChatBox(rawID);

      if (!chatBox)
        this.userPrompt.value = null;

      else
        chatBox.value = null;
    }
    catch(e) {
      console.error(e);
      throw e;
    }
  }

  clearChats(rawID) {
    try {
      const chats = this.getChatHistoryContainer(rawID);

      if (chats)
        chats.innerHTML = '';

      else
        this.chatArea.innerHTML = '';
    }
    catch(e) {
      console.error(e);
    }
  }

  displayErrorMessage(rawID, error) {
    const thinkingDiv = DomQuery.getElement(`thinking-${rawID}`);

    if (thinkingDiv)
      thinkingDiv.remove();

    const bubble = this._createErrorBubble(error);
    const chatArea = this.getChatHistoryContainer(rawID);

    if (!chatArea) {
      this.chatArea.appendChild(bubble);
      this.scrollToBottom(this.chatArea.id);
    }

    else {
      chatArea.appendChild(bubble);
      this.scrollToBottom(chatArea.id);
    }
  }

  displayAiResponse(rawID, assistantResponse, thinkingDiv) {
    try {
      if (thinkingDiv)
        thinkingDiv.remove();

      const chatArea = this.getChatHistoryContainer(rawID);
      const aiResponse = this._createAiResponseUI(assistantResponse);

      if (!chatArea)
        this.chatArea.innerHTML += aiResponse;

      else
        chatArea.innerHTML += aiResponse;

      this.scrollToBottom(rawID);
    }
    catch(e) {
      throw new Error(e.message);
      //this.displayErrorMessage(rawID, e);
    }
  }

  createLoadingDiv(rawID) {
    try {
      const thinkingDiv = document.createElement("div");
      const thinkingMsg = document.createElement("p");
      const spinner = document.createElement("div");

      thinkingDiv.style.display = "flex";
      thinkingDiv.style.flexDirection = "row";
      thinkingDiv.id = `thinking-${rawID}`;

      spinner.className = "mini-spinner";

      thinkingMsg.className = "secondary-text";
      thinkingMsg.textContent = "Thinking...";

      thinkingDiv.appendChild(spinner);
      thinkingDiv.appendChild(thinkingMsg);

      const chatArea = this.getChatHistoryContainer(rawID);

      if (!chatArea)
        this.chatArea.appendChild(thinkingDiv);

      else
        chatArea.appendChild(thinkingDiv);

      // Return the div so we can remove it later
      return thinkingDiv;
    }
    catch(e) {
      console.error(e.message);
      throw e;
    }
  }

  scrollToBottom(rawID) {
    const chatArea = this.getChatHistoryContainer(rawID);

    if (!chatArea)
      this.chatArea.scrollTop = this.chatArea.scrollHeight;

    else
      chatArea.scrollTop = chatArea.scrollHeight;
  }

  async createAddedFileBubble(fileData) {
    let div = null;
    let showTimeout = null;
    let hideTimeout = null;
    let fileCount = Array.isArray(fileData) ? fileData.length : 1;

    const chatFileContainer = DomQuery.getElement('.chat-file-container');
    chatFileContainer.style.display = 'flex';


    if (fileCount > 1) {
      for (const fileName of fileData) {
        const btn = DomQuery.createButton();

        const img = document.createElement('img');
        img.style.height = '16px';
        img.style.width = '16px';
        img.style.marginLeft = '0';
        img.style.marginRight = '5px';

        const fname = PathUtils.getFileName(fileName);
        const fileType = await Backend.isImage(fileName);

        btn.classList.add('chat-action');
        btn.classList.add('chat-file-item');
        btn.disabled = true;

        if (fileType === 'file')
          img.src = '../assets/text-file.png';

        else
          img.src = '../assets/image-file.png';

        const closeBtn = DomQuery.createButton();
        closeBtn.textContent = "x";
        closeBtn.classList.add('chat-action');
        closeBtn.classList.add('preview-file-close');
        closeBtn.textContent = 'x';
        closeBtn.style.zIndex = '12345';
        closeBtn.style.marginBottom = '12px';

        // Prevent the hover preview from triggering when hovering over closeBtn
        closeBtn.addEventListener('mouseenter', (e) => {
          e.stopPropagation();

          if (showTimeout) {
            clearTimeout(showTimeout);
            showTimeout = null;
          }
        });

        closeBtn.addEventListener('mouseleave', (e) => {
          e.stopPropagation();
        });

        // Handle the close button click
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          btn.remove();

          fileCount = fileCount - 1;

          if (fileCount === 0) {
            chatFileContainer.style.display = 'none';
            const allChatInput = document.querySelectorAll('.chat-input')

            Array.from(allChatInput).forEach(elem => {
              elem.style.borderTop = '';
              elem.style.borderRadius = '';
            });
          }
        });

        btn.prepend(img);
        btn.append(fname);
        btn.appendChild(closeBtn);

        const fDisplay = new fileDisplay(fileName, fileType);

        btn.addEventListener('mouseenter', () => {
          if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
          }

          if (DomQuery.getElement('display-selected-files').style.display !== 'flex') {
            if (showTimeout)
              clearTimeout(showTimeout);

            showTimeout = setTimeout(() => fDisplay.show(), 1000);
          }
        });

        btn.addEventListener('mouseleave', () => {
          if (showTimeout) {
            clearTimeout(showTimeout);
            showTimeout = null;
          }

          hideTimeout = setTimeout(() => {
            hideTimeout = null;

            if (!fDisplay._isHovered)
              fDisplay.hide();
          }, 50);
        });

        chatFileContainer.appendChild(btn);
      };
    }

    else {
      const fileType = await Backend.isImage(fileData);
      const fname = PathUtils.getFileName(fileData);

      const btn = DomQuery.createButton();
      btn.classList.add('chat-action');
      btn.classList.add('chat-file-item');
      btn.disabled = true;

      const img = document.createElement('img');
      img.style.height = '16px';
      img.style.width = '16px';
      img.style.marginLeft = '0';
      img.style.marginRight = '5px';

      if (fileType === 'file')
        img.src = '../assets/text-file.png';

      else
        img.src = '../assets/image-file.png';

      const closeBtn = DomQuery.createButton();
      closeBtn.textContent = "x";
      closeBtn.classList.add('chat-action');
      closeBtn.classList.add('file-clear-button');
      closeBtn.textContent = 'x';
      closeBtn.style.zIndex = '12345';

      // Prevent the hover preview from triggering when hovering over closeBtn
      closeBtn.addEventListener('mouseenter', (e) => {
        e.stopPropagation();

        if (showTimeout) {
          clearTimeout(showTimeout);
          showTimeout = null;
        }
      });

      closeBtn.addEventListener('mouseleave', (e) => {
        e.stopPropagation();
      });

      // Handle the close button click
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        btn.remove();

        fileCount = fileCount - 1;

        if (fileCount === 0) {
          chatFileContainer.style.display = 'none';
          const allChatInput = document.querySelectorAll('.chat-input')

          Array.from(allChatInput).forEach(elem => {
            elem.style.borderTop = '';
            elem.style.borderRadius = '';
          });
        }
      });

      btn.prepend(img);
      btn.append(fname);
      btn.appendChild(closeBtn);

      const fDisplay = new fileDisplay(fileData, fileType);

      btn.addEventListener('mouseenter', (e) => {
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }

        if (DomQuery.getElement('display-selected-files').style.display !== 'flex') {
          if (showTimeout)
            clearTimeout(showTimeout);

          showTimeout = setTimeout(() => fDisplay.show(), 1000);
        }
      });

      btn.addEventListener('mouseleave', () => {
        if (showTimeout) {
          clearTimeout(showTimeout);
          showTimeout = null;
        }

        hideTimeout = setTimeout(() => {
          hideTimeout = null;

          if (!fDisplay._isHovered)
            fDisplay.hide();
        }, 50);
      });

      chatFileContainer.appendChild(btn);
    }

    const allChatInput = document.querySelectorAll('.chat-input')

    Array.from(allChatInput).forEach(elem => {
      elem.style.borderTop = 'none';
      elem.style.borderRadius = '0';
    });
  }

  removeAddedFileBubble() {
    /*
    DomQuery.removeElements([
      'file-clear-button',
      '.file-added-badge',
    ]);

    DomQuery.getElement('attach-file').dataset.tooltip = 'Attach a file';

    DomQuery
      .getElement('.action-separator')
      .style
      .transform = 'translateX(1360%)';

    DomQuery
      .getElement('attach-opened-file')
      .style
      .transform = 'translateX(175%)';
    */
  }

  createAttachedOpenedFiles() {
    AttachSelectedFiles.show();

  }
}

class SelectedFiles {
  constructor() {
    this.selectedFiles = new Map();
  }

  set(id, files) {
    this.selectedFiles.set(id, files);
  }

  remove(id) {
    this.selectedFiles.delete(id);
  }
}

const selectedFiles = new SelectedFiles();

class EventHandler {
  constructor(ui, coordinator, resizeManager) {
    this.ui = ui;
    this.coordinator = coordinator;
    this.controller = new AbortController();
    this.resizeManager = resizeManager;
  }

  addListener(element, event, handler) {
    element.addEventListener(event, handler, { signal: this.controller.signal });
  }

  init() {
    this.addListener(this.ui.newTabButton, 'click', () => {
      this.ui.newChatTab();
    });

    this.addListener(this.ui.resizeHandle, 'mousedown', (e) => {
      e.preventDefault();

      this.resizeManager.startResize(e);

      window.addEventListener('mousemove', this.resizeManager.boundResize);
      window.addEventListener('mouseup', this.resizeManager.boundStopResize);
    });

    this.addListener(this.ui.resizeHandleChat, 'mousedown', (e) => {
      e.preventDefault();

      this.resizeManager.startResizeChatArea(e);

      window.addEventListener(
        'mousemove',
        this.resizeManager.boundResizeChatArea
      );

      window.addEventListener(
        'mouseup',
        this.resizeManager.boundStopResizeChatArea
      );
    });

    this.addListener(this.ui.chatButtons, 'click', (e) => {
      const btn = e.target.closest('.chat-action');

      if (!btn)
        return;

      if (btn.id.includes('send')) {
        const id = Utility.getRawID(btn.id);
        const userPromptArea = DomQuery.getElement(`user-prompt-${id}`);

        if (!userPromptArea)
          this.coordinator.displayAiResponse(this.ui.userPrompt.value.trim());

        else
          this.coordinator.displayAiResponse(userPromptArea.value.trim());
      }

      else if (btn.id.includes('attach-file')) {
        btn.blur();
        btn.blur();

        this.coordinator.attachFile()
          .then(selected => {
            if (selected || selected?.length > 0) {

              selectedFiles.set(btn.id, selected);
              this.ui.createAddedFileBubble(selected);
            }
          });
      }

      else if (btn.id.includes('file-clear')) {
        selectedFiles.remove(btn.id);
        this.coordinator.removeAddedFileBubble();
      }

      else if (btn.id.includes('attach-opened-file')) {
        this.ui.createAttachedOpenedFiles();
      }
    });

    this.addListener(this.ui.userPrompt, 'keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.coordinator.displayAiResponse(this.ui.userPrompt.value.trim());
      }
    });

    this.addListener(this.ui.showPanelButton, 'click', () => this.ui.show());
    this.addListener(this.ui.hidePanelButton, 'click', () => this.ui.hide());
  }
}

class ChatPanel {
  constructor(backend, ui, eventHandler) {
    this.service = backend;
    this.ui = ui;
    this.eventHandler = eventHandler;
    this.chatTabManager = this.ui.chatTabManager;
  }

  init() {
    this.eventHandler.init();
    this.show();

    return this;
  }

  show() {
    this.ui.show();
  }

  hide() {
    this.ui.hide();
  }

  newChatTab() {
    this.ui.newChatTab();
  }

  clearChats(rawID) {
    this.ui.clearChats(rawID);
  }

  closeChat(rawID) {
    // Get all chats plus the default chat tab
    const count = this.chatTabManager.getAllChats().size;

    if (count > 1)
      this.ui.removeChatTab(rawID);

      // Do not close tab if it's the only one remaining
      else if (count === 1) {
        const tab = this.chatTabManager.get(rawID).chatTab;

        if (!tab) {
          this.ui.setMainChatTabTitle('Untitled');
        }

        else {
          this.chatTabManager.removeChat(rawID);
        }

        this.clearChats(rawID);
      }
  }

  switchToChatTab(id) {
    const rawID = Utility.getRawID(id);
    const clickedTab = this.chatTabManager.get(rawID);
    const currentTab = this.ui.currentChatTab;

    currentTab.element().classList.remove('active');
    clickedTab.element().classList.add('active');

    this.ui.currentChatTab = clickedTab;
    this.clearChats(rawID);
  }

  setMainChatTabTitle(title) {
    this.ui.setMainChatTabTitle(title)
  }

  setChatTabTitle(id, title) {
    this.ui.setChatTabTitle(id, title)
  }

  async displayAiResponse(message) {
    if (!message || message.length === 0)
      return;

    const id = Utility.getRawID(this.ui.currentChatTab.element().id);
    const prevChats = this.chatTabManager.get(id);
    const title = message.substring(0, 12);

    try {
      this.ui.displayUserMessage(id, message);
      const thinkingDiv = this.ui.createLoadingDiv(id);

      this.ui.scrollToBottom(id);
      this.ui.clearChatBox(id);

      try { this.setChatTabTitle(id, title) }
      catch(_) { this.setMainChatTabTitle(title) }

      const res = await this.service.getAiResponse(
        id,
        this.chatTabManager,
        prevChats,
        message
      );
      await this.ui.displayAiResponse(id, res, thinkingDiv);
    }
    catch(e) {
      console.error(e);
      this.ui.displayErrorMessage(id, e);
    }
  }

  switchToTab(id) {
    this.ui.switchToTab(id);

    const prevChats = this.chatTabManager.get(id);

    if (prevChats) {
      const convoLength = prevChats.user.length;

      if (convoLength > 0) {
        for (let i = 0; i < convoLength; i++) {
          this.ui.displayUserMessage(id, prevChats.user[i]);
          this.ui.displayAiResponse(id, prevChats.system[i], null);
        }
      }
    }
  }

  removeChatTab(id) {
    this.ui.removeChatTab(id);
  }

  async attachFile() {
    const openedFile = await this.service.addFile();
    return openedFile;
  }

  removeAddedFileBubble(/*id*/) {
    this.ui.removeAddedFileBubble(/*id*/);
  }
}

export function createChatPanel(chatTabManager) {
  const ui = new ChatPanelUI(chatTabManager);
  const resizeManager = new ResizeManager(ui);
  const eventHandler = new EventHandler(ui, null, resizeManager);
  const chatPanel = new ChatPanel(Backend, ui, eventHandler);

  eventHandler.coordinator = chatPanel;
  return chatPanel;
}


