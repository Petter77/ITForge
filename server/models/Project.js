const { pool } = require('../config/database');

class Project {
  static async create({ name, description, ownerId }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const projectResult = await client.query(
        `INSERT INTO projects (name, description, owner_id)
         VALUES ($1, $2, $3)
         RETURNING id, name, description, owner_id, created_at, updated_at`,
        [name, description || null, ownerId]
      );

      const project = projectResult.rows[0];

      await client.query(
        `INSERT INTO project_members (project_id, user_id, role)
         VALUES ($1, $2, 'owner')
         ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'owner'`,
        [project.id, ownerId]
      );

      await client.query('COMMIT');

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        ownerId: project.owner_id,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findByUserId(userId) {
    const result = await pool.query(
      `SELECT DISTINCT
        p.id,
        p.name,
        p.description,
        p.owner_id,
        p.created_at,
        p.updated_at,
        pm.role,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
       FROM projects p
       INNER JOIN project_members pm ON p.id = pm.project_id
       WHERE pm.user_id = $1
       ORDER BY p.updated_at DESC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      ownerId: row.owner_id,
      role: row.role,
      memberCount: parseInt(row.member_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  static async findById(projectId, userId) {
    const result = await pool.query(
      `SELECT
        p.id,
        p.name,
        p.description,
        p.owner_id,
        p.created_at,
        p.updated_at,
        pm.role,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
       FROM projects p
       INNER JOIN project_members pm ON p.id = pm.project_id
       WHERE p.id = $1 AND pm.user_id = $2`,
      [projectId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      ownerId: row.owner_id,
      role: row.role,
      memberCount: parseInt(row.member_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static async update(projectId, userId, { name, description }) {
    const project = await this.findById(projectId, userId);
    if (!project || (project.role !== 'owner' && project.role !== 'admin')) {
      throw new Error('Tylko właściciel lub administrator projektu może zaktualizować projekt');
    }

    const result = await pool.query(
      `UPDATE projects
       SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, name, description, owner_id, created_at, updated_at`,
      [name, description || null, projectId]
    );

    return result.rows[0];
  }

  static async delete(projectId, userId) {
    const project = await this.findById(projectId, userId);
    if (!project || project.role !== 'owner') {
      throw new Error('Tylko właściciel projektu może usunąć projekt');
    }

    const projectData = await pool.query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
    if (projectData.rows.length === 0 || projectData.rows[0].owner_id !== userId) {
      throw new Error('Tylko właściciel projektu może usunąć projekt');
    }

    await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
    return true;
  }
}

module.exports = Project;

