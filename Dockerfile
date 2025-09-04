# --- Build con Ubuntu (mejor compatibilidad con módulos nativos) ---
FROM node:20-ubuntu AS build

WORKDIR /app

# Actualizar sistema e instalar dependencias
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Variables de entorno
ENV CYPRESS_INSTALL_BINARY=0
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Copiar código completo
COPY package*.json ./
COPY . .

# Instalar dependencias con npm install (más robusto para optional deps)
RUN npm cache clean --force && \
    rm -rf node_modules package-lock.json && \
    npm install --no-audit --no-fund

# El postinstall debería funcionar ahora, pero si no, hacer build manual
RUN npm run build || (echo "Build via postinstall failed, trying direct build..." && npm run build)

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