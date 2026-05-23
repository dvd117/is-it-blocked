process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaughtException', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandledRejection', reason);
  process.exit(1);
});
require('./server.js');
