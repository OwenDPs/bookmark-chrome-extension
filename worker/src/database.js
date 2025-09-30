// 数据库初始化和管理模块

/**
 * 数据库工具类
 */
export class DatabaseUtils {
  /**
   * 检查数据库是否已初始化
   * @param {Object} env - 环境变量
   * @returns {Promise<boolean>} 是否已初始化
   */
  static async isDatabaseInitialized(env) {
    try {
      // 检查是否存在users表
      const result = await env.BOOKMARK_DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      ).first();

      return !!result;
    } catch (error) {
      console.error('[DatabaseUtils] 检查数据库初始化状态失败:', error);
      return false;
    }
  }

  /**
   * 初始化数据库
   * @param {Object} env - 环境变量
   * @returns {Promise<void>}
   */
  static async initializeDatabase(env) {
    try {
      console.log('[DatabaseUtils] 开始初始化数据库...');

      // 分别执行每条SQL语句，避免多行SQL问题
      const sqlStatements = [
        // 用户表
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // 收藏夹表
        `CREATE TABLE IF NOT EXISTS bookmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,

        // 速率限制表
        `CREATE TABLE IF NOT EXISTS rate_limits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL,
          timestamp INTEGER NOT NULL
        )`,

        // 创建索引
        `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
        `CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id_created_at ON bookmarks(user_id, created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_rate_limits_key_timestamp ON rate_limits(key, timestamp)`,

        // 创建触发器
        `CREATE TRIGGER IF NOT EXISTS update_users_timestamp
         AFTER UPDATE ON users
         BEGIN
           UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
         END`,

        `CREATE TRIGGER IF NOT EXISTS update_bookmarks_timestamp
         AFTER UPDATE ON bookmarks
         BEGIN
           UPDATE bookmarks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
         END`
      ];

      // 逐条执行SQL语句
      for (const sql of sqlStatements) {
        await env.BOOKMARK_DB.exec(sql);
      }

      console.log('[DatabaseUtils] 数据库初始化完成');
    } catch (error) {
      console.error('[DatabaseUtils] 数据库初始化失败:', error);
      throw error;
    }
  }

  /**
   * 检查并初始化数据库（如果需要）
   * @param {Object} env - 环境变量
   * @returns {Promise<void>}
   */
  static async ensureDatabaseInitialized(env) {
    const isInitialized = await this.isDatabaseInitialized(env);

    if (!isInitialized) {
      console.log('[DatabaseUtils] 数据库未初始化，正在初始化...');
      await this.initializeDatabase(env);
    } else {
      console.log('[DatabaseUtils] 数据库已初始化，跳过初始化步骤');
    }
  }
}

/**
 * 创建速率限制表的独立函数（作为备用方案）
 * @param {Object} env - 环境变量
 * @returns {Promise<void>}
 */
export async function createRateLimitTable(env) {
  try {
    console.log('[DatabaseUtils] 创建速率限制表...');

    // 先检查表是否已存在
    const existingTable = await env.BOOKMARK_DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='rate_limits'"
    ).first();

    if (!existingTable) {
      console.log('[DatabaseUtils] 表不存在，正在创建...');

      // 分别执行创建表和索引的语句
      await env.BOOKMARK_DB.exec(`CREATE TABLE rate_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )`);

      await env.BOOKMARK_DB.exec(`CREATE INDEX IF NOT EXISTS idx_rate_limits_key_timestamp ON rate_limits(key, timestamp)`);

      console.log('[DatabaseUtils] 速率限制表创建成功');
    } else {
      console.log('[DatabaseUtils] 速率限制表已存在，跳过创建');
    }
  } catch (error) {
    console.error('[DatabaseUtils] 创建速率限制表失败:', error);
    throw error;
  }
}