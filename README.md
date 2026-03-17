# Task Manager (Freelancer) – Monorepo

Ein Portfolio-Projekt, das Freelancer dabei hilft **Clients**, **Projekte** und **Tasks** zu tracken – inkl. **JWT Auth**, **PostgreSQL**, **Docker** und **Prisma**.

## Projektstruktur

- `client/`: React + TypeScript (Vite)
- `server/`: Node.js + TypeScript (Express) + Prisma
- `docker-compose.yml`: lokale PostgreSQL DB (Container)
- `anki-dependencies.txt`: Anki-Karten zu Dependencies (Tab-separiert)
- `anki-docker.txt`: Anki-Karten zu Docker/Compose (Tab-separiert)

## Voraussetzungen

- Node.js (aktuell bei dir: 20.x)
- Docker Desktop (für Postgres)

## Quickstart (lokal)

### 1) Postgres starten (Docker)

Im Projekt-Root:

```bash
docker-compose up -d
```

Stoppen:

```bash
docker-compose down
```

Wenn du **alle DB-Daten löschen** willst:

```bash
docker-compose down -v
```

### 2) Server starten

```bash
cd server
npm install

# env anlegen (einfach kopieren)
cp .env.example .env

npm run dev
```

Health Check:
- `GET /api/health`

### 3) Client starten

```bash
cd client
npm install
npm run dev
```

Client läuft dann typischerweise auf `http://localhost:5173`.

## Prisma (Datenbank)

### Wo ist das Schema?

- `server/prisma/schema.prisma`

### Migrationen

Wenn du am Schema etwas änderst:

```bash
cd server
npm run db:migrate
```

### Prisma Studio (DB GUI)

```bash
cd server
npm run db:studio
```

Wichtig:
- `server/prisma/` (Schema + Migrations) **kommt ins Git**
- `server/src/generated/prisma/` ist **generiert** und steht in `server/.gitignore`

## Auth (JWT + Refresh Cookie)

### Warum 2 Tokens?

- **Access Token** (kurzlebig): kommt als JSON zurück und wird im Frontend **im RAM** gehalten
- **Refresh Token** (langlebig): wird als **httpOnly Cookie** gesetzt (JS kann ihn nicht lesen)

### Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/profile` (protected, braucht `Authorization: Bearer <accessToken>`)

### Wo passiert was im Code?

Backend:
- `server/src/controllers/auth.controller.ts`: setzt Cookie, validiert Requests (zod)
- `server/src/services/auth.service.ts`: Prisma Queries, bcrypt, jwt.sign/jwt.verify
- `server/src/middleware/auth.middleware.ts`: prüft Access Token (`Bearer ...`)
- `server/src/routes/auth.routes.ts`: Route-Definitionen

Frontend:
- `client/src/api/axios.ts`: Axios-Instanz + Interceptors (Bearer Header + auto refresh)
- `client/src/store/auth.store.ts`: Zustand-Store (login/register/logout/checkAuth)
- `client/src/App.tsx`: Routes (Protected/Guest)

## Dev-Notes

### Warum importiert der Server `.js` obwohl die Datei `.ts` ist?

Der Server nutzt ESModules (`server/package.json` hat `"type": "module"`). TypeScript lässt Import-Pfade beim Build unverändert – deshalb werden in TS-Dateien häufig `.js`-Endungen importiert, damit es nach dem Kompilieren stimmt.

### Wichtige Umgebungsvariablen (Server)

Beispiel siehe `server/.env.example`:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`

