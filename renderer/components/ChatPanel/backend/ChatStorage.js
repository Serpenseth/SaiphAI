const ChatStorage = {
  save(id, chat) {
    window.electronAPI.saveChat(id, JSON.stringify(chat));
  },

  async remove(id) {
    await window.electronAPI.deleteChat(id);
  },

  async get(id) {
    const savedChat = await window.electronAPI.getSavedChat(id);
    return savedChat ? JSON.parse(savedChat) : undefined;
  },

  async getAll() {
    return window.electronAPI.getAllChats();
  },
}

export { ChatStorage };
