<<<<<<< HEAD
﻿# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci
=======
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests
COPY package*.json ./
COPY apps/web/package.json ./apps/web/package.json

# Install dependencies for monorepo + web workspace
RUN npm ci
RUN npm ci --workspace=apps/web
>>>>>>> aeeef76cd8fd458ec6d0d9997e4869b5c544507e

# Copy source
COPY . .

<<<<<<< HEAD
# Build Next.js app
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.mjs ./

# Install production dependencies only
RUN npm ci --only=production

EXPOSE 3000

CMD ["npm", "start"]
=======
# Build Next app
RUN npm run build --workspace=apps/web

# Runtime stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only what Next needs
COPY --from=builder /app/apps/web ./

# Install prod deps only for web workspace
RUN npm ci --omit=dev

EXPOSE 3000
CMD ["npm","start"]
>>>>>>> aeeef76cd8fd458ec6d0d9997e4869b5c544507e
