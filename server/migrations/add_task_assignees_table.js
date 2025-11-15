/**
 * Migration script to add kanban_task_assignees table for multiple assignees
 * 
 * This script creates a junction table to support multiple users assigned to a task.
 * 
 * Run with: node server/migrations/add_task_assignees_table.js
 */

const { pool } = require('../config/database');
require('dotenv').config();

const addTaskAssigneesTable = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create kanban_task_assignees table
    console.log('📦 Creating kanban_task_assignees table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS kanban_task_assignees (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES kanban_tasks(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(task_id, user_id)
      )
    `);

    // Create indexes
    console.log('📦 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_kanban_task_assignees_task_id ON kanban_task_assignees(task_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_kanban_task_assignees_user_id ON kanban_task_assignees(user_id)
    `);

    // Migrate existing assigned_to data to new table
    console.log('📦 Migrating existing assigned_to data...');
    await client.query(`
      INSERT INTO kanban_task_assignees (task_id, user_id)
      SELECT id, assigned_to
      FROM kanban_tasks
      WHERE assigned_to IS NOT NULL
      ON CONFLICT (task_id, user_id) DO NOTHING
    `);

    // Note: We'll keep the assigned_to column for now for backward compatibility
    // It can be removed in a future migration if needed

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
  addTaskAssigneesTable()
    .then(() => {
      console.log('✅ Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = addTaskAssigneesTable;

