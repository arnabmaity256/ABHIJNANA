# Stage 1: Build the React frontend SPA
FROM node:20-slim AS builder
WORKDIR /app

# Install build tools needed by native addons (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy lockfiles and workspace configs
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY web/package.json ./web/
RUN npm ci

# Copy workspace source files
COPY . .

# Build the React web frontend bundle
RUN npm run build --workspace web

# Stage 2: Run the Express API server
FROM node:20-slim
WORKDIR /app

# Install build tools needed by better-sqlite3 native addon
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install production dependencies for the server workspace
COPY package.json package-lock.json ./
COPY server/package.json ./server/
RUN npm ci --omit=dev --workspace server

# Remove build tools to keep the image small
RUN apt-get purge -y python3 make g++ && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Copy API server source files and database migrations
COPY server/src ./server/src
COPY server/migrations ./server/migrations

# Copy built frontend assets from the builder stage
COPY --from=builder /app/web/dist ./web/dist

# Expose API port
EXPOSE 4317

ENV NODE_ENV=production
ENV PORT=4317
ENV ENGINE_URL=http://engine:4318
ENV REDIS_URL=redis://redis:6379

CMD ["node", "server/src/index.js"]
