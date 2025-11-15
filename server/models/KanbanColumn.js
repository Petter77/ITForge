const { pool } = require('../config/database');

class KanbanColumn {
  static async findByProjectId(projectId) {
    const result = await pool.query(
      `SELECT id, project_id, name, position, created_at, updated_at
       FROM kanban_columns
       WHERE project_id = $1
       ORDER BY position ASC`,
      [projectId]
    );

    return result.rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      position: row.position,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  static async findById(columnId, projectId) {
    const result = await pool.query(
      `SELECT id, project_id, name, position, created_at, updated_at
       FROM kanban_columns
       WHERE id = $1 AND project_id = $2`,
      [columnId, projectId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      position: row.position,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static async create({ projectId, name, position }) {
    const result = await pool.query(
      `INSERT INTO kanban_columns (project_id, name, position)
       VALUES ($1, $2, $3)
       RETURNING id, project_id, name, position, created_at, updated_at`,
      [projectId, name, position || 0]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      position: row.position,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static async update(columnId, projectId, { name, position }) {
    const result = await pool.query(
      `UPDATE kanban_columns
       SET name = COALESCE($1, name),
           position = COALESCE($2, position),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND project_id = $4
       RETURNING id, project_id, name, position, created_at, updated_at`,
      [name, position, columnId, projectId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      position: row.position,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static async delete(columnId, projectId) {
    const result = await pool.query(
      `DELETE FROM kanban_columns
       WHERE id = $1 AND project_id = $2
       RETURNING id`,
      [columnId, projectId]
    );

    return result.rows.length > 0;
  }

  static async initializeDefaultColumns(projectId) {
    // Check if columns already exist
    const existing = await this.findByProjectId(projectId);
    if (existing.length > 0) {
      return existing;
    }

    // Create default columns
    const defaultColumns = [
      { name: 'Backlog', position: 0 },
      { name: 'Do zrobienia', position: 1 },
      { name: 'W trakcie', position: 2 },
      { name: 'Zakończone', position: 3 },
    ];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const columns = [];
      for (const col of defaultColumns) {
        const result = await client.query(
          `INSERT INTO kanban_columns (project_id, name, position)
           VALUES ($1, $2, $3)
           RETURNING id, project_id, name, position, created_at, updated_at`,
          [projectId, col.name, col.position]
        );
        const row = result.rows[0];
        columns.push({
          id: row.id,
          projectId: row.project_id,
          name: row.name,
          position: row.position,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }
      await client.query('COMMIT');
      return columns;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = KanbanColumn;

