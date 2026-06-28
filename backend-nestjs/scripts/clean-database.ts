import { Client } from 'pg';

async function clean() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'odiseo',
  });

  try {
    await client.connect();
    console.log('🔌 Connected to PostgreSQL database for cleanup...');

    // 1. Get all schemas starting with 'tenant_'
    const res = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'tenant_%'
    `);

    for (const row of res.rows) {
      const schemaName = row.schema_name;
      console.log(`🗑️ Dropping schema: ${schemaName}`);
      await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    }

    // 2. Drop public tables
    const publicTables = ['companies', 'courses', 'topics', 'subtopics', 'questions'];
    for (const table of publicTables) {
      console.log(`🗑️ Dropping public table: ${table}`);
      await client.query(`DROP TABLE IF EXISTS public."${table}" CASCADE`);
    }

    console.log('✨ Cleanup complete! Database is clean.');
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
  } finally {
    await client.end();
  }
}

clean();
