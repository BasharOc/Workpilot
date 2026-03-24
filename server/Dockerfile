FROM node:22-slim

WORKDIR /app

# OpenSSL für Prisma Query Engine
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# ALLE Abhängigkeiten installieren (inkl. devDeps für tsc + @types/*)
# NODE_ENV darf hier noch NICHT production sein!
COPY package.json package-lock.json* ./
RUN npm ci

# Quellcode + Konfiguration
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json tsconfig.build.json prisma.config.ts ./

# Prisma Client generieren – Binary in node_modules/.prisma/client/
RUN DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder npx prisma generate

# TypeScript → JavaScript
RUN npx tsc -p tsconfig.build.json

# DevDependencies entfernen (Binary in .prisma/client bleibt erhalten)
RUN npm prune --production

# NODE_ENV erst NACH dem Build setzen
ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

