const ChatStorageObject = {
  handle(savedChats) {
    const prevTabs = { id: [], chats: [] };

    for (let i = 0; i < savedChats.length; i++) {
      prevTabs.id.push(savedChats[i][0]);
      prevTabs.chats.push(JSON.parse(savedChats[i][1]));
    }

    return prevTabs;
  },
}

export { ChatStorageObject };
