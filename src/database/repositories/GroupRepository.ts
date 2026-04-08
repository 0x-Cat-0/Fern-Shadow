import { getDatabase } from '..';
import type { Group, Individual, CreateGroupDto, UpdateGroupDto, SortType } from '../../types';

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

  // 添加个体到分组（支持批量添加个体到一个分组，或一个个体添加到多个分组）
  static async addIndividualsToGroup(groupId: number, individualIds: number[]): Promise<void> {
    const db = getDatabase();
    const now = Date.now();
    for (const individualId of individualIds) {
      await db.runAsync(
        `INSERT OR IGNORE INTO \`group_individuals\` (groupId, individualId, createdAt) VALUES (?, ?, ?)`,
        [groupId, individualId, now]
      );
    }
  }

  // 从分组移除个体
  static async removeIndividualFromGroup(groupId: number, individualId: number): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      `DELETE FROM \`group_individuals\` WHERE groupId = ? AND individualId = ?`,
      [groupId, individualId]
    );
  }

  // 获取分组中的所有个体
  static async getIndividualsInGroup(groupId: number): Promise<Individual[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<Individual>(
      `SELECT i.* FROM \`individuals\` i
       INNER JOIN \`group_individuals\` gi ON i.id = gi.individualId
       WHERE gi.groupId = ?
       ORDER BY i.id DESC`,
      [groupId]
    );
    return rows;
  }

  // 获取个体所属的所有分组
  static async getGroupsForIndividual(individualId: number): Promise<Group[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<Group>(
      `SELECT g.* FROM \`groups\` g
       INNER JOIN \`group_individuals\` gi ON g.id = gi.groupId
       WHERE gi.individualId = ?
       ORDER BY g.id DESC`,
      [individualId]
    );
    return rows;
  }

  // 检查个体是否在分组中
  static async isIndividualInGroup(groupId: number, individualId: number): Promise<boolean> {
    const db = getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM \`group_individuals\` WHERE groupId = ? AND individualId = ?`,
      [groupId, individualId]
    );
    return (row?.count ?? 0) > 0;
  }

  // 在分组内搜索个体
  static async searchIndividualsInGroup(groupId: number, query: string): Promise<Individual[]> {
    const db = getDatabase();
    const searchPattern = `%${query}%`;
    const rows = await db.getAllAsync<Individual>(
      `SELECT i.* FROM \`individuals\` i
       INNER JOIN \`group_individuals\` gi ON i.id = gi.individualId
       WHERE gi.groupId = ? AND (i.title LIKE ? OR i.description LIKE ?)
       ORDER BY i.id DESC`,
      [groupId, searchPattern, searchPattern]
    );
    return rows;
  }
}