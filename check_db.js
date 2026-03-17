const { Pool } = require('pg');
const pool = new Pool({ 
  user: 'cmdb_admin', 
  password: 'cmdb_super_secret_password', 
  host: 'localhost', 
  database: 'core_cmdb', 
  port: 5432 
});

async function check() {
  try {
    const result = await pool.query("SELECT id, asset_tag, type_id, status FROM inventory_assets LIMIT 5");
    console.log('Sample assets:', JSON.stringify(result.rows, null, 2));
    
    // Check columns
    const columns = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'inventory_assets'");
    console.log('Columns:', JSON.stringify(columns.rows, null, 2));
  } catch(e) {
    console.error('DATABASE ERROR:', e.message);
  }
  process.exit();
}
check();
