import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { productionConfig } from './production-config.mjs';

try {
  const build = JSON.parse(fs.readFileSync('build-info.json', 'utf8'));
  Object.assign(process.env, productionConfig(process.env, build), { APP_VERSION: build.version, GIT_REVISION: build.revision });
  const data = path.resolve(process.env.DATA_DIR || '/app/data');
  fs.mkdirSync(data, { recursive: true });
  fs.accessSync(data, fs.constants.W_OK);
  if (!fs.existsSync(path.join(data, 'app.db')) && process.env.ALLOW_CATALOG_INITIALIZATION !== 'true') {
    throw new Error('Falta app.db en el volumen. Importa el catálogo existente o autoriza explícitamente ALLOW_CATALOG_INITIALIZATION=true.');
  }
  console.log(`Iniciando Import Corporal Medical ${build.version} (${build.revision}).`);
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '0.0.0.0'], { stdio: 'inherit', env: process.env });
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
  child.on('error', () => { console.error('No se pudo iniciar Next.js.'); process.exitCode = 1; });
  child.on('exit', (code, signal) => { process.exitCode = code ?? (signal === 'SIGTERM' || signal === 'SIGINT' ? 0 : 1); });
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Configuración de producción inválida.');
  process.exitCode = 1;
}
