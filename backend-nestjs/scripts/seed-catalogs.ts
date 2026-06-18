import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function seedCatalogs() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'odiseo',
  });

  try {
    await client.connect();
    console.log('🔌 Connected to PostgreSQL database...');

    // Load JSON files
    const coursesPath = path.join(__dirname, 'data', 'courses.json');
    const topicsPath = path.join(__dirname, 'data', 'topics.json');
    const subtopicsPath = path.join(__dirname, 'data', 'subtopics.json');

    if (!fs.existsSync(coursesPath) || !fs.existsSync(topicsPath) || !fs.existsSync(subtopicsPath)) {
      console.error('❌ Data files not found. Please create scripts/data/courses.json, scripts/data/topics.json, and scripts/data/subtopics.json');
      process.exit(1);
    }

    const coursesData = JSON.parse(fs.readFileSync(coursesPath, 'utf8'));
    const topicsData = JSON.parse(fs.readFileSync(topicsPath, 'utf8'));
    const subtopicsData = JSON.parse(fs.readFileSync(subtopicsPath, 'utf8'));

    // The JSON might be wrapped in an object if it was a DB export, e.g. {"select * from course": [...]}
    // Let's extract the arrays.
    const courses = Array.isArray(coursesData) ? coursesData : Object.values(coursesData)[0] as any[];
    const topics = Array.isArray(topicsData) ? topicsData : Object.values(topicsData)[0] as any[];
    const subtopics = Array.isArray(subtopicsData) ? subtopicsData : Object.values(subtopicsData)[0] as any[];

    console.log(`📦 Found ${courses.length} courses, ${topics.length} topics, and ${subtopics.length} subtopics. Seeding into public schema...`);

    // We will use a transaction for safety
    await client.query('BEGIN');

    // Create tables if they somehow don't exist (though they should)
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.courses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.topics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
      
      CREATE TABLE IF NOT EXISTS public.subtopics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);

    // Insert Courses
    for (const c of courses) {
      const uuid = String(c.id).padStart(12, '0');
      const courseId = `00000000-0000-0000-0000-${uuid}`;
      
      await client.query(
        `INSERT INTO public.courses (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [courseId, c.name]
      );
    }

    // Insert Topics
    for (const t of topics) {
      const uuid = String(t.id).padStart(12, '0');
      const topicId = `00000000-0000-0000-0000-${uuid}`;
      
      const courseUuid = String(t.course_id).padStart(12, '0');
      const courseId = `00000000-0000-0000-0000-${courseUuid}`;

      await client.query(
        `INSERT INTO public.topics (id, name, course_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [topicId, t.name, courseId]
      );
    }

    // Insert Subtopics
    for (const s of subtopics) {
      const uuid = String(s.id).padStart(12, '0');
      const subtopicId = `00000000-0000-0000-0000-${uuid}`;
      
      const topicUuid = String(s.topic_id).padStart(12, '0');
      const topicId = `00000000-0000-0000-0000-${topicUuid}`;

      await client.query(
        `INSERT INTO public.subtopics (id, name, topic_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [subtopicId, s.name, topicId]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Catalogs seeded successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
  } finally {
    await client.end();
  }
}

seedCatalogs();
