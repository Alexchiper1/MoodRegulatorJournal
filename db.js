// db.js - lightweight SQLite wrapper + bootstrap
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'moodmate.db');
const db = new sqlite3.Database(DB_PATH);

// Create table if not exists
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      score INTEGER NOT NULL,
      mood TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
});

function insertEntry({ text, score, mood, createdAt }) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO entries (text, score, mood, created_at) VALUES (?, ?, ?, ?)`,
      [text, score, mood, createdAt],
      function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, text, score, mood, created_at: createdAt });
      }
    );
  });
}

function getEntries({ limit = 30 } = {}) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, text, score, mood, created_at
       FROM entries
       ORDER BY datetime(created_at) DESC
       LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

module.exports = { db, insertEntry, getEntries };
