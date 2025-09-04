# --- Build (Vite) ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# En prod tus VITE_* deben apuntar a rutas relativas /webhook/*
RUN npm run build

# --- Runtime (NGINX oficial) ---
FROM nginx:1.25-alpine

# Sobrescribimos la conf por defecto
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copiamos el build estático
COPY --from=build /app/dist/ /usr/share/nginx/html/

# Los logs a stdout/err (útil en OpenShift)
RUN ln -sf /dev/stdout /var/log/nginx/access.log \
 && ln -sf /dev/stderr /var/log/nginx/error.log

EXPOSE 8080
