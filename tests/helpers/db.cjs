const path = require('node:path');
const { createTypeScriptLoader } = require('./typescript.cjs');

const sourceFile = path.resolve(__dirname, '../../src/lib/db.ts');

// Execute the actual database module with a fresh singleton for each restart.
// Only Next's server-only boundary is stubbed; SQLite and the filesystem are real.
function loadDatabase(dataDir, workingDir) {
  return createTypeScriptLoader({
    process: { env: { DATA_DIR: dataDir }, cwd: () => workingDir },
  })(sourceFile);
}

module.exports = { loadDatabase };

if (require.main === module) {
  const db = loadDatabase(process.argv[2], process.argv[3]).db();
  console.log(JSON.stringify(db.prepare('SELECT COUNT(*) AS n FROM products').get()));
  db.close();
}
