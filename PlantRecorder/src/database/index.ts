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
      groupId       INTEGER NOT NULL,
      coverImagePath TEXT NOT NULL,
      title         TEXT NOT NULL,
      description   TEXT DEFAULT '',
      createdAt     INTEGER NOT NULL,
      updatedAt     INTEGER NOT NULL,
      FOREIGN KEY (\`groupId\`) REFERENCES \`groups\`(\`id\`) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_individuals_groupId ON \`individuals\`(\`groupId\`);
    CREATE INDEX IF NOT EXISTS idx_individuals_createdAt ON \`individuals\`(\`createdAt\`);
    CREATE INDEX IF NOT EXISTS idx_individuals_title ON \`individuals\`(\`title\`);

    CREATE TABLE IF NOT EXISTS \`records\` (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      individualId  INTEGER NOT NULL,
      imagePath     TEXT NOT NULL,
      title         TEXT NOT NULL,
      description   TEXT DEFAULT '',
      recordDate    INTEGER NOT NULL,
      createdAt     INTEGER NOT NULL,
      FOREIGN KEY (\`individualId\`) REFERENCES \`individuals\`(\`id\`) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_records_individualId ON \`records\`(\`individualId\`);
    CREATE INDEX IF NOT EXISTS idx_records_recordDate ON \`records\`(\`recordDate\`);
  `);

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