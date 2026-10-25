import Database from "better-sqlite3";
const db = new Database("wallpapers.db");
db.exec(`CREATE TABLE IF NOT EXISTS wallpapers (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT NOT NULL, category TEXT NOT NULL,
 image_url TEXT NOT NULL, thumbnail_url TEXT NOT NULL,
 downloads INTEGER DEFAULT 0,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`);
const columns = db.prepare("PRAGMA table_info(wallpapers)").all();
if (!columns.some(c => c.name === "local_file")) db.exec("ALTER TABLE wallpapers ADD COLUMN local_file TEXT");
if (!columns.some(c => c.name === "uploader")) db.exec("ALTER TABLE wallpapers ADD COLUMN uploader TEXT DEFAULT 'Visitor'");
export default db;
