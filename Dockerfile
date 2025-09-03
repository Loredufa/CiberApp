# ---------- Build (Vite) ----------
FROM registry.access.redhat.com/ubi9/nodejs-20 AS build
WORKDIR /opt/app-root/src

# 1) Instalar deps SIN scripts (evita que corra postinstall->vite build antes del código)
COPY package*.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts

# 2) Copiar el código y recién ahí construir
COPY . .
RUN npm run build

# ---------- Runtime (NGINX no-root y compatible SCC restricted) ----------
FROM registry.access.redhat.com/ubi9/nginx-120

# Trabajar como root solo para preparar permisos
USER 0

# Copiamos configuración
COPY default.conf /etc/nginx/conf.d/default.conf

# Crear TODOS los directorios necesarios y dar permisos de grupo 0 (root)
# Esto permite correr con UID aleatorio (SCC restricted) sin usar USER fijo.
RUN mkdir -p \
      /usr/share/nginx/html \
      /etc/nginx/conf.d \
      /var/cache/nginx \
      /var/log/nginx \
      /tmp/nginx_cache/client_body \
      /tmp/nginx_cache/proxy \
      /tmp/nginx_cache/fastcgi \
      /tmp/nginx_cache/uwsgi \
      /tmp/nginx_cache/scgi \
  && rm -rf /usr/share/nginx/html/* \
  # Lectura/ejecución para cualquiera en el docroot (SPA estática)
  && chmod -R a+rX /usr/share/nginx/html \
  # Directorios que nginx podría usar en runtime
  && chmod -R 1777 /tmp/nginx_cache \
  # Dar control por grupo 0 para compatibilidad extra con SCC restricted
  && chgrp -R 0 /etc/nginx /var/cache/nginx /var/log/nginx /tmp/nginx_cache \
  && chmod -R g+rwX /etc/nginx /var/cache/nginx /var/log/nginx /tmp/nginx_cache

# Copiar el build estático
COPY --from=build /opt/app-root/src/dist/ /usr/share/nginx/html/

EXPOSE 8080
