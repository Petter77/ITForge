/**
 * Migration script to remove kanban tables from database
 * 
 * This script removes kanban_columns and kanban_tasks tables
 * that were created for the Kanban board feature.
 * 
 * Run with: node server/migrations/remove_kanban_tables.js
 */

const { pool } = require('../config/database');
require('dotenv').config();

const removeKanbanTables = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if tables exist
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'kanban%'
    `);

    const existingTables = tablesCheck.rows.map(row => row.table_name);

    if (existingTables.length === 0) {
      console.log('ℹ️  Kanban tables do not exist in database (already removed or never existed)');
      await client.query('COMMIT');
      return;
    }

    console.log(`🗑️  Found ${existingTables.length} kanban table(s) to remove: ${existingTables.join(', ')}`);

    // Drop tables in correct order (child tables first due to foreign key constraints)
    // Order: kanban_task_assignees -> kanban_tasks -> kanban_columns
    const dropOrder = ['kanban_task_assignees', 'kanban_tasks', 'kanban_columns'];
    
    for (const tableName of dropOrder) {
      if (existingTables.includes(tableName)) {
        console.log(`🗑️  Dropping ${tableName} table...`);
        await client.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
        console.log(`✅ Successfully dropped ${tableName} table`);
      }
    }

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
  removeKanbanTables()
    .then(() => {
      console.log('✅ Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = removeKanbanTables;

