# --- Build con Debian completo (no slim) ---
FROM node:20-bookworm AS build

WORKDIR /app

# Variables de entorno
ENV CYPRESS_INSTALL_BINARY=0
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# La imagen bookworm completa ya tiene python3, make y g++ instalados
# pero los instalamos por si acaso
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copiar código completo
COPY package*.json ./
COPY . .

# Instalar dependencias
RUN npm cache clean --force && \
    rm -rf node_modules package-lock.json && \
    npm install --no-audit --no-fund

# Build (debería funcionar con el postinstall, pero backup manual)
RUN npm run build || (echo "Postinstall build failed, trying manual..." && npm run build)

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