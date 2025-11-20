const { pool } = require('../config/database');

const createRequirementsTable = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create requirements table
    await client.query(`
      CREATE TABLE IF NOT EXISTS requirements (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL CHECK (type IN ('functional', 'non-functional')),
        priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'implemented', 'rejected')),
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_requirements_project_id ON requirements(project_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_requirements_type ON requirements(type)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_requirements_priority ON requirements(priority)
    `);

    await client.query('COMMIT');
    console.log('✅ Requirements table created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating requirements table:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run if called directly
if (require.main === module) {
  createRequirementsTable()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createRequirementsTable;

