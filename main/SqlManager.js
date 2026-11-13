//const SqlDB = require("better-sqlite3");
const SqlDB = require('sql.js');
const fs = require('fs').promises;
const fsSync = require('fs');

const SqlManager = {
  db: null,
  dbPath: null,

  _persistToDisk() {
    const data = SqlManager.db.export();
    fsSync.writeFileSync(SqlManager.dbPath, Buffer.from(data));
  },

  _insert(id, content) {
    SqlManager.db.run(
      "INSERT INTO items (id, content) VALUES (?, ?)",
      [id, content]
    );
  },

  _update(content, id) {
    SqlManager.db.run(
      "UPDATE items SET content = ? WHERE id = ?",
      [content, id]
    );
  },

  init(chatsDB) {
    SqlDB().then(initSQL => {
      // Cache db path for this._persistToDisk
      SqlManager.dbPath = chatsDB;

      // Check if db exists
      SqlManager.db = fsSync.existsSync(chatsDB);

      // Load chats db
      if (SqlManager.db) {
        SqlManager.db = new initSQL.Database(fsSync.readFileSync(chatsDB));
      }
      // Create chats db
      else {
        SqlManager.db = new initSQL.Database();
        SqlManager.db.run(`
          CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL
          )
        `);
        this._persistToDisk();
      }
    });
  },

  saveChat(id, content) {
    const current = SqlManager.getChat(id);
    const dbExists = current !== undefined;
    dbExists ? this._update(content, id) : this._insert(id, content);

    this._persistToDisk();
  },

  getChat(id) {
    const getChatPrep = SqlManager.db.prepare(
      "SELECT content FROM items WHERE id = ?"
    );

    try {
      getChatPrep.bind([id]);
      return getChatPrep.step()
        ? getChatPrep.getAsObject().content
        : undefined;
    }
    finally { getChatPrep.free() };
  },

  destroy() {
    SqlManager.db.close();
  },
}

module.exports = { SqlManager };
