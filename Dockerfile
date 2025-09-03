# ---------- Build (Vite) ----------
FROM registry.access.redhat.com/ubi9/nodejs-20 AS build
WORKDIR /opt/app-root/src

# 1) Instalar deps SIN scripts (no dispara postinstall)
COPY package*.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts

# 2) Copiar el código y recién ahí construir
COPY . .
RUN npm run build

# ---------- Runtime (NGINX no-root) ----------
FROM registry.access.redhat.com/ubi9/nginx-120

USER 0
COPY default.conf /etc/nginx/conf.d/default.conf
RUN mkdir -p /tmp/nginx_cache/client_body /tmp/nginx_cache/proxy \
             /tmp/nginx_cache/fastcgi /tmp/nginx_cache/uwsgi /tmp/nginx_cache/scgi \
 && rm -rf /usr/share/nginx/html/* \
 && chown -R 1001:0 /usr/share/nginx/html /var/cache/nginx /var/log/nginx \
                   /etc/nginx/conf.d /tmp/nginx_cache
USER 1001

COPY --from=build /opt/app-root/src/dist/ /usr/share/nginx/html/
EXPOSE 8080
