# --- Build (Vite) con Debian/glibc ---
FROM node:20-bookworm-slim AS build
WORKDIR /app

# copiá TODO antes del ci para que postinstall encuentre index.html
COPY package*.json ./
COPY . .

# instala deps + optional + corre postinstall (vite build)
RUN npm ci --no-audit --no-fund

# --- Runtime (NGINX) ---
FROM nginx:1.25-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/
RUN ln -sf /dev/stdout /var/log/nginx/access.log \
 && ln -sf /dev/stderr /var/log/nginx/error.log
EXPOSE 8080


