// const Backend = {


const Helper = {
  createTryAgainButton(id, floatingWindow) {
    const div = document.createElement('div');
    div.className = 'try-again-container';

    const button = document.createElement('button');
    button.id = `try-again-${id}`;
    button.className = 'try-again';
    button.textContent = 'Try again';

    div.appendChild(button);
    floatingWindow.appendChild(div);

    return this;
  },

  createSendChangeField(id, floatingWindow) {
    const containerID = `suggest-input-container-${id}`;
    const sendBtnID = `send-suggestion-${id}`;
    //const textID = `suggestion-text-${id}`;

    const domElement = document.createElement('div');
    domElement.className = 'suggest-input-container';
    domElement.id = containerID;
    domElement.innerHTML = `
    <div
      <p class='text-secondary'>
        Enter below what you'd like to change
      </p>

      <div style='display: flex; flex-direction: row'>
        <textarea id='suggest-input-${id}' class='suggest-input'></textarea>
        <button id='${sendBtnID}' class='chat-action send-suggest'>
          <img style='height: 16px; width: 16px;' src='../assets/send.png'
        </button>
      </div>
    </div>`;

    // original
    // <input id='suggest-input-${id}' class='suggest-input'></input>

    // somewhat ok word-wrap
    // <div contenteditable='true' id='suggest-input-${id}' class='suggest-input'></div>

    floatingWindow.appendChild(domElement);
  },

  createCloseFloatingWindowButton(id, floatingWindow) {
    const close = document.createElement('button');
    close.className = 'close-floating-window';
    close.textContent = 'X';
    close.id = `close-floating-${id}`;
  },
}

class FloatingWindowManager {
  constructor() {
    this.floatingWindows = new Map();
  }

  add(id, floatingWindowInstance) {
    this.floatingWindows.set(id, floatingWindowInstance);
  }

  remove(id) {
    this.floatingWindows.delete(id);
  }

  get(id) {
    return this.floatingWindows.get(id);
  }

  hideAll() {
    for (let [, floatingWindow] of this.floatingWindows) {
      floatingWindow.hide();
    }
  }
}

class FloatingWindow {
  constructor(id) {
    this.id = id;

    this.floatingWindow = document.createElement('div');
    this.floatingWindow.id = `floating-window-${this.id}`;
    this.floatingWindow.className = 'floating-window';
    this.floatingWindow.style.display = 'none';
  }

  show() {
    this.floatingWindow.style.display = 'block';
    return this;
  }

  hide() {
    this.floatingWindow.style.display = 'none';
    return this;
  }

  createTryAgainButton() {
    Helper.createTryAgainButton(this.id, this.floatingWindow);
    return this;

    /*
    const div = document.createElement('div');
    div.className = 'try-again-container';

    const button = document.createElement('button');
    button.id = `try-again-${this.id}`;
    button.className = 'try-again';
    button.textContent = 'Try again';

    div.appendChild(button);
    this.floatingWindow.appendChild(div);

    return this;
    */
  }

  createSendChangeField() {
    Helper.createSendChangeField(this.id, this.floatingWindow);
    return this;

    /*
    const div = document.createElement('div');
    div.className = 'suggest-input-container';

    const field = document.createElement('input');
    field.id = `suggest-input-${this.id}`;
    field.className = 'input';
    field.style.width = '80%';

    div.appendChild(field);
    this.floatingWindow.appendChild(div);

    return this;
    */
  }

  element() {
    return this.floatingWindow;
  }

  setContent(content) {
    this.floatingWindow.innerHTML = content;
    return this;
  }

  getContent() {
    return this.floatingWindow.innerHTML;
  }

  contentLength() {
    return this.floatingWindow.textContent.length;
  }

  remove() {
    this.floatingWindow.remove();
    return this;
  }
}

export { FloatingWindowManager,  FloatingWindow }

