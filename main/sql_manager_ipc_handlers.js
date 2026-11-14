const { SqlManager } = require('./SqlManager.js');

const saveChat = (event, id, chatContent) => {
  SqlManager.saveChat(id, chatContent);
}

const getAllChats = () => {
  return SqlManager.getAllChats();
}

const deleteChat = (event, id) => {
  SqlManager.deleteChat(id);
}

const getSavedChat = (event, id) => {
  return SqlManager.getChat(id);
}

module.exports = { saveChat, getAllChats, deleteChat, getSavedChat };
