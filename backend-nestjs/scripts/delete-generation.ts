import { Client } from 'pg';

async function deleteGeneration() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'odiseo',
  });

  try {
    await client.connect();
    console.log('🔌 Connected to PostgreSQL...');

    // Delete question usage history first
    const usageRes = await client.query('DELETE FROM public.material_question_usage');
    console.log(`✅ Successfully deleted all question usage history (${usageRes.rowCount} usage records deleted).`);

    // Delete all material requests (cascades to material_request_courses and material_review_questions)
    const res = await client.query('DELETE FROM public.material_requests');
    console.log(`✅ Successfully deleted all material request history (${res.rowCount} requests deleted).`);

  } catch (err) {
    console.error('❌ Failed to delete request history:', err);
  } finally {
    await client.end();
  }
}

deleteGeneration();
