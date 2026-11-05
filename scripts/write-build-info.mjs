import fs from 'node:fs';
import { publicConfig } from './production-config.mjs';
fs.writeFileSync('build-info.json', JSON.stringify({
  version: process.env.APP_VERSION || 'unreleased',
  revision: process.env.GIT_REVISION || 'unknown',
  public: publicConfig(process.env),
}, null, 2));
