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
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Remove user from kanban task assignees
      await client.query(
        `DELETE FROM kanban_task_assignees kta
         USING kanban_tasks kt
         WHERE kta.task_id = kt.id
           AND kt.project_id = $1
           AND kta.user_id = $2`,
        [projectId, userId]
      );

      // Remove user from backlog item assignees
      await client.query(
        `DELETE FROM backlog_item_assignees bia
         USING backlog_items bi
         WHERE bia.backlog_item_id = bi.id
           AND bi.project_id = $1
           AND bia.user_id = $2`,
        [projectId, userId]
      );

      // Remove user as risk owner
      await client.query(
        `UPDATE risks
         SET owner_id = NULL
         WHERE project_id = $1 AND owner_id = $2`,
        [projectId, userId]
      );

      // Archive any previous invitations for this user in this project
      await client.query(
        `UPDATE project_invitations
         SET status = 'revoked', updated_at = CURRENT_TIMESTAMP
         WHERE project_id = $1 AND user_id = $2 AND status IN ('pending', 'accepted')`,
        [projectId, userId]
      );

      // Finally remove from project members
      await client.query(
        'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, userId]
      );

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

