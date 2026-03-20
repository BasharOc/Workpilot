# ==============================================================
# Server Dockerfile – Multi-Stage Production Build
# ==============================================================
# Stage 1 (builder):  alle Abhängigkeiten + TypeScript kompilieren
# Stage 2 (production): nur das kompilierte Artefakt + Prod-Deps
# ==============================================================

# ---- Stage 1: Builder ----
FROM node:22-slim AS builder

WORKDIR /app

# Abhängigkeiten zuerst installieren (Layer-Caching optimieren)
COPY package.json package-lock.json* ./
RUN npm ci

# Quellcode + Konfiguration kopieren
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json tsconfig.build.json prisma.config.ts ./

# Prisma Client für Linux generieren (erzeugt src/generated/prisma/)
RUN npx prisma generate

# TypeScript → JavaScript (Ausgabe: dist/)
RUN npx tsc -p tsconfig.build.json

# Native Prisma Query-Engine Binary nach dist/ kopieren
RUN mkdir -p dist/generated/prisma && \
    find src/generated/prisma -name "*.node" -exec cp {} dist/generated/prisma/ \; || true


# ---- Stage 2: Production ----
FROM node:22-slim AS production

WORKDIR /app

ENV NODE_ENV=production

# Nur Produktions-Abhängigkeiten installieren
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Prisma CLI wird für "prisma migrate deploy" beim Start benötigt
RUN npm install prisma --no-save --prefer-offline 2>/dev/null || npm install prisma --no-save

# Kompiliertes Artefakt aus dem Builder
COPY --from=builder /app/dist ./dist

# Prisma Migrations-Dateien für deploy
COPY prisma ./prisma

EXPOSE 3000

# Migrationen anwenden, dann Server starten
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
