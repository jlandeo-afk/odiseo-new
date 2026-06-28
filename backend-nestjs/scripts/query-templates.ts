import { Client } from 'pg';

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'odiseo',
  });

  try {
    await client.connect();

    // Get company/tenant
    const companyRes = await client.query("SELECT id, subdomain, commercial_name FROM public.companies WHERE subdomain = 'colegio'");
    if (companyRes.rows.length === 0) {
      console.log("No company with subdomain 'colegio' found.");
      return;
    }
    const company = companyRes.rows[0];
    const schema = `tenant_${company.id}`;
    console.log(`Tenant schema: ${schema}`);

    // Get cycles
    const cycles = await client.query(`SELECT id, name FROM "${schema}".cycles`);
    console.log("\n--- CYCLES ---");
    console.dir(cycles.rows);

    // Get material templates
    const templates = await client.query(`SELECT id, name, scope FROM "${schema}".cycle_material_templates`);
    console.log("\n--- MATERIAL TEMPLATES ---");
    console.dir(templates.rows);

    // Get template courses
    if (templates.rows.length > 0) {
      for (const t of templates.rows) {
        const tc = await client.query(`
          SELECT tc.id, tc.course_id, c.name as course_name, tc.questions_quantity 
          FROM "${schema}".cycle_material_template_courses tc
          JOIN public.courses c ON c.id = tc.course_id
          WHERE tc.template_id = $1
        `, [t.id]);
        console.log(`\n--- COURSES FOR TEMPLATE: ${t.name} (${t.id}) ---`);
        console.dir(tc.rows);
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
