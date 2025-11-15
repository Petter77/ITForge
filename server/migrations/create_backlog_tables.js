const { pool } = require('../config/database');

const createBacklogTables = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create sprints table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sprints (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        goal TEXT,
        start_date DATE,
        end_date DATE,
        status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create backlog_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS backlog_items (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        sprint_id INTEGER REFERENCES sprints(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) DEFAULT 'story' CHECK (type IN ('story', 'bug', 'task', 'epic')),
        priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        story_points INTEGER,
        status VARCHAR(50) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
        position INTEGER DEFAULT 0,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create backlog_item_assignees table (many-to-many)
    await client.query(`
      CREATE TABLE IF NOT EXISTS backlog_item_assignees (
        id SERIAL PRIMARY KEY,
        backlog_item_id INTEGER NOT NULL REFERENCES backlog_items(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(backlog_item_id, user_id)
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints(project_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_backlog_items_project_id ON backlog_items(project_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_backlog_items_sprint_id ON backlog_items(sprint_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_backlog_items_status ON backlog_items(status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_backlog_items_position ON backlog_items(project_id, position)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_backlog_item_assignees_item_id ON backlog_item_assignees(backlog_item_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_backlog_item_assignees_user_id ON backlog_item_assignees(user_id)
    `);

    await client.query('COMMIT');
    console.log('✅ Backlog tables created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating backlog tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run if called directly
if (require.main === module) {
  createBacklogTables()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createBacklogTables;

