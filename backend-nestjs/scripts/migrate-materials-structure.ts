import { Client } from 'pg';
import * as crypto from 'crypto';

async function migrate() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'odiseo',
  });

  try {
    await client.connect();
    console.log('🔌 Connected to odiseo database for materials migration...');

    // 1. Ensure public.materials table exists
    console.log('🛠️ Creating public.materials table if it does not exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.materials (
        id UUID PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL,
        profile_id UUID NOT NULL,
        cycle_id UUID NOT NULL,
        week_number INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        latest_request_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_materials_tenant_profile_week UNIQUE (tenant_id, profile_id, week_number)
      );
    `);

    // 2. Ensure material_id column exists in public.material_requests
    console.log('🛠️ Adding material_id column to public.material_requests...');
    await client.query(`
      ALTER TABLE public.material_requests 
      ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE;
    `);

    // 3. Migrate existing data
    console.log('⚙️ Migrating existing material requests...');
    
    // Check if there are any requests to migrate
    const requestsRes = await client.query(`
      SELECT id, tenant_id, profile_id, cycle_id, week_number, status, created_at, material_id
      FROM public.material_requests
      ORDER BY created_at DESC
    `);

    if (requestsRes.rows.length === 0) {
      console.log('ℹ️ No requests found in public.material_requests.');
      return;
    }

    console.log(`Found ${requestsRes.rows.length} requests in public.material_requests.`);

    // Group requests by (profile_id, week_number)
    const groups: { [key: string]: typeof requestsRes.rows } = {};
    for (const row of requestsRes.rows) {
      const key = `${row.profile_id}_${row.week_number}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(row);
    }

    for (const key of Object.keys(groups)) {
      const groupRows = groups[key];
      const latestRequest = groupRows[0]; // sorted by created_at DESC

      const tenantId = latestRequest.tenant_id;
      const profileId = latestRequest.profile_id;
      const weekNumber = latestRequest.week_number;
      const cycleId = latestRequest.cycle_id;

      // Check if material already exists
      const materialCheck = await client.query(`
        SELECT id FROM public.materials 
        WHERE profile_id = $1 AND week_number = $2
      `, [profileId, weekNumber]);

      let materialId: string;

      if (materialCheck.rows.length > 0) {
        materialId = materialCheck.rows[0].id;
        console.log(`  - Material already exists with ID ${materialId} for profile ${profileId}, week ${weekNumber}.`);
      } else {
        materialId = crypto.randomUUID();
        console.log(`  - Creating new Material ${materialId} for profile ${profileId}, week ${weekNumber}.`);
        await client.query(`
          INSERT INTO public.materials (id, tenant_id, profile_id, cycle_id, week_number, status, latest_request_id, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `, [materialId, tenantId, profileId, cycleId, weekNumber, latestRequest.status, latestRequest.id]);
      }

      // Update all requests in this group to set material_id
      const requestIds = groupRows.map(r => r.id);
      await client.query(`
        UPDATE public.material_requests
        SET material_id = $1
        WHERE id = ANY($2)
      `, [materialId, requestIds]);

      console.log(`    Updated ${requestIds.length} requests with material_id = ${materialId}.`);
    }

    console.log('\n✨ Materials migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();
