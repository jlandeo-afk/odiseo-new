import { Client } from 'pg';

async function inspect() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'odiseo',
  });

  try {
    await client.connect();
    console.log('🔌 Connected to odiseo for schema list...');

    const schemas = await client.query(`
      SELECT schema_name FROM information_schema.schemata;
    `);
    console.log('Schemas:', schemas.rows.map(r => r.schema_name));

  } catch (err) {
    console.error('Inspection failed:', err);
  } finally {
    await client.end();
  }
}

inspect();
