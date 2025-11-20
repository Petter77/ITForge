const { pool } = require('../config/database');

const DEFAULT_PROBABILITY_SCALE = [
  { label: 'Bardzo niskie (1)', value: 1 },
  { label: 'Niskie (2)', value: 2 },
  { label: 'Średnie (3)', value: 3 },
  { label: 'Wysokie (4)', value: 4 },
  { label: 'Bardzo wysokie (5)', value: 5 },
];

const DEFAULT_IMPACT_SCALE = [
  { label: 'Znikomy (1)', value: 1 },
  { label: 'Mały (2)', value: 2 },
  { label: 'Średni (3)', value: 3 },
  { label: 'Duży (4)', value: 4 },
  { label: 'Krytyczny (5)', value: 5 },
];

class RiskSetting {
  static async findByProjectId(projectId) {
    const result = await pool.query(
      `SELECT * FROM risk_settings WHERE project_id = $1`,
      [projectId]
    );

    if (result.rows.length === 0) {
      return await this.createDefault(projectId);
    }

    const row = result.rows[0];
    return {
      id: row.id,
      projectId: row.project_id,
      probabilityScale: row.probability_scale,
      impactScale: row.impact_scale,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static async createDefault(projectId) {
    const result = await pool.query(
      `INSERT INTO risk_settings (project_id, probability_scale, impact_scale)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id) DO UPDATE SET
         probability_scale = EXCLUDED.probability_scale,
         impact_scale = EXCLUDED.impact_scale
       RETURNING *`,
      [projectId, JSON.stringify(DEFAULT_PROBABILITY_SCALE), JSON.stringify(DEFAULT_IMPACT_SCALE)]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      projectId: row.project_id,
      probabilityScale: row.probability_scale,
      impactScale: row.impact_scale,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static async update(projectId, { probabilityScale, impactScale }) {
    const result = await pool.query(
      `INSERT INTO risk_settings (project_id, probability_scale, impact_scale)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id) DO UPDATE SET
         probability_scale = EXCLUDED.probability_scale,
         impact_scale = EXCLUDED.impact_scale,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [projectId, JSON.stringify(probabilityScale), JSON.stringify(impactScale)]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      projectId: row.project_id,
      probabilityScale: row.probability_scale,
      impactScale: row.impact_scale,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

module.exports = { RiskSetting, DEFAULT_PROBABILITY_SCALE, DEFAULT_IMPACT_SCALE };

