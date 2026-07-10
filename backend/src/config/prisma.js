const { PrismaClient } = require("@prisma/client");

// Singleton Prisma client reused across the process (avoids exhausting connections).
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
