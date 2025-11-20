const { pool } = require('../config/database');

class Requirement {
  static async findByProjectId(projectId) {
    const result = await pool.query(
      `SELECT r.*, 
              u.id as created_by_id, u.email as created_by_email, 
              u.first_name as created_by_first_name, u.last_name as created_by_last_name
       FROM requirements r
       JOIN users u ON r.created_by = u.id
       WHERE r.project_id = $1
       ORDER BY 
         CASE r.priority
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
           ELSE 5
         END ASC,
         r.created_at DESC`,
      [projectId]
    );

    return result.rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      description: row.description,
      type: row.type,
      priority: row.priority,
      status: row.status,
      createdBy: {
        id: row.created_by_id,
        email: row.created_by_email,
        firstName: row.created_by_first_name,
        lastName: row.created_by_last_name,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  static async findById(id, projectId) {
    const result = await pool.query(
      `SELECT r.*, 
              u.id as created_by_id, u.email as created_by_email, 
              u.first_name as created_by_first_name, u.last_name as created_by_last_name
       FROM requirements r
       JOIN users u ON r.created_by = u.id
       WHERE r.id = $1 AND r.project_id = $2`,
      [id, projectId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      description: row.description,
      type: row.type,
      priority: row.priority,
      status: row.status,
      createdBy: {
        id: row.created_by_id,
        email: row.created_by_email,
        firstName: row.created_by_first_name,
        lastName: row.created_by_last_name,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static async create({ projectId, title, description, type, priority, status, createdBy }) {
    const result = await pool.query(
      `INSERT INTO requirements (project_id, title, description, type, priority, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [projectId, title, description || null, type, priority || 'medium', status || 'draft', createdBy]
    );

    return await this.findById(result.rows[0].id, projectId);
  }

  static async update(id, projectId, { title, description, type, priority, status }) {
    const result = await pool.query(
      `UPDATE requirements 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           type = COALESCE($3, type),
           priority = COALESCE($4, priority),
           status = COALESCE($5, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND project_id = $7
       RETURNING *`,
      [title, description, type, priority, status, id, projectId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return await this.findById(id, projectId);
  }

  static async delete(id, projectId) {
    const result = await pool.query(
      `DELETE FROM requirements 
       WHERE id = $1 AND project_id = $2
       RETURNING id`,
      [id, projectId]
    );

    return result.rows.length > 0;
  }
}

module.exports = Requirement;

