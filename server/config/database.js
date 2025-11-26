const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'itforge',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err);
  console.error('💡 Check if PostgreSQL is running: sudo systemctl status postgresql');
  process.exit(-1);
});

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

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

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

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id)
    `);

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

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_project_invitations_pending_unique
      ON project_invitations(project_id, user_id)
      WHERE status = 'pending'
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_project_invitations_user_id ON project_invitations(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON project_invitations(project_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_project_invitations_status ON project_invitations(status)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS kanban_columns (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS kanban_tasks (
        id SERIAL PRIMARY KEY,
        column_id INTEGER NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        position INTEGER NOT NULL DEFAULT 0,
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_kanban_columns_project_id ON kanban_columns(project_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_kanban_tasks_column_id ON kanban_tasks(column_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_kanban_tasks_project_id ON kanban_tasks(project_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_kanban_tasks_assigned_to ON kanban_tasks(assigned_to)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS kanban_task_assignees (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES kanban_tasks(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(task_id, user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_kanban_task_assignees_task_id ON kanban_task_assignees(task_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_kanban_task_assignees_user_id ON kanban_task_assignees(user_id)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('task_assigned', 'backlog_item_assigned', 'invitation')),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        entity_type VARCHAR(50) CHECK (entity_type IN ('kanban_task', 'backlog_item')),
        entity_id INTEGER,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_project_id ON notifications(project_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)
    `);

    await pool.query(`
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

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_requirements_project_id ON requirements(project_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_requirements_type ON requirements(type)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_requirements_priority ON requirements(priority)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS risk_settings (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
        probability_scale JSONB NOT NULL DEFAULT '[]'::jsonb,
        impact_scale JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
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

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_risks_project_id ON risks(project_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_risks_owner_id ON risks(owner_id)
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

