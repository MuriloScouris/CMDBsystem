const { Pool } = require('pg');
const pool = new Pool({ 
  user: 'cmdb_admin', 
  password: 'cmdb_super_secret_password', 
  host: 'localhost', 
  database: 'core_cmdb', 
  port: 5432 
});

async function check() {
  const tables = ['inventory_assets', 'users', 'asset_types', 'hardware_models', 'maintenance_logs', 'assignment_history'];
  for (const table of tables) {
    try {
      const columns = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}'`);
      console.log(`Table ${table} columns:`, JSON.stringify(columns.rows.map(c => c.column_name), null, 2));
    } catch(e) {
      console.error(`ERROR on table ${table}:`, e.message);
    }
  }
  process.exit();
}
check();
