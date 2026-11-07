// Manual run:  npm run migrate   (the server also does this automatically on start)
require('../src/migrate')().catch(e => { console.error(e.message); process.exit(1); });
