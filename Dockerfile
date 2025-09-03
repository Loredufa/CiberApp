# -------- Etapa 1: Build (Node) --------
FROM node:20-alpine AS build
WORKDIR /app

# 1) Copiá solo manifest para cache de dependencias
COPY package*.json ./

# 2) Instalá deps (incluye devDeps) sin correr scripts (evita postinstall)
RUN npm ci --no-audit --no-fund --ignore-scripts

# 3) Ahora sí copiá el código fuente y construí
COPY . .
RUN npm run build

# -------- Etapa 2: Runtime (NGINX UBI para OpenShift) --------
FROM registry.access.redhat.com/ubi9/nginx-120

# Copiá el build al docroot
COPY --from=build /app/dist/ /opt/app-root/src/

# NGINX 8080 + SPA fallback + temporales en /tmp
COPY default.conf /etc/nginx/conf.d/default.conf



