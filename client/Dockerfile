# ==============================================================
# Client Dockerfile – Multi-Stage Production Build (Vite + Nginx)
# ==============================================================
# Stage 1 (builder):  Node-Abhängigkeiten + Vite Production Build
# Stage 2 (production): Nginx serviert den statischen Build
# ==============================================================

# ---- Stage 1: Builder ----
FROM node:22-alpine AS builder

WORKDIR /app

# Abhängigkeiten zuerst installieren (Layer-Caching optimieren)
COPY package.json package-lock.json* ./
RUN npm ci

# Quellcode kopieren und Production Build erzeugen
COPY . .
RUN npm run build


# ---- Stage 2: Production (Nginx) ----
FROM nginx:1.27-alpine AS production

# Eigene Nginx-Konfiguration (SPA-Routing + API-Proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Build-Artefakte aus dem Builder in das Nginx-Root kopieren
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
