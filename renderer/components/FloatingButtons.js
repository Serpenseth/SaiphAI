class FloatingButtonsManager {
  constructor() {
    this.floatingButtons = new Map();
  }

  add(id, floatingButtonsInstance) {
    this.floatingButtons.set(id, floatingButtonsInstance);
  }

  remove(id) {
    this.floatingButtons.delete(id);
  }

  get(id) {
    return this.floatingButtons.get(id);
  }

  hideAll() {
    for (let [, fb] of this.floatingButtons) {
      fb.hide();
    }
  }
}

class FloatingButtons {
  constructor(id) {
    this.id = id;

    this.newFloatingButtons = document.createElement('div');
    this.newFloatingButtons.className = 'floating-buttons';
    this.newFloatingButtons.id = `floating-buttons-${this.id}`;
    this.newFloatingButtons.style.display = 'none';

    this.newExplainCode = document.createElement('button');
    this.newExplainCode.className = 'floating-button-action';
    this.newExplainCode.id = `explain-selection-${this.id}`;
    this.newExplainCode.textContent = 'Explain selection'

    this.newModifyWithAi = document.createElement('button');
    this.newModifyWithAi.className = 'floating-button-action';
    this.newModifyWithAi.id = `modify-with-ai-${this.id}`;
    this.newModifyWithAi.textContent = 'Modify with AI';

    this.newFloatingButtons.appendChild(this.newExplainCode);
    this.newFloatingButtons.appendChild(this._createSep());
    this.newFloatingButtons.appendChild(this.newModifyWithAi);

    this.floatingButtons = this.newFloatingButtons;
    this.newFloatingButtons = null;
  }

  _createSep() {
    const sep = document.createElement('p');
    sep.textContent = '|';
    sep.style.padding = '0px 0.35rem';

    return sep;
  }

  show() {
    this.floatingButtons.style.display = 'block';
    return this;
  }

  hide() {
    this.floatingButtons.style.display = 'none';
    return this;
  }

  element() {
    return this.floatingButtons;
  }

  getSelectedText() {
    return this.floatingButtons.dataset.selectedText;
  }
}

export { FloatingButtonsManager, FloatingButtons }

