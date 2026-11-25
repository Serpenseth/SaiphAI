const UserChats = {
  history: new Map(),
}

const ChatsHandler = {
  getChat(id) {
    return UserChats.history.get(id);
  },

  addChat(id, chatData) {
    UserChats.history.set(id, {
      title: chatData.title,
      user: chatData.user,
      system: chatData.system,
    });
  },

  removeChat(id) {
    UserChats.history.delete(id);
  },

  getAllChats() {
    return Array.from(UserChats.history);
  },
}

export { ChatsHandler };
