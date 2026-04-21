import { getDatabase } from '..';
import type { Record, CreateRecordDto, UpdateRecordDto } from '../../types';

export class RecordRepository {
  static async create(dto: CreateRecordDto): Promise<number> {
    const db = getDatabase();
    const now = Date.now();
    const imagePath = Array.isArray(dto.imagePath)
      ? JSON.stringify(dto.imagePath)
      : dto.imagePath;
    const result = await db.runAsync(
      `INSERT INTO \`records\` (individualId, imagePath, title, description, recordDate, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [dto.individualId, imagePath, dto.title, dto.description, dto.recordDate, now]
    );
    return result.lastInsertRowId;
  }

  static async findById(id: number): Promise<Record | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<Record>(
      `SELECT * FROM \`records\` WHERE id = ?`,
      [id]
    );
    if (row) {
      try {
        row.imagePath = JSON.parse(row.imagePath as unknown as string);
      } catch {
        // 保持原样
      }
    }
    return row ?? null;
  }

  static async findByIndividualId(individualId: number): Promise<Record[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<Record>(
      `SELECT * FROM \`records\` WHERE individualId = ? ORDER BY recordDate DESC, id DESC`,
      [individualId]
    );
    return rows.map(row => {
      try {
        row.imagePath = JSON.parse(row.imagePath as unknown as string);
      } catch {
        // 保持原样
      }
      return row;
    });
  }

  static async search(query: string, individualId?: number): Promise<Record[]> {
    const db = getDatabase();
    const searchPattern = `%${query}%`;

    let sql = `SELECT * FROM \`records\`
               WHERE (title LIKE ? OR description LIKE ?)`;
    const params: (string | number)[] = [searchPattern, searchPattern];

    if (individualId !== undefined) {
      sql += ` AND individualId = ?`;
      params.push(individualId);
    }

    sql += ` ORDER BY recordDate DESC, id DESC`;

    const rows = await db.getAllAsync<Record>(sql, params);
    return rows;
  }

  static async update(id: number, dto: UpdateRecordDto): Promise<void> {
    const db = getDatabase();
    const sets: string[] = [];
    const values: (string | number)[] = [];

    if (dto.imagePath !== undefined) {
      sets.push('imagePath = ?');
      const imagePath = Array.isArray(dto.imagePath)
        ? JSON.stringify(dto.imagePath)
        : dto.imagePath;
      values.push(imagePath);
    }
    if (dto.title !== undefined) {
      sets.push('title = ?');
      values.push(dto.title);
    }
    if (dto.description !== undefined) {
      sets.push('description = ?');
      values.push(dto.description);
    }
    if (dto.recordDate !== undefined) {
      sets.push('recordDate = ?');
      values.push(dto.recordDate);
    }

    if (sets.length === 0) return;

    values.push(id);

    await db.runAsync(
      `UPDATE \`records\` SET ${sets.join(', ')} WHERE id = ?`,
      values
    );
  }

  static async delete(id: number): Promise<void> {
    const db = getDatabase();
    await db.runAsync(`DELETE FROM \`records\` WHERE id = ?`, [id]);
  }

  static async getCountByIndividualId(individualId: number): Promise<number> {
    const db = getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM \`records\` WHERE individualId = ?`,
      [individualId]
    );
    return row?.count ?? 0;
  }
}