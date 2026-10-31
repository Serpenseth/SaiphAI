import { DomQuery } from '../utility/utilities.js';

const FloatingButtonsUI = {
  create(rawID) {
    return `
      <div id='floating-buttons-${rawID}' class='floating-buttons' style='display:none'>
        ${this._createExplainCodeButton(rawID)}
        <p style='padding: 0px 0.35rem'>|</p>
        ${this._createModifyWithAI(rawID)}
      </div>
    `;
  },

  _createExplainCodeButton(rawID) {
    return `
      <button id='explain-selection-${rawID}' class='floating-button-action'>
        Explain selection
      </button>
    `;
  },

  _createModifyWithAI(rawID) {
    return `
      <button id='modify-with-ai-${rawID}' class='floating-button-action'>
        Modify with AI
      </button>
    `;
  },
}

const Ui = {
  show(element, state) {
    DomQuery.showElement(element, state);
  },

  getSelectedText(element) {
    const el = DomQuery.getElement(element);
    return el.dataset.selectedText;
  },

  getFloatingButtons(fullWindowID) {
    return DomQuery.getElement(fullWindowID);
  },
}

const FloatingButtons = {
  create(rawID) {
    return FloatingButtonsUI.create(rawID);
  },

  show(rawID, state) {
    Ui.show(`floating-buttons-${rawID}`, state);
  },

  getSelectedText(rawID) {
    return Ui.getSelectedText(`floating-buttons-${rawID}`);
  },

  destroy(rawID) {
    return Ui.destroyButtons(`floating-buttons-${rawID}`);
  },

  element(rawID) {
    return Ui.getFloatingButtons(`floating-buttons-${rawID}`);
  }
}


export { FloatingButtons }

