import {
  DomQuery,
  StringUtils,
  MarkdownParser,
} from '../utility/utilities.js';

import { MonacoHighlighter } from './MonacoHighlighter.js';
import { FloatingWindow } from './FloatingWindow.js';
import { FloatingButtons } from './FloatingButtons.js';

const EditorUI = {
  create(id) {
    const floatingWindow = FloatingWindow.create(id);
    const floatingButtons = FloatingButtons.create(id);

    return `
      <div id='editor-container-${id}' class='editor-container'>
        ${floatingButtons}
        ${floatingWindow}
      </div>
    `;
  },
}

const FileHandler = {
  async readFile(filePath) {
    return await window.electronAPI.readFile(filePath);
  },
}

const DiffsUI = {
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

  renderDiffPreview(diffBlocks, fileContents) {
    return diffBlocks.map((block, i) => {
      const searchLines = block.search.split('\n');
      const replaceLines = block.replace.split('\n');

      const deleted = searchLines
        .map(l => `<div class="diff-line deleted">- ${l}</div>`)
        .join('');

      const inserted = replaceLines
        .map(l => `<div class="diff-line inserted">+ ${l}</div>`)
        .join('');

      return `
        <div class="diff-block" data-diff-index="${i}">
          ${deleted}
          ${inserted}
          <div class="diff-actions">
            <button class="accept-diff" data-index="${i}">Accept</button>
            <button class="reject-diff" data-index="${i}">Reject</button>
          </div>
        </div>`;
    }).join('');
  },
}

const EditorDiffs = {
  activeDiffs: null,

  create(editorContainer, diffBlocks) {
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
          stickiness: monaco.editor.TrackedRangeStickiness
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
}

const DiffsBlock = {
  parse(block) {
    let match;
    const regex = /<EXPLANATION>([\s\S]*?)<\/EXPLANATION>\s*<SEARCH>([\s\S]*?)<\/SEARCH>\s*<REPLACE>([\s\S]*?)<\/REPLACE>/gs;
    const blocks = [];

    while ((match = regex.exec(block)) !== null) {
      blocks.push({
        explanation: match[1],
        search: match[2],
        replace: match[3],
      });
    }
    return blocks;
  },
}

const TextSummarizer = {
  async summarize(fileContents, mandatoryText) {
    return window.electronAPI.summarizeText(fileContents, mandatoryText);
  },
}

const ExtHandler = {
  convertExtToFullLang(fileExtension) {
    const ext = {
      js: 'javascript',
      py: 'python',
      ts: 'typescript',
      exs: 'elixir',
      sh: 'bash',
      ps1: 'powershell',
      rs: 'rust',
    }
    return ext[fileExtension] ?? fileExtension;
  },
}

const MonacoInstance = {
  async init(editor, file) {
    const contents = await FileHandler.readFile(file);
    const extRaw = StringUtils.getFileExtention(file);
    const ext = ExtHandler.convertExtToFullLang(extRaw);

    require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }});

    return new Promise((resolve) => {
      require(['vs/editor/editor.main'], () => {
        const instance = monaco.editor.create(editor, {
          value: contents,
          language: ext,
          theme:  'vs-dark',
          automaticLayout: true
        });
        resolve(instance);
      });
    });
  },
}

const EditorManager = {
  editorElements: new Map(),

  set(id, data) {
    EditorManager.editorElements.set(id, {
      fileEditorElement: data.fileEditorElement,
      monacoInstance: data.monacoInstance,
      monacoHighlighter: data.monacoHighlighter,
      //floatingButtons: data.floatingButtons,
      //floatingWindow: data.floatingWindow,
    });
  },

  get(id) {
    return EditorManager.editorElements.get(id);
  },

  remove(id) {
    const data = EditorManager.editorElements.get(id);
    // First destroy monaco editor instance and highlighter
    data.monacoInstance.dispose();
    data.monacoHighlighter.destroy();
    // Then delete map entry
    EditorManager.editorElements.delete(id);
  },

  getByElementID(DomElement) {
    let allElements = Array.from(EditorManager.editorElements.values());
    allElements = allElements.flat();

    allElements.forEach(el => {
      if (el.id === DomElement.id)
        return el;
    });
  },
}

const ActiveEditor = {
  active: null,

  set(editor) {
    this.active = editor;
  },

  get() {
    return active;
  },
}

const Ui = {
  showEditor(fullEditorContainerID, state) {
    DomQuery.showElement(fullEditorContainerID, state);
  },

  convertHTMLToDOM(editorContainerHTML) {
    const elementDOM = DomQuery.htmlTemplateToDOM(editorContainerHTML);
    const firstChild = elementDOM.firstElementChild;

    return firstChild;
  },

  getEditorElement(fullEditorContainerID) {
    return DomQuery.getElement(fullEditorContainerID);
  },

  attachEditorElement(editorElement) {
    DomQuery.appendChild('tabs-and-editor', editorElement);
  },

  removeEditor(fullEditorContainerID) {
    DomQuery.removeElement(fullEditorContainerID);
  },
}

const UiManager = {
  buildUi(id) {
    const editorHTML = EditorUI.create(id);
    const editorEl = Ui.convertHTMLToDOM(editorHTML);
    return editorEl;
  },
}

const FileEditorCreation = {
  init(id) {
    const editor = UiManager.buildUi(id);

    const elementsToAttach = [
      editor,
      Ui.convertHTMLToDOM(FloatingButtons.create(id)),
    ];

    elementsToAttach.forEach(el => {
      Ui.attachEditorElement(el);
    });

    return editor;
  },
}

const FileEditor = {
  create(rawFileTabID, file) {
    const id = rawFileTabID
    const editorEl = FileEditorCreation.init(id);

    ActiveEditor.set(editorEl);
    //FloatingButtons.show(id, false);

    const floatingBtns = FloatingButtons.element(id);

    MonacoInstance.init(editorEl, file).then(monacoInstance => {
      const highlighter = new MonacoHighlighter(monacoInstance, floatingBtns);

      EditorManager.set(id, {
        fileEditorElement: editorEl,
        monacoInstance: monacoInstance,
        monacoHighlighter: highlighter,
        // floatingButtons: floatingBtns,
        // floatingWindow: FloatingWindow.element(id),
      });
    });

    return editorEl;
  },

  show(fullEditorContainerID, state) {
    Ui.showEditor(fullEditorContainerID, state);
  },

  destroy(rawFileTabID) {
    EditorManager.remove(rawFileTabID);
    Ui.removeEditor(`editor-container-${rawFileTabID}`);
  },

  element(rawFileTabID) {
    return Ui.getEditorElement(`editor-container-${rawFileTabID}`);
  },

  async explainText(btnD, text, fileName) {
    return await FloatingWindow.explainText(btnD, text, fileName);
  },

  getActiveEditor() {
    return ActiveEditor.get();
  },

  setActiveEditor(fullEditorContainerID) {
    const editorEl = Ui.getEditorElement(fullEditorContainerID);
    return ActiveEditor.set(editorEl);
  },

  buildDiffSummary(diffBlocks) {
    return DiffsUI.buildDiffSummary(diffBlocks);
  },

  renderDiffPreview(diffBlocks, fileContents) {
    return DiffsUI.renderDiffPreview(diffBlocks, fileContents);
  },

  createEditorDiffs(editorContainer, diffBlocks) {
    EditorDiffs.create(editorContainer, diffBlocks);
  },

  parseDiffBlocks(blocks) {
    return DiffsBlock.parse(blocks);
  },
}


export { FileEditor }

