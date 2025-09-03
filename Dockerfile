# ---------- Build (Vite) ----------
FROM registry.access.redhat.com/ubi9/nodejs-20 AS build
WORKDIR /opt/app-root/src

# Instala deps
COPY package*.json ./
RUN npm ci

# Copia fuentes y build
COPY . .
# OPCIONAL: si usás .env.production con VITE_* reales, ya queda embebido en el build
RUN npm run build

# ---------- Runtime (NGINX no-root) ----------
FROM registry.access.redhat.com/ubi9/nginx-120

# Copia config y ajusta permisos para SCC restricted
USER 0
COPY default.conf /etc/nginx/conf.d/default.conf
RUN mkdir -p /tmp/nginx_cache/client_body /tmp/nginx_cache/proxy \
    /tmp/nginx_cache/fastcgi /tmp/nginx_cache/uwsgi /tmp/nginx_cache/scgi \
 && rm -rf /usr/share/nginx/html/* \
 && chown -R 1001:0 /usr/share/nginx/html /var/cache/nginx /var/log/nginx \
                  /etc/nginx/conf.d /tmp/nginx_cache
USER 1001

# Copia el build estático
COPY --from=build /opt/app-root/src/dist/ /usr/share/nginx/html/

EXPOSE 8080


