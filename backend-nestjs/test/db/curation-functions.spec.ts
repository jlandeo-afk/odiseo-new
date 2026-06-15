/**
 * T038 [US4] — Database Tests: Curation Functions Return Void (CR-005)
 *
 * Pruebas que garantizan que las funciones PostgreSQL de actualización
 * de estados de curaduría retornan estrictamente VOID.
 *
 * Estas pruebas requieren una conexión activa a PostgreSQL.
 * En CI, se ejecutan contra el contenedor de PostgreSQL del docker-compose.
 */
import { DataSource } from 'typeorm';

describe('PostgreSQL Curation Functions — Strict VOID Return (CR-005)', () => {
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
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const CURATION_FUNCTIONS = [
    'fn_manual_curation_remove',
    'fn_manual_curation_regenerate',
    'fn_manual_curation_complete',
    'fn_auto_curation_complete',
  ];

  CURATION_FUNCTIONS.forEach((fnName) => {
    it(`should confirm ${fnName} returns VOID in pg_proc`, async () => {
      const result = await dataSource.query(`
        SELECT
          p.proname AS function_name,
          pg_catalog.format_type(p.prorettype, NULL) AS return_type
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = $1
          AND n.nspname = 'public'
      `, [fnName]);

      expect(result).toHaveLength(1);
      expect(result[0].return_type).toBe('void');
    });
  });

  it('should confirm all 4 curation functions exist in the database', async () => {
    const result = await dataSource.query(`
      SELECT p.proname AS function_name
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE p.proname IN ('fn_manual_curation_remove', 'fn_manual_curation_regenerate', 'fn_manual_curation_complete', 'fn_auto_curation_complete')
        AND n.nspname = 'public'
      ORDER BY p.proname
    `);

    expect(result).toHaveLength(4);
    const names = result.map((r: any) => r.function_name);
    CURATION_FUNCTIONS.forEach(fn => {
      expect(names).toContain(fn);
    });
  });

  it('should confirm curation functions do NOT return SETOF or TABLE types', async () => {
    const result = await dataSource.query(`
      SELECT p.proname, p.proretset
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE p.proname IN ('fn_manual_curation_remove', 'fn_manual_curation_regenerate', 'fn_manual_curation_complete', 'fn_auto_curation_complete')
        AND n.nspname = 'public'
    `);

    result.forEach((row: any) => {
      // proretset = false means it does NOT return a set
      expect(row.proretset).toBe(false);
    });
  });
});
