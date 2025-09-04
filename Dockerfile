# --- Build (Vite) con Debian/glibc ---
FROM node:20-bookworm-slim AS build

WORKDIR /app

# Instalar dependencias del sistema necesarias para compilación nativa
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Configurar npm para evitar problemas con dependencias opcionales
ENV CYPRESS_INSTALL_BINARY=0
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias SIN ejecutar scripts (evita el postinstall problemático)
RUN npm cache clean --force && \
    npm ci --no-audit --no-fund --ignore-scripts

# Copiar todo el código fuente
COPY . .

# Hacer el build explícitamente
RUN npm run build

# --- Runtime (NGINX) ---
FROM nginx:1.25-alpine

# Copiar configuración personalizada de nginx para OpenShift
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copiar archivos estáticos
COPY --from=build /app/dist/ /usr/share/nginx/html/

# Configurar nginx para OpenShift (sin root)
RUN chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid && \
    ln -sf /dev/stdout /var/log/nginx/access.log && \
    ln -sf /dev/stderr /var/log/nginx/error.log

USER nginx

EXPOSE 8080