import { StringUtils } from '../../utility/utilities.js';

const FileHandler = {
  async readFile(filePath) {
    return await window.electronAPI.readFile(filePath);
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

export { MonacoInstance };
