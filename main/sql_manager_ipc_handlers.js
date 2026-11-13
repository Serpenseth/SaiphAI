const { SqlManager } = require('./SqlManager.js');

const saveChat = (event, id, chatContent) => {
  SqlManager.saveChat(id, chatContent);
}

const getSavedChat = (event, id) => {
  return SqlManager.getChat(id);
}

module.exports = { saveChat, getSavedChat };
