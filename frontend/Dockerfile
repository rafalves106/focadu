# --- Build Stage ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# VITE_API_BASE_URL e embutido no bundle em build-time (Vite), nao pode ser trocado depois em
# runtime - por isso vem como build ARG, nao env var do container final. Default vazio = chamadas
# relativas (`/api/...`), resolvidas same-origin pelo proxy do nginx abaixo (ver nginx.conf) - nao
# precisa de subdominio de API separado nem de CORS em producao.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# --- Runtime Stage ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
