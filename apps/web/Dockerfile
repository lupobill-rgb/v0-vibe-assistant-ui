# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests
COPY package*.json ./
COPY apps/web/package.json ./apps/web/package.json

# Install dependencies for monorepo + web workspace
RUN npm ci
RUN npm ci --workspace=apps/web

# Copy source
COPY . .

# Build web app with Vite
RUN npm run build --workspace=apps/web

# Runtime stage - serve static files with nginx
FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
