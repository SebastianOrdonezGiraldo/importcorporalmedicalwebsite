import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Runs on Linux, with Docker replaced by a command recorder: no real R2 writes.
test('release cancela si falla respaldo y recupera la imagen anterior si falla salud', { skip: process.platform === 'win32' }, (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'icm-release-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'deploy'));
  fs.mkdirSync(path.join(root, 'bin'));
  fs.copyFileSync(fileURLToPath(new URL('../deploy/release.sh', import.meta.url)), path.join(root, 'deploy/release.sh'));
  fs.writeFileSync(path.join(root, 'deploy/production.env'), 'SITE_URL=https://example.com\n');
  fs.writeFileSync(path.join(root, 'bin/docker'), `#!/usr/bin/env bash
set -eu
printf '%s|%s\\n' "$APP_IMAGE" "$*" >> "$TRACE"
if [[ "$1" == image ]]; then printf '%s\\n' "\${@: -1}"; exit 0; fi
shift 3
if [[ "$1" == exec && "\${BACKUP_FAIL:-}" == yes ]]; then exit 1; fi
if [[ "$1" == up && "$APP_IMAGE" == bad ]]; then exit 1; fi
exit 0
`, { mode: 0o755 });
  const trace = path.join(root, 'trace');
  const state = path.join(root, 'deploy/.state');
  const run = (args, extra = {}) => spawnSync('bash', ['deploy/release.sh', ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, ICM_ENV_FILE: path.join(root, 'deploy/production.env'), PATH: `${path.join(root, 'bin')}:${process.env.PATH}`, TRACE: trace, ...extra } });
  assert.equal(run(['up', 'v1']).status, 0);
  assert.equal(fs.readFileSync(path.join(state, 'current'), 'utf8').trim(), 'v1');
  fs.writeFileSync(trace, '');
  assert.equal(run(['up', 'v2'], { BACKUP_FAIL: 'yes' }).status, 1);
  assert.doesNotMatch(fs.readFileSync(trace, 'utf8'), /\|.* up /);
  assert.equal(fs.readFileSync(path.join(state, 'current'), 'utf8').trim(), 'v1');
  fs.writeFileSync(trace, '');
  assert.equal(run(['up', 'bad']).status, 1);
  const events = fs.readFileSync(trace, 'utf8');
  assert.ok(events.indexOf('exec -T web npm run storage:backup') < events.indexOf('bad|compose'));
  assert.match(events, /v1\|compose .* up /);
  assert.equal(fs.readFileSync(path.join(state, 'current'), 'utf8').trim(), 'v1');
  assert.equal(run(['up', 'v2']).status, 0);
  assert.equal(run(['rollback']).status, 0);
  assert.equal(fs.readFileSync(path.join(state, 'current'), 'utf8').trim(), 'v1');
  assert.equal(fs.readFileSync(path.join(state, 'previous'), 'utf8').trim(), 'v2');
  fs.rmSync(path.join(state, 'current'));
  fs.writeFileSync(trace, '');
  assert.equal(run(['up', 'bad']).status, 1);
  assert.match(fs.readFileSync(trace, 'utf8'), / stop web/);
  assert.equal(fs.existsSync(path.join(state, 'current')), false);
  assert.equal(fs.existsSync(path.join(state, 'lock')), false);
});
