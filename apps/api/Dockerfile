FROM node:20-slim

# Install git for repository operations
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    openssh-client \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files (including lockfile for deterministic installs)
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN npm ci
RUN npm ci --workspace=apps/api

ARG CACHEBUST=1
# Copy source
COPY apps/api ./apps/api

# Build
RUN npm run build --workspace=apps/api

# Railway sets PORT dynamically; the API reads PORT || API_PORT || 3001
EXPOSE 3001

CMD ["npm", "start", "--workspace=apps/api"]
