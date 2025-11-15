const { pool } = require('../config/database');

class Sprint {
  static async findByProjectId(projectId) {
    const result = await pool.query(
      `SELECT * FROM sprints 
       WHERE project_id = $1 
       ORDER BY start_date DESC, created_at DESC`,
      [projectId]
    );
    return result.rows;
  }

  static async findById(id, projectId) {
    const result = await pool.query(
      `SELECT * FROM sprints 
       WHERE id = $1 AND project_id = $2`,
      [id, projectId]
    );
    return result.rows[0] || null;
  }

  static async create({ projectId, name, goal, startDate, endDate, status, createdBy }) {
    const result = await pool.query(
      `INSERT INTO sprints (project_id, name, goal, start_date, end_date, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [projectId, name, goal, startDate, endDate, status || 'planned', createdBy]
    );
    return result.rows[0];
  }

  static async update(id, projectId, { name, goal, startDate, endDate, status }) {
    const result = await pool.query(
      `UPDATE sprints 
       SET name = COALESCE($1, name),
           goal = COALESCE($2, goal),
           start_date = COALESCE($3, start_date),
           end_date = COALESCE($4, end_date),
           status = COALESCE($5, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND project_id = $7
       RETURNING *`,
      [name, goal, startDate, endDate, status, id, projectId]
    );
    return result.rows[0] || null;
  }

  static async delete(id, projectId) {
    const result = await pool.query(
      `DELETE FROM sprints 
       WHERE id = $1 AND project_id = $2
       RETURNING id`,
      [id, projectId]
    );
    return result.rows.length > 0;
  }

  static async getActiveSprint(projectId) {
    const result = await pool.query(
      `SELECT * FROM sprints 
       WHERE project_id = $1 AND status = 'active'
       ORDER BY start_date DESC
       LIMIT 1`,
      [projectId]
    );
    return result.rows[0] || null;
  }
}

module.exports = Sprint;

