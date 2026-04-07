import { getDatabase } from '..';
import type { Group, CreateGroupDto, UpdateGroupDto, SortType } from '../../types';

export class GroupRepository {
  static async create(dto: CreateGroupDto): Promise<number> {
    const db = getDatabase();
    const now = Date.now();
    const result = await db.runAsync(
      `INSERT INTO \`groups\` (coverImagePath, title, description, viewCount, createdAt, updatedAt)
       VALUES (?, ?, ?, 0, ?, ?)`,
      [dto.coverImagePath, dto.title, dto.description, now, now]
    );
    return result.lastInsertRowId;
  }

  static async findById(id: number): Promise<Group | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<Group>(
      `SELECT * FROM \`groups\` WHERE id = ?`,
      [id]
    );
    return row ?? null;
  }

  static async findAll(sortType: SortType = 'default'): Promise<Group[]> {
    const db = getDatabase();
    let orderBy = 'id DESC';

    if (sortType === 'hot') {
      orderBy = 'viewCount DESC, id DESC';
    } else if (sortType === 'latest') {
      orderBy = 'createdAt DESC';
    }

    const rows = await db.getAllAsync<Group>(
      `SELECT * FROM \`groups\` ORDER BY ${orderBy}`
    );
    return rows;
  }

  static async search(query: string, sortType: SortType = 'default'): Promise<Group[]> {
    const db = getDatabase();
    const searchPattern = `%${query}%`;
    let orderBy = 'id DESC';

    if (sortType === 'hot') {
      orderBy = 'viewCount DESC, id DESC';
    } else if (sortType === 'latest') {
      orderBy = 'createdAt DESC';
    }

    const rows = await db.getAllAsync<Group>(
      `SELECT * FROM \`groups\`
       WHERE title LIKE ? OR description LIKE ?
       ORDER BY ${orderBy}`,
      [searchPattern, searchPattern]
    );
    return rows;
  }

  static async update(id: number, dto: UpdateGroupDto): Promise<void> {
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
      `UPDATE \`groups\` SET ${sets.join(', ')} WHERE id = ?`,
      values
    );
  }

  static async incrementViewCount(id: number): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      `UPDATE \`groups\` SET viewCount = viewCount + 1, updatedAt = ? WHERE id = ?`,
      [Date.now(), id]
    );
  }

  static async delete(id: number): Promise<void> {
    const db = getDatabase();
    await db.runAsync(`DELETE FROM \`groups\` WHERE id = ?`, [id]);
  }

  static async getCount(): Promise<number> {
    const db = getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM \`groups\``
    );
    return row?.count ?? 0;
  }
}