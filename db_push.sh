#!/bin/bash
docker run --rm -v /root/deploy-07-08-2026/prisma:/app/prisma -v /root/deploy-07-08-2026/prisma.config.ts:/app/prisma.config.ts -w /app --network deploy-07-08-2026_default node:22-alpine sh -c 'npm install prisma dotenv && npx prisma db push --url="postgresql://postgres:Abc123456789@postgres:5432/TaskDB?schema=public"'
