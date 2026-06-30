import { Client } from 'pg';

async function findTables() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'odiseo',
  });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_name IN ('materials', 'material_requests', 'material_request_courses', 'material_review_questions', 'material_question_usage')
      ORDER BY table_schema, table_name
    `);
    console.log(res.rows);
  } finally {
    await client.end();
  }
}
findTables();
