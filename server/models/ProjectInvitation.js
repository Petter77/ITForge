const { pool } = require('../config/database');

class ProjectInvitation {
  static async create({ projectId, userId, inviterId, role = 'member' }) {
    // Check if there's already a pending invitation
    const existing = await pool.query(
      `SELECT id FROM project_invitations 
       WHERE project_id = $1 AND user_id = $2 AND status = 'pending'`,
      [projectId, userId]
    );

    if (existing.rows.length > 0) {
      return null; // Already exists
    }

    const result = await pool.query(
      `INSERT INTO project_invitations (project_id, user_id, inviter_id, role, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [projectId, userId, inviterId, role]
    );

    return result.rows[0] || null;
  }

  static async findByUserId(userId, status = 'pending') {
    const result = await pool.query(
      `SELECT 
        pi.id,
        pi.project_id,
        pi.user_id,
        pi.inviter_id,
        pi.role,
        pi.status,
        pi.created_at,
        p.name as project_name,
        p.description as project_description,
        u.first_name as inviter_first_name,
        u.last_name as inviter_last_name,
        u.email as inviter_email
       FROM project_invitations pi
       INNER JOIN projects p ON pi.project_id = p.id
       INNER JOIN users u ON pi.inviter_id = u.id
       WHERE pi.user_id = $1 AND pi.status = $2
       ORDER BY pi.created_at DESC`,
      [userId, status]
    );

    return result.rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      inviterId: row.inviter_id,
      role: row.role,
      status: row.status,
      createdAt: row.created_at,
      project: {
        id: row.project_id,
        name: row.project_name,
        description: row.project_description,
      },
      inviter: {
        id: row.inviter_id,
        firstName: row.inviter_first_name,
        lastName: row.inviter_last_name,
        email: row.inviter_email,
      },
    }));
  }

  static async findById(invitationId, userId) {
    const result = await pool.query(
      `SELECT * FROM project_invitations 
       WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
      [invitationId, userId]
    );

    return result.rows[0] || null;
  }

  static async accept(invitationId, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get invitation
      const invitationResult = await client.query(
        `SELECT * FROM project_invitations 
         WHERE id = $1 AND user_id = $2 AND status = 'pending'
         FOR UPDATE`,
        [invitationId, userId]
      );

      if (invitationResult.rows.length === 0) {
        throw new Error('Zaproszenie nie zostało znalezione lub zostało już przetworzone');
      }

      const invitation = invitationResult.rows[0];

      // Add user to project members
      await client.query(
        `INSERT INTO project_members (project_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3`,
        [invitation.project_id, invitation.user_id, invitation.role]
      );

      // Update invitation status
      await client.query(
        `UPDATE project_invitations 
         SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [invitationId]
      );

      await client.query('COMMIT');

      return {
        invitationId: invitation.id,
        projectId: invitation.project_id,
        role: invitation.role,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async reject(invitationId, userId) {
    const result = await pool.query(
      `UPDATE project_invitations 
       SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING *`,
      [invitationId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Invitation not found or already processed');
    }

    return result.rows[0];
  }

  static async cancel(invitationId, inviterId) {
    const result = await pool.query(
      `UPDATE project_invitations 
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND inviter_id = $2 AND status = 'pending'
       RETURNING *`,
      [invitationId, inviterId]
    );

    if (result.rows.length === 0) {
      throw new Error('Invitation not found or already processed');
    }

    return result.rows[0];
  }
}

module.exports = ProjectInvitation;

