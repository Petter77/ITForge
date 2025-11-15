/**
 * Migration script to remove unused updated_at column from users table
 * 
 * This column was never used in any queries and is safe to remove.
 * 
 * Run with: node server/migrations/remove_users_updated_at.js
 */

const { pool } = require('../config/database');
require('dotenv').config();

const removeUsersUpdatedAt = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if column exists before trying to remove it
    const columnExists = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'updated_at'
    `);

    if (columnExists.rows.length > 0) {
      console.log('🗑️  Removing updated_at column from users table...');
      await client.query('ALTER TABLE users DROP COLUMN IF EXISTS updated_at');
      console.log('✅ Successfully removed updated_at column from users table');
    } else {
      console.log('ℹ️  Column updated_at does not exist in users table (already removed or never existed)');
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
  removeUsersUpdatedAt()
    .then(() => {
      console.log('✅ Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = removeUsersUpdatedAt;

