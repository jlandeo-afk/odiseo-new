import { Client } from 'pg';

async function inspectErrors() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'odiseo',
  });

  try {
    await client.connect();
    
    // Find the company schema
    const schemas = await client.query(`
      SELECT schema_name FROM information_schema.schemata 
      WHERE schema_name LIKE 'tenant_%'
    `);
    const tenantSchema = schemas.rows[0].schema_name;

    // Get the latest cycle
    const cycleRes = await client.query(`
      SELECT id, name FROM "${tenantSchema}".cycles ORDER BY created_at DESC LIMIT 1
    `);
    if (cycleRes.rows.length === 0) {
      console.log('No cycle found.');
      return;
    }
    const cycle = cycleRes.rows[0];
    console.log(`🔍 Inspecting latest cycle: ${cycle.name} (${cycle.id})`);

    // Let's get the syllabus distributions for the failed courses
    const failedCourses = ['ÁLGEBRA', 'ANATOMÍA', 'LENGUAJE'];
    for (const courseName of failedCourses) {
      console.log(`\n--- Distribution for ${courseName} ---`);
      const courseRes = await client.query(`
        SELECT id FROM public.courses WHERE name = $1
      `, [courseName]);
      if (courseRes.rows.length === 0) continue;
      const courseId = courseRes.rows[0].id;

      // Find syllabus for this course and cycle
      const syllabusRes = await client.query(`
        SELECT id FROM public.syllabus WHERE course_id = $1 AND cycle_id = $2
      `, [courseId, cycle.id]);
      if (syllabusRes.rows.length === 0) {
        console.log(`No syllabus found for ${courseName}`);
        continue;
      }
      const syllabusId = syllabusRes.rows[0].id;

      // Find distributions for week 1
      const dists = await client.query(`
        SELECT id, topic_id, subtopic_id, week_number, weight 
        FROM public.syllabus_distribution
        WHERE syllabus_id = $1 AND week_number = 1
      `, [syllabusId]);

      console.dir(dists.rows, { depth: null });
      
      // For each distribution, check how many questions are in odiseo database
      for (const d of dists.rows) {
        const qCount = await client.query(`
          SELECT count(*)::int as total FROM public.questions 
          WHERE subtopic_id = $1
        `, [d.subtopic_id]);
        
        console.log(`   Database 'public.questions' has ${qCount.rows[0].total} questions for subtopic_id: '${d.subtopic_id}' (requested: ${d.weight})`);
      }
    }

  } catch (err) {
    console.error('Inspection failed:', err);
  } finally {
    await client.end();
  }
}

inspectErrors();
