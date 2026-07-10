const app = require("./src/app");
const env = require("./src/config/env");
const prisma = require("./src/config/prisma");
const { startCronJobs } = require("./src/jobs");

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Inventory API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  startCronJobs();
});

async function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
