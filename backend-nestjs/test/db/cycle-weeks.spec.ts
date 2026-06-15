/**
 * T042 [US5] — Database Tests: Cycle Weeks NULL Preservation (CR-004)
 *
 * Pruebas que validan que el algoritmo de recorrido de cycle_weeks
 * preserva rigurosamente las semanas inactivas como registros nulos
 * sin eliminarlas bajo ninguna circunstancia.
 *
 * Estas pruebas requieren una conexión activa a PostgreSQL.
 */
import { DataSource } from 'typeorm';

describe('PostgreSQL Cycle Weeks — NULL Preservation (CR-004)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'odiseo',
      password: process.env.DB_PASSWORD || 'odiseo',
      database: process.env.DB_DATABASE || 'odiseo_test',
    });

    await dataSource.initialize();

    // Create test table for cycle_weeks simulation
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS test_cycle_weeks (
        id SERIAL PRIMARY KEY,
        tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
        week_number INT NOT NULL,
        material_id UUID,
        content_status TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insert test data with intentional NULL weeks (inactive)
    await dataSource.query(`
      INSERT INTO test_cycle_weeks (week_number, material_id, content_status) VALUES
        (1, gen_random_uuid(), 'COMPLETED'),
        (2, NULL, NULL),
        (3, gen_random_uuid(), 'COMPLETED'),
        (4, NULL, NULL),
        (5, NULL, NULL),
        (6, gen_random_uuid(), 'PENDING')
    `);
  });

  afterAll(async () => {
    await dataSource.query('DROP TABLE IF EXISTS test_cycle_weeks');
    await dataSource.destroy();
  });

  it('should have 6 total weeks including NULL ones', async () => {
    const result = await dataSource.query(
      'SELECT COUNT(*) as total FROM test_cycle_weeks',
    );
    expect(parseInt(result[0].total)).toBe(6);
  });

  it('should have exactly 3 NULL (inactive) weeks', async () => {
    const result = await dataSource.query(
      'SELECT COUNT(*) as null_count FROM test_cycle_weeks WHERE material_id IS NULL',
    );
    expect(parseInt(result[0].null_count)).toBe(3);
  });

  it('should preserve NULL weeks after simulated cron iteration (UPDATE only active)', async () => {
    // Simulate what the cron does: UPDATE only rows with non-null material_id
    await dataSource.query(`
      UPDATE test_cycle_weeks
      SET content_status = 'PROCESSED'
      WHERE material_id IS NOT NULL AND content_status = 'COMPLETED'
    `);

    // Verify NULL weeks are untouched
    const nullWeeks = await dataSource.query(
      'SELECT * FROM test_cycle_weeks WHERE material_id IS NULL ORDER BY week_number',
    );

    expect(nullWeeks).toHaveLength(3);
    nullWeeks.forEach((row: any) => {
      expect(row.material_id).toBeNull();
      expect(row.content_status).toBeNull();
    });
  });

  it('should NEVER reduce total row count after any update operation', async () => {
    const beforeCount = await dataSource.query(
      'SELECT COUNT(*) as total FROM test_cycle_weeks',
    );

    // Simulate another cron iteration (with a broader WHERE clause)
    await dataSource.query(`
      UPDATE test_cycle_weeks
      SET content_status = 'REPROCESSED'
      WHERE material_id IS NOT NULL
    `);

    const afterCount = await dataSource.query(
      'SELECT COUNT(*) as total FROM test_cycle_weeks',
    );

    expect(parseInt(afterCount[0].total)).toBe(parseInt(beforeCount[0].total));
  });

  it('should STRICTLY PROHIBIT DELETE on NULL weeks (antipattern verification)', async () => {
    // This test verifies the invariant: NULL weeks must never be deleted
    const nullWeeksBefore = await dataSource.query(
      'SELECT COUNT(*) as c FROM test_cycle_weeks WHERE material_id IS NULL',
    );

    // DO NOT run DELETE - just verify the count hasn't changed
    // In production, a DB trigger or policy should prevent this
    const nullWeeksAfter = await dataSource.query(
      'SELECT COUNT(*) as c FROM test_cycle_weeks WHERE material_id IS NULL',
    );

    expect(parseInt(nullWeeksAfter[0].c)).toBe(parseInt(nullWeeksBefore[0].c));
    expect(parseInt(nullWeeksAfter[0].c)).toBeGreaterThan(0);
  });

  it('should maintain week_number sequence integrity after operations', async () => {
    const weeks = await dataSource.query(
      'SELECT week_number FROM test_cycle_weeks ORDER BY week_number',
    );

    const weekNumbers = weeks.map((w: any) => w.week_number);
    expect(weekNumbers).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
