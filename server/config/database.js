const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'itforge',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err);
  console.error('💡 Check if PostgreSQL is running: sudo systemctl status postgresql');
  process.exit(-1);
});

// Initialize database tables
const initializeDatabase = async () => {
  try {
    // Test connection first
    await pool.query('SELECT NOW()');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on email for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 PostgreSQL connection refused. Is PostgreSQL running?');
      console.error('   Try: sudo systemctl start postgresql');
    } else if (error.code === '3D000') {
      console.error('💡 Database does not exist. Create it with:');
      console.error(`   createdb -U ${process.env.DB_USER || 'postgres'} ${process.env.DB_NAME || 'itforge'}`);
    } else if (error.code === '28P01') {
      console.error('💡 Authentication failed. Check DB_USER and DB_PASSWORD in .env');
    }
    throw error;
  }
};

module.exports = { pool, initializeDatabase };

