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

    // Create projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create project_members table (for team members and roles)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'member',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, user_id)
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id)
    `);

    // Create project_invitations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_invitations (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        inviter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'member',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create partial unique index for pending invitations only
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_project_invitations_pending_unique 
      ON project_invitations(project_id, user_id) 
      WHERE status = 'pending'
    `);

    // Create indexes for invitations
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_project_invitations_user_id ON project_invitations(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON project_invitations(project_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_project_invitations_status ON project_invitations(status)
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

