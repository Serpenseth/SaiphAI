const { dialog } = require('electron');

const FileManager = require('./FileManager.js');

const readFile = async (event, fileToRead) => {
  const fm = new FileManager(fileToRead);
  return await  fm.readFile();
}

const scanFolder = async (event, folder) => {
  const fm =  new FileManager(folder);
  return await fm.getFolderTree();
}

const showFileDialog = async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'All Files', extensions: ['*'] }],
  });

  if (canceled)
    return null;

  else
    return filePaths.length === 1 ? filePaths[0] : filePaths;
}

const showFolderDialog = async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
  });

  if (canceled)
    return null;

  return filePaths[0];
}

const cleanImage = async (event, imgPath) => {
  const fm =  new FileManager(imgPath);
  return fm.cleanImage(imgPath);
}

const isImage = async (event, filePath) => {
  const fm = new FileManager(filePath);
  return fm.isImage();
}

module.exports = {
  readFile,
  scanFolder,
  showFileDialog,
  showFolderDialog,
  cleanImage,
  isImage,
};
