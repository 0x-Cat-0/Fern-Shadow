import { getDatabase } from '..';
import type { Individual, CreateIndividualDto, UpdateIndividualDto } from '../../types';

export class IndividualRepository {
  static async create(dto: CreateIndividualDto): Promise<number> {
    const db = getDatabase();
    const now = Date.now();
    const result = await db.runAsync(
      `INSERT INTO \`individuals\` (groupId, coverImagePath, title, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [dto.groupId, dto.coverImagePath, dto.title, dto.description, now, now]
    );
    return result.lastInsertRowId;
  }

  static async findById(id: number): Promise<Individual | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<Individual>(
      `SELECT * FROM \`individuals\` WHERE id = ?`,
      [id]
    );
    return row ?? null;
  }

  static async findByGroupId(groupId: number): Promise<Individual[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<Individual>(
      `SELECT * FROM \`individuals\` WHERE groupId = ? ORDER BY id DESC`,
      [groupId]
    );
    return rows;
  }

  static async search(query: string, groupId?: number): Promise<Individual[]> {
    const db = getDatabase();
    const searchPattern = `%${query}%`;

    let sql = `SELECT * FROM \`individuals\`
               WHERE (title LIKE ? OR description LIKE ?)`;
    const params: (string | number)[] = [searchPattern, searchPattern];

    if (groupId !== undefined) {
      sql += ` AND groupId = ?`;
      params.push(groupId);
    }

    sql += ` ORDER BY id DESC`;

    const rows = await db.getAllAsync<Individual>(sql, params);
    return rows;
  }

  static async update(id: number, dto: UpdateIndividualDto): Promise<void> {
    const db = getDatabase();
    const sets: string[] = [];
    const values: (string | number)[] = [];

    if (dto.coverImagePath !== undefined) {
      sets.push('coverImagePath = ?');
      values.push(dto.coverImagePath);
    }
    if (dto.title !== undefined) {
      sets.push('title = ?');
      values.push(dto.title);
    }
    if (dto.description !== undefined) {
      sets.push('description = ?');
      values.push(dto.description);
    }

    if (sets.length === 0) return;

    sets.push('updatedAt = ?');
    values.push(Date.now());
    values.push(id);

    await db.runAsync(
      `UPDATE \`individuals\` SET ${sets.join(', ')} WHERE id = ?`,
      values
    );
  }

  static async delete(id: number): Promise<void> {
    const db = getDatabase();
    await db.runAsync(`DELETE FROM \`individuals\` WHERE id = ?`, [id]);
  }

  static async getCountByGroupId(groupId: number): Promise<number> {
    const db = getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM \`individuals\` WHERE groupId = ?`,
      [groupId]
    );
    return row?.count ?? 0;
  }
}