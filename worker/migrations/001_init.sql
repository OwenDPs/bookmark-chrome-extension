-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 收藏夹表
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id_created_at ON bookmarks(user_id, created_at);

-- 创建触发器以自动更新updated_at字段
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_bookmarks_timestamp
AFTER UPDATE ON bookmarks
BEGIN
  UPDATE bookmarks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 插入一个测试用户（仅在开发环境使用）
-- INSERT OR IGNORE INTO users (email, password_hash)
-- VALUES ('test@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq7l7JWgI9i8T5T5f5T5T5T5T5T5T5');