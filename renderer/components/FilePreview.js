import {
  StringUtils,
  DomQuery,
  MarkdownParser,
  UuidGenerator
} from '../utility/utilities.js';

const Backend = {
  async readFile(filePath) {
    return window.electronAPI.readFile(filePath);
  },
}

const PathUtils = {
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
  },
}

const ImageHandler = {
  async clean(imagePath) {
    return window.electronAPI.cleanImage(imagePath);
  },

  async isImage(filePath) {
    return window.electronAPI.isImage(filePath);
  },
}

const PreviewModal = {
  createFilePreview(language, highlighted) {
    const fileElement = document.createElement('div');
    fileElement.id = 'expanded-file-contents';
    fileElement.className = 'expanded-file-contents';
    fileElement.innerHTML = `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;

    return fileElement;
  },

  createImagePreview(imageBlob) {
    const imageElement = document.createElement('img');
    imageElement.id = 'expanded-file-contents';
    imageElement.className = 'expanded-image-contents';
    imageElement.setAttribute("src", imageBlob);
    imageElement.onload = () => URL.revokeObjectURL(imageElement.src);

    return imageElement;
  },

}

const FilePreviewButton = {
  create(id, fileName, fileType) {
    const imgStyles = 'height: 16px; width: 16px; margin-left: 0; margin-right: 5px';

    const imgType = fileType === 'file'
      ? '../assets/text-file.png'
       : '../assets/image-file.png';

    return `
      <button id='file-preview-${id}' class='chat-action chat-file-item'>
        <img style="${imgStyles}" src="${imgType}"></img>
        ${fileName}
      </button>
    `;
  },

  createCloseButton(id) {
    return `
      <button id='close-btn-${id}' class='chat-action preview-file-close'>
        x
      </button>`;
  },
}

const imageURLHandler = {
  create(source, imageType) {
    const type = `image/${imageType}`;
    const blob = new Blob([new Uint8Array(source)], { type: type });

    return { url: URL.createObjectURL(blob), blob: blob }
  },
}

const Ui = {
  showFilePreviewContainer(id, state) {
    const panel =  DomQuery.getElement(`user-prompt-${id}`);

    panel.style.borderTop = state === true ? 'none' : '';
    panel.style.borderRadius = state === true ? '0' : '';
    DomQuery.showElement(`chat-file-container-${id}`, state);
  },

  showPreviewModal(state) {
    DomQuery.toggleVisibility('display-selected-files', state);
    DomQuery.showElement('display-selected-files', state);
  },

  clearFilePreviewContent() {
    DomQuery.updateInnerHTML('expand-uploaded-contents', '');
  },

  removeFilePreviewButton(fullTabID) {
    const id = StringUtils.getRawID(fullTabID);
    DomQuery.removeElement(`file-preview-${id}`);
  },

  convertHTMLToDOM(buttonHTML) {
    return DomQuery.htmlTemplateToDOM(buttonHTML).firstElementChild;
  },

  addButtonToFileContainer(id, buttonHTML) {
    const dom = Ui.convertHTMLToDOM(buttonHTML);
    DomQuery.appendChild(`chat-file-container-${id}`, dom);
  },

  addCloseButton(id, buttonHTML) {
    const dom = Ui.convertHTMLToDOM(buttonHTML);
    DomQuery.appendChild(`file-preview-${id}`, dom);
  },

  destroyFilePreviewContainer(fullTabID) {
    const id = StringUtils.getRawID(fullTabID);
    const container = DomQuery.getElement(`chat-file-container-${id}`);
    const allAttachedFiles = container.querySelectorAll('.chat-file-item');

    if (allAttachedFiles) {
      Controller.abort(id);
      Array.from(allAttachedFiles).forEach(el => el.remove());

      this.showFilePreviewContainer(id, false);
    }
  },
}

const HoverState = {
  hovering: false,

  set(state) {
    HoverState.hovering = state;
  },

  get() {
    return HoverState.hovering;
  },
}

const TimeoutHandler = {
  showTimeout: null,
  hideTimeout: null,

  setShowTimeout(timeout) {
    TimeoutHandler.showTimeout = timeout;
  },

  setHideTimeout(timeout) {
    TimeoutHandler.hideTimeout = timeout;
  },

  clearShowTimeout() {
    clearTimeout(TimeoutHandler.showTimeout);
    TimeoutHandler.showTimeout = null;
  },

  clearHideTimeout() {
    clearTimeout(TimeoutHandler.hideTimeout);
    TimeoutHandler.hideTimeout = null;
  },
}

const FilePreviewData = {
  fileData: new Map(),
  fileCount: 0,

  // data = htmlContent, fileType, fileContents
  set(id, data) {
    FilePreviewData.fileData.set(id, data);
  },

  get(id) {
    return FilePreviewData.fileData.get(id);
  },

  getFileCount() {
    return FilePreviewData.fileCount;
  },

  setFileCount(newCount) {
    FilePreviewData.fileCount = newCount;
  },

  remove(id) {
    FilePreviewData.fileData.delete(id);
  },
}

const HoverHandler = {
  onHover() {
    const timeout = TimeoutHandler.hideTimeout;

    if (timeout) {
      TimeoutHandler.clearHideTimeout();
    }

    if (DomQuery.getElement('display-selected-files').style.display !== 'flex') {
      const sTimeout = TimeoutHandler.showTimeout;

      if (sTimeout)
        TimeoutHandler.clearShowTimeout();

      const showTimeout = setTimeout(() => Ui.showPreviewModal(true), 1000);
      TimeoutHandler.setShowTimeout(showTimeout);
    }
  },

  onHoverLeave() {
    const timeout = TimeoutHandler.showTimeout;

    if (timeout)
      TimeoutHandler.clearShowTimeout();

    const hideTimeout = setTimeout(() => {
      if (!HoverState.get())
        Ui.showPreviewModal(false);
    }, 1000);
  },
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
  setupButtonEvents(element, abortSignal) {
    const elem = DomQuery.getElement(element);

    // Close event
    elem.addEventListener('click', (e) => {
      const fileItem = e.target.closest('.chat-file-item');
      const closeBtn = e.target.closest('.preview-file-close');

      if (closeBtn) {
        const fileCount = FilePreviewData.getFileCount();
        const count = fileCount - 1;

        FilePreviewData.setFileCount(fileCount - 1);
        FilePreviewData.remove(fileItem.id);
        DomQuery.removeElement(fileItem.id);

        let id = fileItem.id.substring(0, fileItem.id.lastIndexOf('-'));
        id = StringUtils.getRawID(id);

        if (count === 0) {
          Ui.showFilePreviewContainer(id, false);
          // destroy event listeners to prevent memory leaks
          Controller.abort(id);
        }
      }
    }, { signal: abortSignal });

    // Hover event
    elem.addEventListener('mouseover', (e) => {
      if (e.target.closest('.preview-file-close')) {
        TimeoutHandler.clearShowTimeout();
        return;
      }

      const fileItem = e.target.closest('.chat-file-item');

      if (fileItem) {
        const data = FilePreviewData.get(fileItem.id);
        DomQuery.updateInnerHTML('expand-uploaded-contents', '');
        DomQuery.appendChild('expand-uploaded-contents', data.htmlContent);

        HoverHandler.onHover();
      }
    }, { signal: abortSignal });

    elem.addEventListener('mouseleave', () => {
      HoverHandler.onHoverLeave();
    }, { signal: abortSignal });
  },

  setupPreviewHoverEvent(previewModalElement, abortSignal) {
    const previewModal = DomQuery.getElement(previewModalElement);

    previewModal.addEventListener('mouseenter', () => {
      HoverState.set(true);
    }, { signal: abortSignal });

    previewModal.addEventListener('mouseleave', () => {
      HoverState.set(false);
      Ui.showPreviewModal(false);
    }, { signal: abortSignal });
  },
}

const FilePreviewManager = {
  async init(id, fileData) {
    FilePreviewData.setFileCount(fileData.length);

    fileData.forEach(({ fileName, filePath }) => {
      const fullPath = filePath + fileName;

      ImageHandler.isImage(fullPath).then(fileType => {
        fileType === 'file'
          ? this.initFilePreview(id, fileName, filePath, fileType)
          : this.initImagePreview(id, fileName, filePath, fileType);
      });
    });

    Ui.showFilePreviewContainer(id, true);

    const controller = Controller.add(id);
    EventHandler.setupPreviewHoverEvent('display-selected-files', controller.signal);
    EventHandler.setupButtonEvents(`chat-file-container-${id}`, controller.signal);
  },

  async initFilePreview(id, fileName, filePath, fileType) {
    let uniqueID = UuidGenerator.generate();
    uniqueID = `${id}-${uniqueID}`;

    const fileButton = FilePreviewButton.create(uniqueID, fileName, fileType);
    Ui.addButtonToFileContainer(id, fileButton);

    let highlighted = null;
    const fullName = filePath + fileName;
    const fileContents =  await Backend.readFile(fullName);
    const language = PathUtils.getExt(fileName);

    try {
      highlighted = hljs.highlight(fileContents, { language, ignoreIllegals: true }).value;
    }
    catch (e) {
      highlighted = fileContents
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    const preview = PreviewModal.createFilePreview(language, highlighted);
    FilePreviewData.set(`file-preview-${uniqueID}`, {
      htmlContent: preview,
      fileName: fileName,
      fileType: 'file',
      fileContents: fileContents,
    });

    const closeBtn = FilePreviewButton.createCloseButton(uniqueID);
    Ui.addCloseButton(uniqueID, closeBtn);
  },

  async initImagePreview(id, fileName, filePath, fileType) {
    let uniqueID = UuidGenerator.generate();
    uniqueID = `${id}-${uniqueID}`;

    const fileButton = FilePreviewButton.create(uniqueID, fileName, fileType);
    Ui.addButtonToFileContainer(id, fileButton);

    const fullName = filePath + fileName;
    const img = await ImageHandler.clean(fullName);
    const { url, blob } = imageURLHandler.create(img, fileType);

    const preview = PreviewModal.createImagePreview(url);
    FilePreviewData.set(`file-preview-${uniqueID}`, {
      htmlContent: preview,
      fileName: fileName,
      fileType: fileType,
      fileContents: blob,
    });

    const closeBtn = FilePreviewButton.createCloseButton(uniqueID);
    Ui.addCloseButton(uniqueID, closeBtn);
  },
}

const FilePreview = {
  async init(id, fileData) {
    FilePreviewManager.init(id, fileData);
  },

  getAttachedFileData(id) {
    return FilePreviewData.get(id);
  },

  destroy(fullTabID) {
    Ui.destroyFilePreviewContainer(fullTabID);
  }
}

export { FilePreview };


