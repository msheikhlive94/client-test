const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gpsztpweqkqvalgsckdd.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwc3p0cHdlcWtxdmFsZ3Nja2RkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc4NzM3MSwiZXhwIjoyMDg1MzYzMzcxfQ.HMJrgLzvk-M2SQMq1949YjJhVthat5vn0DVO8Fpm5mo'

async function fixView() {
  // Use pg directly since Supabase JS client can't run DDL
  const { Pool } = require('pg')
  
  // Extract project ref from URL
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)[1]
  
  // Try different connection formats
  const pool = new Pool({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: supabaseServiceKey,
    ssl: { rejectUnauthorized: false }
  })

  const sql = `
    DROP VIEW IF EXISTS project_stats;
    CREATE VIEW project_stats AS 
    SELECT 
      p.id, 
      p.name, 
      p.status, 
      p.budget_amount, 
      p.hourly_rate, 
      p.estimated_hours,
      (SELECT COALESCE(SUM(duration_minutes), 0) FROM time_entries WHERE project_id = p.id) as total_minutes,
      (SELECT COALESCE(SUM(duration_minutes), 0) / 60.0 FROM time_entries WHERE project_id = p.id) as total_hours,
      (SELECT COALESCE(SUM(CASE WHEN billable THEN duration_minutes ELSE 0 END) / 60.0 * p.hourly_rate, 0) FROM time_entries WHERE project_id = p.id) as billable_amount,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status != 'done') as open_tasks,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as completed_tasks
    FROM projects p;
  `

  try {
    const client = await pool.connect()
    await client.query(sql)
    console.log('✅ project_stats view fixed!')
    client.release()
    await pool.end()
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

fixView()
