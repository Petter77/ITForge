/**
 * Migration script to create kanban tables
 * 
 * This script creates kanban_columns and kanban_tasks tables
 * for the Kanban board feature.
 * 
 * Run with: node server/migrations/create_kanban_tables.js
 */

const { pool } = require('../config/database');
require('dotenv').config();

const createKanbanTables = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create kanban_columns table
    console.log('📦 Creating kanban_columns table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS kanban_columns (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, position)
      )
    `);

    // Create kanban_tasks table
    console.log('📦 Creating kanban_tasks table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS kanban_tasks (
        id SERIAL PRIMARY KEY,
        column_id INTEGER NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        position INTEGER NOT NULL DEFAULT 0,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    console.log('📦 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_kanban_columns_project_id ON kanban_columns(project_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_kanban_tasks_column_id ON kanban_tasks(column_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_kanban_tasks_project_id ON kanban_tasks(project_id)
    `);

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run migration if script is executed directly
if (require.main === module) {
  createKanbanTables()
    .then(() => {
      console.log('✅ Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = createKanbanTables;

