const { pool } = require('../config/database');

class Notification {
  static async create({ userId, projectId, type, title, message, entityType = null, entityId = null }) {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, project_id, type, title, message, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, projectId, type, title, message, entityType, entityId]
    );

    return result.rows[0] || null;
  }

  static async findByUserId(userId, includeRead = false) {
    let query = `
      SELECT 
        n.id,
        n.user_id,
        n.project_id,
        n.type,
        n.title,
        n.message,
        n.entity_type,
        n.entity_id,
        n.is_read,
        n.created_at,
        p.name as project_name
      FROM notifications n
      INNER JOIN projects p ON n.project_id = p.id
      WHERE n.user_id = $1
    `;
    
    const params = [userId];
    
    if (!includeRead) {
      query += ` AND n.is_read = FALSE`;
    }
    
    query += ` ORDER BY n.created_at DESC`;

    const result = await pool.query(query, params);

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      type: row.type,
      title: row.title,
      message: row.message,
      entityType: row.entity_type,
      entityId: row.entity_id,
      isRead: row.is_read,
      createdAt: row.created_at,
      project: {
        id: row.project_id,
        name: row.project_name,
      },
    }));
  }

  static async markAsRead(notificationId, userId) {
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );

    return result.rows[0] || null;
  }

  static async markAllAsRead(userId) {
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE
       RETURNING id`,
      [userId]
    );

    return result.rowCount;
  }

  static async getUnreadCount(userId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );

    return parseInt(result.rows[0].count);
  }
}

module.exports = Notification;


