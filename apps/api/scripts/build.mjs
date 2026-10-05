import { build } from 'esbuild';

await build({
  entryPoints: ['src/Server.ts'],
  outfile: 'dist/server.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  tsconfig: 'tsconfig.json',
  // Knex sürücüleri dinamik require ile yüklenir; kullanılmayanları dışarıda bırak.
  external: [
    'better-sqlite3', 'sqlite3', 'mariadb', 'mariadb/callback', 'tedious', 'oracledb', 'pg', 'pg-query-stream', 'mysql', 'pg-native',
    'swagger-ui-express', 'swagger-ui-dist',
  ],
  logLevel: 'info',
});
