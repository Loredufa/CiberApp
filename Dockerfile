# ---------- Build (Vite) ----------
FROM registry.access.redhat.com/ubi9/nodejs-20 AS build
WORKDIR /opt/app-root/src

# Instalar deps SIN scripts (evita postinstall -> vite build sin código)
COPY package*.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts

# Copiar código y construir
COPY . .
RUN npm run build


# ---------- Runtime (NGINX UBI9, SCC restricted friendly) ----------
FROM registry.access.redhat.com/ubi9/nginx-120
USER 0
COPY nginx/zz_app.conf /opt/app-root/etc/nginx.default.d/zz_app.conf
COPY --from=build /opt/app-root/src/dist/ /usr/share/nginx/html/
RUN set -eux; \
    find /usr/share/nginx/html -type d -exec chmod 0755 {} \; ; \
    find /usr/share/nginx/html -type f -exec chmod 0644 {} \; ; \
    mkdir -p /tmp/nginx_cache/client_body /tmp/nginx_cache/proxy /tmp/nginx_cache/fastcgi /tmp/nginx_cache/uwsgi /tmp/nginx_cache/scgi \
             /var/cache/nginx /var/log/nginx /opt/app-root/etc/nginx.default.d ; \
    chmod -R 1777 /tmp/nginx_cache ; \
    chgrp -R 0 /opt/app-root/etc /var/cache/nginx /var/log/nginx /tmp/nginx_cache ; \
    chmod -R g+rwX /opt/app-root/etc /var/cache/nginx /var/log/nginx /tmp/nginx_cache
EXPOSE 8080

