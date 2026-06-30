import { Client } from 'pg';

async function cleanMaterials() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'odiseo',
  });

  await client.connect();

  try {
    console.log('Cleaning generated materials from public schema...\n');

    // 1. Nullify circular FK: materials.latest_request_id -> material_requests
    let r = await client.query(`UPDATE public.materials SET latest_request_id = NULL`);
    console.log(`  ✓ nullified latest_request_id: ${r.rowCount} rows`);

    // 2. Delete children first, then parents
    const steps: [string, string][] = [
      ['material_question_usage',   'DELETE FROM public.material_question_usage'],
      ['material_review_questions', 'DELETE FROM public.material_review_questions'],
      ['material_request_courses',  'DELETE FROM public.material_request_courses'],
      ['material_requests',         'DELETE FROM public.material_requests'],
      ['materials',                 'DELETE FROM public.materials'],
    ];

    for (const [label, sql] of steps) {
      r = await client.query(sql);
      console.log(`  ✓ ${label}: ${r.rowCount} rows deleted`);
    }

    console.log('\n✅ Done. All generated materials have been cleaned.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

cleanMaterials();
