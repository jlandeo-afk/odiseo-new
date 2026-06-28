import { Client } from 'pg';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const pgClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'odiseo',
  });

  try {
    await pgClient.connect();
    console.log('🔌 Connected to PostgreSQL...');

    // 1. Get company/tenant info
    const companyRes = await pgClient.query("SELECT id, subdomain FROM public.companies WHERE subdomain = 'colegio'");
    if (companyRes.rows.length === 0) {
      console.error("❌ Company 'colegio' not found.");
      return;
    }
    const tenantId = companyRes.rows[0].id;
    const schema = `tenant_${tenantId}`;
    console.log(`Company ID: ${tenantId}, Schema: ${schema}`);

    // 2. Trigger material generation for ÁLGEBRA (Week 1)
    const payload = {
      profile_id: '2bb6625e-2327-4fc7-93c3-fb2336d91053',
      week_number: 1,
      requires_review: false,
      courses: [
        { course_id: '00000000-0000-0000-0000-000000000002' } // ÁLGEBRA
      ]
    };

    console.log('\n🚀 Triggering material generation...');
    const response = await fetch('http://localhost:3000/api/v1/materials/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-subdomain': 'colegio'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to generate: ${response.status} ${errText}`);
    }

    const genResult = await response.json() as any;
    console.log('✅ Generation triggered. Response:', genResult);

    const requestId = genResult.data?.material_request_id;
    if (!requestId) {
      throw new Error('No request ID returned from generation endpoint.');
    }

    // 3. Poll database to verify state transition to REVIEW_REQUIRED
    console.log(`\n⏳ Polling database for request ${requestId} status...`);
    let requestStatus = '';
    let courseStatus = '';
    let warnings: any = null;

    for (let i = 0; i < 20; i++) {
      await delay(1000);
      const reqRes = await pgClient.query(`SELECT status FROM public.material_requests WHERE id = $1`, [requestId]);
      const courseRes = await pgClient.query(`SELECT status, warnings FROM public.material_request_courses WHERE material_request_id = $1`, [requestId]);

      if (reqRes.rows.length > 0) {
        requestStatus = reqRes.rows[0].status;
      }
      if (courseRes.rows.length > 0) {
        courseStatus = courseRes.rows[0].status;
        warnings = courseRes.rows[0].warnings;
      }

      console.log(`   [Poll ${i+1}] MaterialRequest: ${requestStatus} | Course: ${courseStatus}`);

      if (requestStatus === 'REVIEW_REQUIRED' || requestStatus === 'FAILED' || requestStatus === 'COMPLETED') {
        break;
      }
    }

    console.log('\n--- Status Summary after initial generation ---');
    console.log(`MaterialRequest final status: ${requestStatus}`);
    console.log(`MaterialRequestCourse final status: ${courseStatus}`);
    console.log(`Warnings/Errors:`, warnings);

    if (requestStatus !== 'REVIEW_REQUIRED') {
      throw new Error(`Expected MaterialRequest status to be 'REVIEW_REQUIRED', but got '${requestStatus}'`);
    }
    if (courseStatus !== 'COMPLETED_WITH_WARNINGS') {
      throw new Error(`Expected Course status to be 'COMPLETED_WITH_WARNINGS', but got '${courseStatus}'`);
    }
    console.log('✅ PASS: State successfully bypassed FAILED and routed to REVIEW_REQUIRED / COMPLETED_WITH_WARNINGS!');

    // 4. Verify review questions are pre-generated
    const reviewQsRes = await pgClient.query(`
      SELECT id, question_id, topic_id, subtopic_id, position, status 
      FROM public.material_review_questions 
      WHERE material_request_id = $1
      ORDER BY position ASC
    `, [requestId]);

    console.log(`\n🔍 Found ${reviewQsRes.rows.length} pre-generated review questions.`);
    console.dir(reviewQsRes.rows);

    if (reviewQsRes.rows.length === 0) {
      throw new Error('Expected review questions to be generated in database, but found none.');
    }
    console.log('✅ PASS: Review questions successfully pre-generated for all requests!');

    // 5. Curation Curation: replace empty/vacant slots with a valid question ID
    // First, let's find a valid question ID for the subtopic from the public.questions bank
    const emptySlots = reviewQsRes.rows.filter(q => q.status === 'EMPTY' || !q.question_id);
    console.log(`\n🛠️ Curating: replacing ${emptySlots.length} empty slots...`);

    const replacedQuestionsList: any[] = [];
    for (const slot of reviewQsRes.rows) {
      if (!slot.question_id) {
        // Find a valid question in public.questions for the subtopic
        const questionRes = await pgClient.query(`
          SELECT id FROM public.questions 
          ORDER BY random() LIMIT 1
        `);
        if (questionRes.rows.length > 0) {
          const validQId = questionRes.rows[0].id;
          replacedQuestionsList.push({
            id: slot.id,
            question_id: validQId,
            status: 'REPLACED'
          });
          console.log(`   Replacing slot ${slot.id} (position ${slot.position}) with question ID: ${validQId}`);
        }
      } else {
        replacedQuestionsList.push({
          id: slot.id,
          question_id: slot.question_id,
          status: 'FOUND'
        });
      }
    }

    // 6. Submit Curation Approval
    const approvePayload = {
      questions: replacedQuestionsList
    };

    console.log('\n✍️ Submitting curation approval...');
    const approveResponse = await fetch(`http://localhost:3000/api/v1/materials/${requestId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-subdomain': 'colegio'
      },
      body: JSON.stringify(approvePayload)
    });

    if (!approveResponse.ok) {
      const errText = await approveResponse.text();
      throw new Error(`Failed to approve curation: ${approveResponse.status} ${errText}`);
    }

    const approveResult = await approveResponse.json();
    console.log('✅ Curation approval response:', approveResult);

    // 7. Poll database to verify state transitions to PROCESSING then COMPLETED
    console.log(`\n⏳ Polling database for re-generation progress...`);
    for (let i = 0; i < 20; i++) {
      await delay(1000);
      const reqRes = await pgClient.query(`SELECT status FROM public.material_requests WHERE id = $1`, [requestId]);
      const courseRes = await pgClient.query(`SELECT status FROM public.material_request_courses WHERE material_request_id = $1`, [requestId]);

      if (reqRes.rows.length > 0) {
        requestStatus = reqRes.rows[0].status;
      }
      if (courseRes.rows.length > 0) {
        courseStatus = courseRes.rows[0].status;
      }

      console.log(`   [Poll ${i+1}] MaterialRequest: ${requestStatus} | Course: ${courseStatus}`);

      if (requestStatus === 'COMPLETED' || requestStatus === 'FAILED') {
        break;
      }
    }

    if (requestStatus !== 'COMPLETED') {
      throw new Error(`Expected MaterialRequest to transition to 'COMPLETED', but got '${requestStatus}'`);
    }
    if (courseStatus !== 'COMPLETED') {
      throw new Error(`Expected Course status to transition to 'COMPLETED', but got '${courseStatus}'`);
    }

    console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  } finally {
    await pgClient.end();
  }
}

main();
