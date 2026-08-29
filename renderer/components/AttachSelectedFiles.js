const DomQuery = {
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

/*
class AttachSelectedFilesManager {
  constructor() {
    this.selectedItems = new Set();
  }

  add(item) {
    this.selectedItems.add(item);
  }

  remove(item) {
    this.selectedItems.delete(item);
  }
}*/


class AttachSelectedFiles {
  static totalSelectedFiles = 0;

  static _build(item, index) {
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'checkbox-style';
    checkboxContainer.id = item;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `checkbox-file-${index}`;
    checkbox.name = 'item';
    checkbox.value = item;

    const label = document.createElement('label');
    label.setAttribute('for', `checkbox-file-${index}`);
    label.textContent = item;

    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(label);

    return checkboxContainer;
  }

  static show() {
    DomQuery
      .getElement('selected-opened-files')
      .style
      .display = 'block';
  }

  static hide() {
    DomQuery
      .getElement('selected-opened-files')
      .style
      .display = 'none';
  }

  static create() {
    const rect = DomQuery
      .getElement('attach-opened-file')
      .getBoundingClientRect();

    const fragment = document.createDocumentFragment();

    if (!DomQuery.getElement('.attach-selected-files')) {
      const menu = document.createElement('div');
      menu.className = 'attach-selected-files';
      menu.style.left = `${rect.left + 15 + window.scrollX}px`;
      menu.style.top  = `${rect.bottom - 300}px`;
      menu.id = 'selected-opened-files';

      document.body.appendChild(menu);

      let arr = new Set();
      const allOpenedFiles = document.querySelectorAll('.file-item');

      Array.from(allOpenedFiles).map(s => {
        if (s.classList.contains('selected'))
          arr.add(PathUtils.getFileName(s.dataset.path));
      });

      AttachSelectedFiles.totalSelectedFiles = arr.size;

      arr.forEach((item, index) => {
        const elem = AttachSelectedFiles._build(item, index);
        fragment.appendChild(elem);
      });

      menu.appendChild(fragment);
    }
  }

  static add(fileToAdd) {
    const fname = PathUtils.getFileName(fileToAdd.dataset.path);
    const index = AttachSelectedFiles.totalSelectedFiles;
    const elem = AttachSelectedFiles._build(fname, index);

    // Menu
    DomQuery.getElement('selected-opened-files').appendChild(elem);
  }
}

class AttachSelectedFilesClickHandler {
  static isAlreadyInit = false;
  static controller = new AbortController();

  static _addListener(element, event, handler) {
    element.addEventListener(event, handler, {
      signal: AttachSelectedFilesClickHandler.controller.signal,
    });
  }

  static init() {
    const clickHandler = AttachSelectedFilesClickHandler;

    if (!clickHandler.isAlreadyInit) {
      clickHandler._addListener(document, 'click', (e) => {
        const target = e.target.id;
        const excludedElements = /attach-opened-file|checkbox-file|selected-opened-files|file-tab|btn-close-file/;

        //if (target && target !== 'attach-opened-file' && !target.includes('checkbox-file') && !target.includes('selected-opened-files'))
        if (target && !excludedElements.test(target))
          AttachSelectedFiles.hide();

        clickHandler.isAlreadyInit = true;
      });
    }
  }

  static destroy() {
    AttachSelectedFilesClickHandler.controller.abort();
  }
}

export { AttachSelectedFiles, AttachSelectedFilesClickHandler };
