import { getDatabase } from '..';
import type { Individual, CreateIndividualDto, UpdateIndividualDto, SortType } from '../../types';

export class IndividualRepository {
  static async create(dto: CreateIndividualDto): Promise<number> {
    const db = getDatabase();
    const now = Date.now();
    const result = await db.runAsync(
      `INSERT INTO \`individuals\` (coverImagePath, title, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)`,
      [dto.coverImagePath, dto.title, dto.description, now, now]
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

  static async findAll(sortType: SortType = 'default'): Promise<Individual[]> {
    const db = getDatabase();
    const orderBy = this.getOrderBy(sortType, 'individuals');
    const rows = await db.getAllAsync<Individual>(
      `SELECT * FROM \`individuals\` ORDER BY ${orderBy}`
    );
    return rows;
  }

  static async search(query: string, sortType: SortType = 'default'): Promise<Individual[]> {
    const db = getDatabase();
    const searchPattern = `%${query}%`;
    const orderBy = this.getOrderBy(sortType, 'individuals');

    const rows = await db.getAllAsync<Individual>(
      `SELECT * FROM \`individuals\`
       WHERE title LIKE ? OR description LIKE ?
       ORDER BY ${orderBy}`,
      [searchPattern, searchPattern]
    );
    return rows;
  }

  private static getOrderBy(sortType: SortType, table: 'individuals' | 'groups'): string {
    switch (sortType) {
      case 'hot':
        return `${table}.viewCount DESC`;
      case 'least_hot':
        return `${table}.viewCount ASC`;
      case 'latest':
        return `${table}.updatedAt DESC`;
      case 'oldest':
        return `${table}.updatedAt ASC`;
      default:
        return `${table}.id DESC`;
    }
  }

  static async update(id: number, dto: UpdateIndividualDto): Promise<void> {
    const db = getDatabase();
    const sets: string[] = [];
    const values: (string | number | null)[] = [];

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

  static async getCount(): Promise<number> {
    const db = getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM \`individuals\``
    );
    return row?.count ?? 0;
  }

  static async incrementViewCount(id: number): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      `UPDATE \`individuals\` SET viewCount = viewCount + 1, updatedAt = ? WHERE id = ?`,
      [Date.now(), id]
    );
  }
}