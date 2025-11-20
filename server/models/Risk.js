const { pool } = require('../config/database');

class Risk {
  static async findByProjectId(projectId) {
    const result = await pool.query(
      `SELECT r.*, 
              u.id as created_by_id, u.email as created_by_email,
              u.first_name as created_by_first_name, u.last_name as created_by_last_name,
              owner.first_name as owner_first_name, owner.last_name as owner_last_name
       FROM risks r
       JOIN users u ON r.created_by = u.id
       LEFT JOIN users owner ON r.owner_id = owner.id
       WHERE r.project_id = $1
       ORDER BY r.probability_value * r.impact_value DESC, r.created_at DESC`,
      [projectId]
    );

    return result.rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      description: row.description,
      probabilityValue: row.probability_value,
      probabilityLabel: row.probability_label,
      impactValue: row.impact_value,
      impactLabel: row.impact_label,
      status: row.status,
      responsePlan: row.response_plan,
      owner: row.owner_id ? {
        id: row.owner_id,
        firstName: row.owner_first_name,
        lastName: row.owner_last_name,
      } : null,
      createdBy: {
        id: row.created_by_id,
        email: row.created_by_email,
        firstName: row.created_by_first_name,
        lastName: row.created_by_last_name,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      severityScore: row.probability_value * row.impact_value,
    }));
  }

  static async findById(id, projectId) {
    const result = await pool.query(
      `SELECT r.*, 
              u.id as created_by_id, u.email as created_by_email,
              u.first_name as created_by_first_name, u.last_name as created_by_last_name,
              owner.first_name as owner_first_name, owner.last_name as owner_last_name
       FROM risks r
       JOIN users u ON r.created_by = u.id
       LEFT JOIN users owner ON r.owner_id = owner.id
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
      probabilityValue: row.probability_value,
      probabilityLabel: row.probability_label,
      impactValue: row.impact_value,
      impactLabel: row.impact_label,
      status: row.status,
      responsePlan: row.response_plan,
      owner: row.owner_id ? {
        id: row.owner_id,
        firstName: row.owner_first_name,
        lastName: row.owner_last_name,
      } : null,
      createdBy: {
        id: row.created_by_id,
        email: row.created_by_email,
        firstName: row.created_by_first_name,
        lastName: row.created_by_last_name,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      severityScore: row.probability_value * row.impact_value,
    };
  }

  static async create({ projectId, title, description, probabilityValue, probabilityLabel, impactValue, impactLabel, status, responsePlan, ownerId, createdBy }) {
    const result = await pool.query(
      `INSERT INTO risks (project_id, title, description, probability_value, probability_label, impact_value, impact_label, status, response_plan, owner_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [projectId, title, description || null, probabilityValue, probabilityLabel, impactValue, impactLabel, status || 'open', responsePlan || null, ownerId || null, createdBy]
    );

    return await this.findById(result.rows[0].id, projectId);
  }

  static async update(id, projectId, { title, description, probabilityValue, probabilityLabel, impactValue, impactLabel, status, responsePlan, ownerId }) {
    const result = await pool.query(
      `UPDATE risks 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           probability_value = COALESCE($3, probability_value),
           probability_label = COALESCE($4, probability_label),
           impact_value = COALESCE($5, impact_value),
           impact_label = COALESCE($6, impact_label),
           status = COALESCE($7, status),
           response_plan = COALESCE($8, response_plan),
           owner_id = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND project_id = $11
       RETURNING id`,
      [title, description, probabilityValue, probabilityLabel, impactValue, impactLabel, status, responsePlan, ownerId || null, id, projectId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return await this.findById(id, projectId);
  }

  static async delete(id, projectId) {
    const result = await pool.query(
      `DELETE FROM risks 
       WHERE id = $1 AND project_id = $2
       RETURNING id`,
      [id, projectId]
    );

    return result.rows.length > 0;
  }
}

module.exports = Risk;

