#!/bin/bash
docker run --rm -v "$PWD/prisma":/app/prisma -v "$PWD/prisma.config.ts":/app/prisma.config.ts -w /app --network task_app_21_08_2026_default node:22-alpine sh -c 'npm install prisma dotenv @prisma/client @prisma/adapter-pg pg && npx prisma db push --accept-data-loss'
