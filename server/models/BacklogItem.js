const { pool } = require('../config/database');

class BacklogItem {
  // Helper method to get assignees for a backlog item
  static async getAssignees(itemId) {
    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name
       FROM backlog_item_assignees bia
       JOIN users u ON bia.user_id = u.id
       WHERE bia.backlog_item_id = $1`,
      [itemId]
    );
    return result.rows;
  }

  static async findByProjectId(projectId, sprintId = null) {
    let query = `
      SELECT bi.*, 
             u.id as created_by_id, u.email as created_by_email, 
             u.first_name as created_by_first_name, u.last_name as created_by_last_name
      FROM backlog_items bi
      JOIN users u ON bi.created_by = u.id
      WHERE bi.project_id = $1
    `;
    const params = [projectId];

    if (sprintId !== null) {
      query += ` AND bi.sprint_id = $2`;
      params.push(sprintId);
    } else {
      query += ` AND bi.sprint_id IS NULL`;
    }

    query += ` ORDER BY bi.position ASC, bi.created_at DESC`;

    const result = await pool.query(query, params);
    const items = result.rows;

    // Fetch assignees for each item
    for (const item of items) {
      item.assignedTo = await this.getAssignees(item.id);
    }

    return items;
  }

  static async findById(id, projectId) {
    const result = await pool.query(
      `SELECT bi.*, 
              u.id as created_by_id, u.email as created_by_email, 
              u.first_name as created_by_first_name, u.last_name as created_by_last_name
       FROM backlog_items bi
       JOIN users u ON bi.created_by = u.id
       WHERE bi.id = $1 AND bi.project_id = $2`,
      [id, projectId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const item = result.rows[0];
    item.assignedTo = await this.getAssignees(item.id);
    return item;
  }

  static async create({ projectId, sprintId, title, description, type, priority, storyPoints, status, position, assignedTo, createdBy }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get max position if not provided
      let finalPosition = position;
      if (finalPosition === undefined || finalPosition === null) {
        const positionResult = await client.query(
          `SELECT COALESCE(MAX(position), -1) + 1 as next_position
           FROM backlog_items 
           WHERE project_id = $1 AND (sprint_id = $2 OR ($2 IS NULL AND sprint_id IS NULL))`,
          [projectId, sprintId]
        );
        finalPosition = parseInt(positionResult.rows[0].next_position);
      }

      // Insert backlog item
      const result = await client.query(
        `INSERT INTO backlog_items 
         (project_id, sprint_id, title, description, type, priority, story_points, status, position, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [projectId, sprintId || null, title, description || null, type || 'story', priority || 'medium', storyPoints || null, status || 'todo', finalPosition, createdBy]
      );

      const item = result.rows[0];

      // Add assignees if provided
      if (assignedTo && Array.isArray(assignedTo) && assignedTo.length > 0) {
        for (const userId of assignedTo) {
          await client.query(
            `INSERT INTO backlog_item_assignees (backlog_item_id, user_id)
             VALUES ($1, $2)
             ON CONFLICT (backlog_item_id, user_id) DO NOTHING`,
            [item.id, userId]
          );
        }
      }

      await client.query('COMMIT');
      return await this.findById(item.id, projectId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(id, projectId, { title, description, type, priority, storyPoints, status, sprintId, position, assignedTo }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update backlog item
      const result = await client.query(
        `UPDATE backlog_items 
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             type = COALESCE($3, type),
             priority = COALESCE($4, priority),
             story_points = COALESCE($5, story_points),
             status = COALESCE($6, status),
             sprint_id = COALESCE($7, sprint_id),
             position = COALESCE($8, position),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $9 AND project_id = $10
         RETURNING *`,
        [title, description, type, priority, storyPoints, status, sprintId, position, id, projectId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      // Update assignees if provided
      if (assignedTo !== undefined) {
        // Remove all existing assignees
        await client.query(
          `DELETE FROM backlog_item_assignees WHERE backlog_item_id = $1`,
          [id]
        );

        // Add new assignees
        if (Array.isArray(assignedTo) && assignedTo.length > 0) {
          for (const userId of assignedTo) {
            await client.query(
              `INSERT INTO backlog_item_assignees (backlog_item_id, user_id)
               VALUES ($1, $2)
               ON CONFLICT (backlog_item_id, user_id) DO NOTHING`,
              [id, userId]
            );
          }
        }
      }

      await client.query('COMMIT');
      return await this.findById(id, projectId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(id, projectId) {
    const result = await pool.query(
      `DELETE FROM backlog_items 
       WHERE id = $1 AND project_id = $2
       RETURNING id`,
      [id, projectId]
    );
    return result.rows.length > 0;
  }

  static async moveToSprint(itemId, projectId, sprintId, position) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update position of other items in the target sprint
      if (position !== undefined && position !== null) {
        await client.query(
          `UPDATE backlog_items 
           SET position = position + 1
           WHERE project_id = $1 
           AND sprint_id = $2 
           AND position >= $3
           AND id != $4`,
          [projectId, sprintId, position, itemId]
        );
      }

      // Move item to sprint
      const result = await client.query(
        `UPDATE backlog_items 
         SET sprint_id = $1, 
             position = COALESCE($2, position),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND project_id = $4
         RETURNING *`,
        [sprintId, position, itemId, projectId]
      );

      await client.query('COMMIT');
      return result.rows[0] || null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async removeFromSprint(itemId, projectId) {
    const result = await pool.query(
      `UPDATE backlog_items 
       SET sprint_id = NULL, 
           position = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND project_id = $2
       RETURNING *`,
      [itemId, projectId]
    );
    return result.rows[0] || null;
  }
}

module.exports = BacklogItem;

