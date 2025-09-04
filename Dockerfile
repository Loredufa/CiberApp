# --- Build (Vite) ---
FROM node:20-alpine AS build
WORKDIR /app

# 1) deps SIN scripts (no dispara postinstall)
COPY package*.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts

# 2) copiar código y recién ahí construir
COPY . .
RUN npm run build

# --- Runtime (NGINX oficial) ---
FROM nginx:1.25-alpine

# conf propia (escucha 8080 + proxy a n8n)
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# estáticos
COPY --from=build /app/dist/ /usr/share/nginx/html/

# logs a stdout/stderr
RUN ln -sf /dev/stdout /var/log/nginx/access.log \
 && ln -sf /dev/stderr /var/log/nginx/error.log

EXPOSE 8080

