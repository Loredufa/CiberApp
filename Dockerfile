# ---------- Build (Vite) ----------
FROM registry.access.redhat.com/ubi9/nodejs-20 AS build
WORKDIR /opt/app-root/src

# Instalar deps SIN ejecutar postinstall (evita que corra 'vite build' sin código)
COPY package*.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts

# Copiar código y ahora sí construir
COPY . .
RUN npm run build


# ---------- Runtime (NGINX UBI9, compatible SCC restricted) ----------
FROM registry.access.redhat.com/ubi9/nginx-120

# Preparar como root (solo para escribir config y permisos)
USER 0

# Escribir la configuración en la ruta que CARGA la imagen UBI9 por defecto:
# /opt/app-root/etc/nginx.default.d/*.conf (dentro del 'server' default)
# OJO: este fragmento es de nivel "server" (NO lleva 'server { ... }')
RUN /bin/sh -lc 'cat > /opt/app-root/etc/nginx.default.d/zz_app.conf << "EOF"\n\
# Docroot real del build\n\
root /usr/share/nginx/html;\n\
index index.html;\n\
\n\
# SPA React/Vite\n\
location / {\n\
  try_files $uri /index.html;\n\
}\n\
\n\
# Reverse proxy a n8n (evita problemas de cert en el navegador)\n\
location /webhook/nist-csf {\n\
  proxy_pass https://n8n-n8n.apps.focus-ocp-sno-virt.datco.net/webhook/nist-csf;\n\
  proxy_ssl_server_name on;\n\
  proxy_ssl_verify off;\n\
  proxy_set_header Host $host;\n\
  proxy_set_header X-Forwarded-Proto $scheme;\n\
  proxy_set_header X-Forwarded-For $remote_addr;\n\
}\n\
location /webhook/pentest {\n\
  proxy_pass https://n8n-n8n.apps.focus-ocp-sno-virt.datco.net/webhook/pentest;\n\
  proxy_ssl_server_name on;\n\
  proxy_ssl_verify off;\n\
  proxy_set_header Host $host;\n\
  proxy_set_header X-Forwarded-Proto $scheme;\n\
  proxy_set_header X-Forwarded-For $remote_addr;\n\
}\n\
\n\
# Tamaño de upload razonable para .xlsx\n\
client_max_body_size 25m;\n\
\n\
# Rutas temporales en /tmp (con permisos)\n\
client_body_temp_path /tmp/nginx_cache/client_body;\n\
proxy_temp_path       /tmp/nginx_cache/proxy;\n\
fastcgi_temp_path     /tmp/nginx_cache/fastcgi;\n\
uwsgi_temp_path       /tmp/nginx_cache/uwsgi;\n\
scgi_temp_path        /tmp/nginx_cache/scgi;\n\
EOF'

# Copiar el build estático al docroot
COPY --from=build /opt/app-root/src/dist/ /usr/share/nginx/html/

# Permisos compatibles con UID aleatorio (SCC restricted)
RUN find /usr/share/nginx/html -type d -exec chmod 0755 {} \; \
 && find /usr/share/nginx/html -type f -exec chmod 0644 {} \; \
 && mkdir -p /tmp/nginx_cache/client_body /tmp/nginx_cache/proxy /tmp/nginx_cache/fastcgi /tmp/nginx_cache/uwsgi /tmp/nginx_cache/scgi \
 && chmod -R 1777 /tmp/nginx_cache \
 && chgrp -R 0 /opt/app-root/etc /var/cache/nginx /var/log/nginx /tmp/nginx_cache \
 && chmod -R g+rwX /opt/app-root/etc /var/cache/nginx /var/log/nginx /tmp/nginx_cache

# No fijamos USER: OpenShift asigna un UID aleatorio válido
# USER 1001   # <- NO usar

EXPOSE 8080
