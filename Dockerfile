# -------- Etapa 1: Build (Node) --------
FROM node:20-alpine AS build
WORKDIR /app
# Instala deps primero (cache eficiente)
COPY package*.json ./
# Asegura devDependencies para Vite
RUN npm ci --no-audit --no-fund
# Copia el código y compila
COPY . .
RUN npm run build

# -------- Etapa 2: Runtime (NGINX UBI para OpenShift) --------
FROM registry.access.redhat.com/ubi9/nginx-120

# Copia el build al docroot que usa la imagen UBI
COPY --from=build /app/dist/ /opt/app-root/src/

# Config NGINX (8080, SPA fallback, temporales en /tmp)
COPY default.conf /etc/nginx/conf.d/default.conf


