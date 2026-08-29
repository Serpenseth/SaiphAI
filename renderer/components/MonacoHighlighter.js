
class MonacoHighlightController {
  constructor(editor, windowElement) {
    // Monaco instance
    this.editor = editor;
    // Floating window where the AI response will be
    this.windowElement = windowElement;
    // Reference of event listener (needed for removal)
    this.selectionEvent = null;
    // init class
    this.init();
  }

  init() {
    // Listen for selection changes (highlighting)
    this.selectionEvent = this.editor.onDidChangeCursorSelection((e) => {
      this.handleSelectionChange(e);
    });
  }

  destroy() {
    if (this.selectionEvent) {
      this.selectionEvent.dispose();
      this.selectionEvent = null;
    }
    this.editor = null;
    this.windowElement = null;
    //this.hideWindow();
  }

  handleSelectionChange(e) {
    const selection = this.editor.getSelection();

    if (selection.isEmpty()) {
      this.hideWindow();
      return;
    }

    const position = {
      lineNumber: selection.endLineNumber,
      column: selection.endColumn
    }

    const coordinates = this.editor.getScrolledVisiblePosition(position);

    if (coordinates) {
      this.showWindow(coordinates, selection);
    }
  }

  showWindow(coords, selection) {
    console.log(this.windowElement.id.includes('floating-buttons'));
    this.windowElement.style.display = 'flex';

    const top = coords.top;
    const left = coords.left;
    const popupRect = this.windowElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 200;
    const lineHeight = 62;
    let finalTop = top + lineHeight;
    let finalLeft = left;
    //let finalBottom = bottom - lineHeight;

    if (finalLeft + popupRect.width > viewportWidth) {
      finalLeft = viewportWidth - popupRect.width - padding;
    }

    if (finalLeft < padding) {
      finalLeft = padding;
    }

    this.windowElement.style.top = `${finalTop}px`;
    this.windowElement.style.left = `${finalLeft}px`;

    const model = this.editor.getModel();

    if (model) {
      const selectedText = model.getValueInRange(selection);
      this.windowElement.dataset.selectedText = selectedText;
    }
  }

  hideWindow() {
    this.windowElement.style.display = 'none';
  }
}

export const MonacoHighlighter = MonacoHighlightController;
