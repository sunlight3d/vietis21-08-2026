#!/bin/bash
set -e

echo "Extracting code on VPS..."
rm -rf /root/deploy-07-08-2026/src
rm -rf /root/deploy-07-08-2026/prisma
rm -rf /root/deploy-07-08-2026/public

cd /root
tar -xzf deploy.tar.gz
cp -a KhoaHocViberCoding10buoi/10-08-2026/. deploy-07-08-2026/

cd /root/deploy-07-08-2026

echo "Updating docker-compose.yml..."
cat << 'EOF' > docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: task_db
    environment:
      POSTGRES_DB: TaskDB
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: Abc123456789
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  web:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: task_web
    ports:
      - "3002:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:Abc123456789@postgres:5432/TaskDB?schema=public
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - JWT_SECRET=vps_super_secret_key_123456
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
    external: true
    name: task-app_postgres_data
EOF

echo "Updating db_push.sh..."
cat << 'EOF' > db_push.sh
#!/bin/bash
docker run --rm -v /root/deploy-07-08-2026/prisma:/app/prisma -v /root/deploy-07-08-2026/prisma.config.ts:/app/prisma.config.ts -w /app --network deploy-07-08-2026_default node:22-alpine sh -c 'npm install prisma dotenv && npx prisma db push --accept-data-loss --url="postgresql://postgres:Abc123456789@postgres:5432/TaskDB?schema=public"'
EOF
chmod +x db_push.sh

echo "Stopping containers..."
docker compose down

echo "Starting Postgres..."
docker compose up -d postgres

echo "Waiting for Postgres to be ready..."
sleep 5

echo "Pushing database schema..."
./db_push.sh

echo "Building and starting Web service..."
docker compose build
docker compose up -d web

echo "Deployment completed successfully!"
