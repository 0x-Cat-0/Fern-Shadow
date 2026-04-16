import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'plant_recorder.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS \`groups\` (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      coverImagePath TEXT NOT NULL,
      title         TEXT NOT NULL,
      description   TEXT DEFAULT '',
      viewCount     INTEGER DEFAULT 0,
      createdAt     INTEGER NOT NULL,
      updatedAt     INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_groups_createdAt ON \`groups\`(\`createdAt\`);
    CREATE INDEX IF NOT EXISTS idx_groups_viewCount ON \`groups\`(\`viewCount\`);
    CREATE INDEX IF NOT EXISTS idx_groups_title ON \`groups\`(\`title\`);

    CREATE TABLE IF NOT EXISTS \`individuals\` (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      coverImagePath TEXT NOT NULL,
      title         TEXT NOT NULL,
      description   TEXT DEFAULT '',
      viewCount     INTEGER DEFAULT 0,
      createdAt     INTEGER NOT NULL,
      updatedAt     INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_individuals_createdAt ON \`individuals\`(\`createdAt\`);
    CREATE INDEX IF NOT EXISTS idx_individuals_title ON \`individuals\`(\`title\`);
    -- viewCount index will be created after migration

    CREATE TABLE IF NOT EXISTS \`group_individuals\` (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      groupId       INTEGER NOT NULL,
      individualId  INTEGER NOT NULL,
      createdAt     INTEGER NOT NULL,
      FOREIGN KEY (\`groupId\`) REFERENCES \`groups\`(\`id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`individualId\`) REFERENCES \`individuals\`(\`id\`) ON DELETE CASCADE,
      UNIQUE(groupId, individualId)
    );

    CREATE INDEX IF NOT EXISTS idx_group_individuals_groupId ON \`group_individuals\`(\`groupId\`);
    CREATE INDEX IF NOT EXISTS idx_group_individuals_individualId ON \`group_individuals\`(\`individualId\`);

    CREATE TABLE IF NOT EXISTS \`records\` (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      individualId  INTEGER NOT NULL,
      imagePath     TEXT NOT NULL DEFAULT '[]',
      title         TEXT NOT NULL,
      description   TEXT DEFAULT '',
      recordDate    INTEGER NOT NULL,
      createdAt     INTEGER NOT NULL,
      FOREIGN KEY (\`individualId\`) REFERENCES \`individuals\`(\`id\`) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_records_individualId ON \`records\`(\`individualId\`);
    CREATE INDEX IF NOT EXISTS idx_records_recordDate ON \`records\`(\`recordDate\`);
  `);

  // 数据库迁移：添加缺失的列并创建缺失的索引
  await migrateDatabase(db);

  return db;
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function isDatabaseInitialized(): boolean {
  return db !== null;
}

// 数据库迁移函数
async function migrateDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // 检查 individuals 表是否有 viewCount 列
    const columns = await database.getAllAsync<{ name: string }>(
      `PRAGMA table_info(\`individuals\`)`
    );
    const hasViewCount = columns.some(col => col.name === 'viewCount');
    if (!hasViewCount) {
      await database.runAsync(
        `ALTER TABLE \`individuals\` ADD COLUMN viewCount INTEGER DEFAULT 0`
      );
      console.log('Migration: added viewCount column to individuals table');
    }

    // 检查是否有 viewCount 索引
    const indexes = await database.getAllAsync<{ name: string }>(
      `PRAGMA index_list(\`individuals\`)`
    );
    const hasIndex = indexes.some(idx => idx.name === 'idx_individuals_viewCount');
    if (!hasIndex) {
      await database.runAsync(
        `CREATE INDEX idx_individuals_viewCount ON \`individuals\`(\`viewCount\`)`
      );
      console.log('Migration: created idx_individuals_viewCount index');
    }

    // 检查 records 表是否有 imageAssetIds 列
    const recordColumns = await database.getAllAsync<{ name: string }>(
      `PRAGMA table_info(\`records\`)`
    );
    const hasImageAssetIds = recordColumns.some(col => col.name === 'imageAssetIds');
    if (!hasImageAssetIds) {
      await database.runAsync(
        `ALTER TABLE \`records\` ADD COLUMN imageAssetIds TEXT NOT NULL DEFAULT '[]'`
      );
      console.log('Migration: added imageAssetIds column to records table');
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }
}