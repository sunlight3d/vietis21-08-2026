import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const vector = Array(768).fill(0.1);
  const result = await prisma.$queryRaw`
    SELECT id, content FROM "Memory" 
    ORDER BY embedding <=> ${vector}::vector 
    LIMIT 3
  `;
  console.log(result);
}
main().catch(console.error).finally(() => prisma.$disconnect());
