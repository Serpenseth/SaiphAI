const ImageHandler = {
  async cleanImage(imagePath) {
    return window.electronAPI.cleanImage(imagePath);
  },

  async isImage(filePath) {
    return window.electronAPI.isImage(filePath);
  },
}

export { ImageHandler };
