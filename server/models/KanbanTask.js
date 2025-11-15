const { pool } = require('../config/database');

class KanbanTask {
  // Helper method to get assignees for a task
  static async getAssignees(taskId) {
    const result = await pool.query(
      `SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email
       FROM kanban_task_assignees kta
       INNER JOIN users u ON kta.user_id = u.id
       WHERE kta.task_id = $1
       ORDER BY u.first_name, u.last_name`,
      [taskId]
    );

    return result.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
    }));
  }

  static async findByColumnId(columnId) {
    const result = await pool.query(
      `SELECT 
        kt.id,
        kt.column_id,
        kt.project_id,
        kt.title,
        kt.description,
        kt.position,
        kt.created_by,
        kt.created_at,
        kt.updated_at,
        creator.first_name as creator_first_name,
        creator.last_name as creator_last_name
       FROM kanban_tasks kt
       LEFT JOIN users creator ON kt.created_by = creator.id
       WHERE kt.column_id = $1
       ORDER BY kt.position ASC, kt.created_at ASC`,
      [columnId]
    );

    // Get assignees for each task
    const tasks = await Promise.all(
      result.rows.map(async (row) => {
        const assignees = await this.getAssignees(row.id);
        return {
          id: row.id,
          columnId: row.column_id,
          projectId: row.project_id,
          title: row.title,
          description: row.description,
          position: row.position,
          assignedTo: assignees,
          createdBy: {
            id: row.created_by,
            firstName: row.creator_first_name,
            lastName: row.creator_last_name,
          },
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      })
    );

    return tasks;
  }

  static async findByProjectId(projectId) {
    const result = await pool.query(
      `SELECT 
        kt.id,
        kt.column_id,
        kt.project_id,
        kt.title,
        kt.description,
        kt.position,
        kt.created_by,
        kt.created_at,
        kt.updated_at,
        creator.first_name as creator_first_name,
        creator.last_name as creator_last_name
       FROM kanban_tasks kt
       LEFT JOIN users creator ON kt.created_by = creator.id
       WHERE kt.project_id = $1
       ORDER BY kt.column_id, kt.position ASC, kt.created_at ASC`,
      [projectId]
    );

    // Get assignees for each task
    const tasks = await Promise.all(
      result.rows.map(async (row) => {
        const assignees = await this.getAssignees(row.id);
        return {
          id: row.id,
          columnId: row.column_id,
          projectId: row.project_id,
          title: row.title,
          description: row.description,
          position: row.position,
          assignedTo: assignees,
          createdBy: {
            id: row.created_by,
            firstName: row.creator_first_name,
            lastName: row.creator_last_name,
          },
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      })
    );

    return tasks;
  }

  static async findById(taskId, projectId) {
    const result = await pool.query(
      `SELECT 
        kt.id,
        kt.column_id,
        kt.project_id,
        kt.title,
        kt.description,
        kt.position,
        kt.created_by,
        kt.created_at,
        kt.updated_at,
        creator.first_name as creator_first_name,
        creator.last_name as creator_last_name
       FROM kanban_tasks kt
       LEFT JOIN users creator ON kt.created_by = creator.id
       WHERE kt.id = $1 AND kt.project_id = $2`,
      [taskId, projectId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const assignees = await this.getAssignees(row.id);

    return {
      id: row.id,
      columnId: row.column_id,
      projectId: row.project_id,
      title: row.title,
      description: row.description,
      position: row.position,
      assignedTo: assignees,
      createdBy: {
        id: row.created_by,
        firstName: row.creator_first_name,
        lastName: row.creator_last_name,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static async create({ columnId, projectId, title, description, position, assignedTo, createdBy }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert task
      const result = await client.query(
        `INSERT INTO kanban_tasks (column_id, project_id, title, description, position, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [columnId, projectId, title, description || null, position || 0, createdBy]
      );

      const taskId = result.rows[0].id;

      // Insert assignees if provided
      if (assignedTo && Array.isArray(assignedTo) && assignedTo.length > 0) {
        for (const userId of assignedTo) {
          await client.query(
            `INSERT INTO kanban_task_assignees (task_id, user_id)
             VALUES ($1, $2)
             ON CONFLICT (task_id, user_id) DO NOTHING`,
            [taskId, userId]
          );
        }
      }

      await client.query('COMMIT');
      return await this.findById(taskId, projectId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(taskId, projectId, { title, description, columnId, position, assignedTo }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update task
      const result = await client.query(
        `UPDATE kanban_tasks
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             column_id = COALESCE($3, column_id),
             position = COALESCE($4, position),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 AND project_id = $6
         RETURNING id`,
        [title, description, columnId, position, taskId, projectId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      // Update assignees if provided
      if (assignedTo !== undefined) {
        // Remove all existing assignees
        await client.query(
          `DELETE FROM kanban_task_assignees WHERE task_id = $1`,
          [taskId]
        );

        // Add new assignees
        if (Array.isArray(assignedTo) && assignedTo.length > 0) {
          for (const userId of assignedTo) {
            await client.query(
              `INSERT INTO kanban_task_assignees (task_id, user_id)
               VALUES ($1, $2)
               ON CONFLICT (task_id, user_id) DO NOTHING`,
              [taskId, userId]
            );
          }
        }
      }

      await client.query('COMMIT');
      return await this.findById(taskId, projectId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(taskId, projectId) {
    const result = await pool.query(
      `DELETE FROM kanban_tasks
       WHERE id = $1 AND project_id = $2
       RETURNING id`,
      [taskId, projectId]
    );

    return result.rows.length > 0;
  }

  static async moveTask(taskId, projectId, newColumnId, newPosition) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current task info
      const currentTask = await this.findById(taskId, projectId);
      if (!currentTask) {
        throw new Error('Task not found');
      }

      const oldColumnId = currentTask.columnId;
      const oldPosition = currentTask.position;

      // If moving within the same column
      if (oldColumnId === newColumnId) {
        // Get all tasks in the column ordered by position
        const tasksInColumn = await this.findByColumnId(newColumnId);
        
        // Remove the moving task from the list
        const otherTasks = tasksInColumn.filter(t => t.id !== parseInt(taskId));
        
        // Adjust positions
        if (oldPosition < newPosition) {
          // Moving down - shift tasks up
          for (const task of otherTasks) {
            if (task.position > oldPosition && task.position <= newPosition) {
              await client.query(
                `UPDATE kanban_tasks SET position = position - 1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 AND project_id = $2`,
                [task.id, projectId]
              );
            }
          }
        } else if (oldPosition > newPosition) {
          // Moving up - shift tasks down
          for (const task of otherTasks) {
            if (task.position >= newPosition && task.position < oldPosition) {
              await client.query(
                `UPDATE kanban_tasks SET position = position + 1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 AND project_id = $2`,
                [task.id, projectId]
              );
            }
          }
        }
      } else {
        // Moving to a different column
        // Shift tasks in the old column up
        await client.query(
          `UPDATE kanban_tasks
           SET position = position - 1, updated_at = CURRENT_TIMESTAMP
           WHERE column_id = $1 AND position > $2 AND project_id = $3`,
          [oldColumnId, oldPosition, projectId]
        );

        // Shift tasks in the new column down
        await client.query(
          `UPDATE kanban_tasks
           SET position = position + 1, updated_at = CURRENT_TIMESTAMP
           WHERE column_id = $1 AND position >= $2 AND project_id = $3`,
          [newColumnId, newPosition, projectId]
        );
      }

      // Update the task
      await client.query(
        `UPDATE kanban_tasks
         SET column_id = $1, position = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND project_id = $4`,
        [newColumnId, newPosition, taskId, projectId]
      );

      await client.query('COMMIT');
      return await this.findById(taskId, projectId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = KanbanTask;

