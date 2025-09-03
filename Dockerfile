# ---------- Build (Vite) ----------
FROM registry.access.redhat.com/ubi9/nodejs-20 AS build
WORKDIR /opt/app-root/src

# Instalar deps SIN scripts (evita que corra postinstall antes de tener el código)
COPY package*.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts

# Copiar código y construir
COPY . .
RUN npm run build


# ---------- Runtime (NGINX UBI9, compatible con SCC restricted) ----------
FROM registry.access.redhat.com/ubi9/nginx-120

# Preparar como root para copiar conf y ajustar permisos
USER 0

# 👇 OJO: UBI9 nginx.conf NO incluye /etc/nginx/conf.d/*,
#        sí incluye /opt/app-root/etc/nginx.default.d/*.conf dentro del server por defecto.
# Copiamos nuestro fragmento (nivel "server", SIN 'server { }') a esa carpeta:
COPY nginx/zz_app.conf /opt/app-root/etc/nginx.default.d/zz_app.conf

# Copiar los estáticos generados por Vite al docroot real
COPY --from=build /opt/app-root/src/dist/ /usr/share/nginx/html/

# Permisos para UID aleatorio (SCC restricted)
RUN find /usr/share/nginx/html -type d -exec chmod 0755 {} \; \
 && find /usr/share/nginx/html -type f -exec chmod 0644 {} \; \
 && mkdir -p /tmp/nginx_cache/client_body /tmp/nginx_cache/proxy /tmp/nginx_cache/fastcgi /tmp/nginx_cache/uwsgi /tmp/nginx_cache/scgi \
 && chmod -R 1777 /tmp/nginx_cache \
 && chgrp -R 0 /opt/app-root/etc /var/cache/nginx /var/log/nginx /tmp/nginx_cache \
 && chmod -R g+rwX /opt/app-root/etc /var/cache/nginx /var/log/nginx /tmp/nginx_cache

# No fijes USER: OpenShift asigna un UID aleatorio válido
# USER 1001   # <- NO usar

EXPOSE 8080
