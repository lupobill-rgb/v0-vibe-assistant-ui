FROM node:20-alpine

# Install git for repository operations (ca-certificates already in base image)
RUN apk add --no-cache git
# Verify git installation: docker compose exec api git --version

WORKDIR /app

# Copy package files
COPY package.json ./
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN npm install
RUN npm install --workspace=apps/api

# Copy source
COPY apps/api ./apps/api

# Build
RUN npm run build --workspace=apps/api

EXPOSE 3001

CMD ["npm", "start", "--workspace=apps/api"]
