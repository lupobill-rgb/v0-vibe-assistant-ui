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

# Build Next app
RUN npm run build --workspace=apps/web

# Runtime stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built dist and necessary files
COPY --from=builder /app/apps/web/dist ./dist
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/apps/web/index.html ./index.html

# Install only production dependencies
RUN npm install --omit=dev

EXPOSE 3000
CMD ["npm","run","preview"]
