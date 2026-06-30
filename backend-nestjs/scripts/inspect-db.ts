import { Client } from 'pg';

async function migratePdfTemplates() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'odiseo',
  });

  await client.connect();

  try {
    // 1. Get all tenant schemas
    const schemasRes = await client.query(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%'
    `);

    console.log(`Found ${schemasRes.rows.length} tenant schema(s)`);

    for (const { schema_name } of schemasRes.rows) {
      const tenantId = schema_name.replace('tenant_', '');
      console.log(`\nProcessing schema: ${schema_name} (tenantId: ${tenantId})`);

      // 2. Ensure table exists in tenant schema
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${schema_name}".pdf_design_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id VARCHAR(255),
          name VARCHAR(255) NOT NULL,
          banner_image_url TEXT,
          watermark_image_url TEXT,
          cover_image_url TEXT,
          show_cover BOOLEAN NOT NULL DEFAULT false,
          primary_title_color VARCHAR(20) NOT NULL DEFAULT '2, 113, 184',
          secondary_title_color VARCHAR(20) NOT NULL DEFAULT '2, 113, 184',
          background_highlight_color VARCHAR(20) NOT NULL DEFAULT '214, 238, 253',
          margin_top VARCHAR(20) NOT NULL DEFAULT '3cm',
          margin_bottom VARCHAR(20) NOT NULL DEFAULT '1.5cm',
          margin_inside VARCHAR(20) NOT NULL DEFAULT '1cm',
          margin_outside VARCHAR(20) NOT NULL DEFAULT '1cm',
          is_book_mode BOOLEAN NOT NULL DEFAULT false,
          font_family VARCHAR(50) NOT NULL DEFAULT 'Arial',
          border_radius VARCHAR(20) NOT NULL DEFAULT '4px',
          content_font_size VARCHAR(20) NOT NULL DEFAULT '11pt',
          content_text_color VARCHAR(20) NOT NULL DEFAULT '#000000',
          blocks_config JSONB,
          header_config JSONB,
          footer_config JSONB,
          is_default BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        )
      `);
      console.log(`  ✓ Table created/verified in ${schema_name}`);

      // 3. Migrate existing templates from public that belong to this tenant
      const migrateRes = await client.query(`
        INSERT INTO "${schema_name}".pdf_design_templates
          (id, tenant_id, name, banner_image_url, watermark_image_url, cover_image_url,
           show_cover, primary_title_color, secondary_title_color, background_highlight_color,
           margin_top, margin_bottom, margin_inside, margin_outside, is_book_mode,
           font_family, border_radius, content_font_size, content_text_color,
           blocks_config, header_config, footer_config, is_default, created_at, updated_at)
        SELECT id, tenant_id, name, banner_image_url, watermark_image_url, cover_image_url,
               show_cover, primary_title_color, secondary_title_color, background_highlight_color,
               margin_top, margin_bottom, margin_inside, margin_outside, is_book_mode,
               font_family, border_radius, content_font_size, content_text_color,
               blocks_config, header_config, footer_config, is_default, created_at, updated_at
        FROM public.pdf_design_templates
        WHERE tenant_id = $1
        ON CONFLICT (id) DO NOTHING
      `, [tenantId]);

      console.log(`  ✓ Migrated ${migrateRes.rowCount} template(s) from public to ${schema_name}`);
    }

    console.log('\n✅ Migration complete. Templates are now in tenant schemas.');
    console.log('\nNote: public.pdf_design_templates can be dropped after verifying everything works.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

migratePdfTemplates();
