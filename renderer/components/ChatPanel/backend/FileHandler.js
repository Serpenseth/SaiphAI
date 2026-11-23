const FileHandler = {
  async openFileChooser() {
    return window.electronAPI.openFile();
  },

  async readFile(filePath) {
    return window.electronAPI.readFile(filePath);
  },
}

export { FileHandler };
