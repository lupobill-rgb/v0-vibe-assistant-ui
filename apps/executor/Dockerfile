FROM node:20-alpine

# Install git and ripgrep
RUN apk add --no-cache git ripgrep
# Verify git installation: docker compose exec executor git --version

WORKDIR /app

# Copy package files
COPY package.json ./
COPY apps/executor/package.json ./apps/executor/

# Install dependencies
RUN npm install
RUN npm install --workspace=apps/executor

# Copy source
COPY apps/executor ./apps/executor

# Build
RUN npm run build --workspace=apps/executor

CMD ["npm", "start", "--workspace=apps/executor"]
