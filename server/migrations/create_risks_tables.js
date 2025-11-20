const { pool } = require('../config/database');

const createRisksTables = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create risk_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS risk_settings (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
        probability_scale JSONB NOT NULL DEFAULT '[]'::jsonb,
        impact_scale JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create risks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS risks (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        probability_value INTEGER NOT NULL,
        probability_label VARCHAR(100) NOT NULL,
        impact_value INTEGER NOT NULL,
        impact_label VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'monitoring', 'resolved', 'closed')),
        response_plan TEXT,
        owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_risks_project_id ON risks(project_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_risks_owner_id ON risks(owner_id)
    `);

    await client.query('COMMIT');
    console.log('✅ Risk tables created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating risk tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run if called directly
if (require.main === module) {
  createRisksTables()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createRisksTables;

