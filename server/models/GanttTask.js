const { pool } = require('../config/database');

const GanttTask = {
  async findByProjectId(projectId) {
    const result = await pool.query(
      `
        SELECT
          id,
          project_id,
          title,
          description,
          start_date,
          end_date,
          progress,
          status,
          COALESCE(dependencies, '') AS dependencies,
          backlog_item_id,
          created_by,
          created_at,
          updated_at
        FROM gantt_tasks
        WHERE project_id = $1
        ORDER BY start_date ASC, id ASC
      `,
      [projectId]
    );
    return result.rows;
  },

  async findById(id, projectId) {
    const result = await pool.query(
      `SELECT * FROM gantt_tasks WHERE id = $1 AND project_id = $2`,
      [id, projectId]
    );
    return result.rows[0];
  },

  async create(task) {
    const {
      projectId,
      title,
      description,
      startDate,
      endDate,
      progress = 0,
      status = 'planned',
      dependencies,
      backlogItemId,
      userId,
    } = task;

    const result = await pool.query(
      `
        INSERT INTO gantt_tasks (
          project_id,
          title,
          description,
          start_date,
          end_date,
          progress,
          status,
          dependencies,
          backlog_item_id,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `,
      [
        projectId,
        title,
        description || null,
        startDate,
        endDate,
        progress,
        status,
        dependencies || null,
        backlogItemId || null,
        userId,
      ]
    );

    return result.rows[0];
  },

  async update(id, projectId, updates) {
    const existing = await this.findById(id, projectId);
    if (!existing) {
      return null;
    }

    const {
      title = existing.title,
      description = existing.description,
      startDate = existing.start_date,
      endDate = existing.end_date,
      progress = existing.progress,
      status = existing.status,
      dependencies = existing.dependencies,
      backlogItemId =
        typeof updates.backlogItemId === 'undefined'
          ? existing.backlog_item_id
          : updates.backlogItemId,
    } = updates;

    const result = await pool.query(
      `
        UPDATE gantt_tasks
        SET
          title = $1,
          description = $2,
          start_date = $3,
          end_date = $4,
          progress = $5,
          status = $6,
          dependencies = $7,
          backlog_item_id = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9 AND project_id = $10
        RETURNING *
      `,
      [
        title,
        description || null,
        startDate,
        endDate,
        progress,
        status,
        dependencies || null,
        backlogItemId || null,
        id,
        projectId,
      ]
    );

    return result.rows[0];
  },

  async delete(id, projectId) {
    const result = await pool.query(
      `DELETE FROM gantt_tasks WHERE id = $1 AND project_id = $2 RETURNING id`,
      [id, projectId]
    );
    return result.rowCount > 0;
  },
};

module.exports = GanttTask;

