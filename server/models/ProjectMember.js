const { pool } = require('../config/database');

class ProjectMember {
  static async findByProjectId(projectId) {
    const result = await pool.query(
      `SELECT 
        pm.id,
        pm.project_id,
        pm.user_id,
        pm.role,
        pm.created_at,
        u.email,
        u.first_name,
        u.last_name
       FROM project_members pm
       INNER JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1
       ORDER BY pm.role DESC, u.first_name, u.last_name`,
      [projectId]
    );

    return result.rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      role: row.role,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      createdAt: row.created_at,
    }));
  }

  static async findByProjectAndUser(projectId, userId) {
    const result = await pool.query(
      'SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    return result.rows[0] || null;
  }

  static async addMember(projectId, userId, role = 'member') {
    const result = await pool.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id) 
       DO UPDATE SET role = $3
       RETURNING *`,
      [projectId, userId, role]
    );

    return result.rows[0];
  }

  static async updateRole(projectId, userId, newRole) {
    const result = await pool.query(
      `UPDATE project_members 
       SET role = $1
       WHERE project_id = $2 AND user_id = $3
       RETURNING *`,
      [newRole, projectId, userId]
    );

    return result.rows[0];
  }

  static async removeMember(projectId, userId) {
    await pool.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    return true;
  }

  static async getMemberCount(projectId) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM project_members WHERE project_id = $1',
      [projectId]
    );

    return parseInt(result.rows[0].count);
  }
}

module.exports = ProjectMember;

