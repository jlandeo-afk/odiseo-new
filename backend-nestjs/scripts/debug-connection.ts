import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function debugConn() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASS || 'postgres';
  const database = process.env.DB_NAME || 'odiseo';

  console.log(`Config: host=${host}, port=${port}, user=${user}, database=${database}`);

  const client = new Client({ host, port, user, password, database });
  try {
    await client.connect();
    console.log('🔌 Connected!');
    
    const dbName = await client.query('SELECT current_database()');
    console.log('Current DB:', dbName.rows[0]);

    const tables = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_name = 'companies'
    `);
    console.log('Tables named companies:', tables.rows);

    for (const t of tables.rows) {
      const cols = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = 'companies'
      `, [t.table_schema]);
      console.log(`Columns in ${t.table_schema}.companies:`, cols.rows);

      const rows = await client.query(`SELECT * FROM "${t.table_schema}"."companies"`);
      console.log(`Rows in ${t.table_schema}.companies:`, rows.rows);
    }
  } catch (err) {
    console.error('Conn failed:', err);
  } finally {
    await client.end();
  }
}

debugConn();
