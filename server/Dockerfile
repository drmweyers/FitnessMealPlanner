# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.13.1

# --- Build Stage ---
FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /app

# Install build dependencies (paths relative to root, not server/)
COPY --link package.json package-lock.json ./

# Install dependencies with cache and bind mounts for deterministic builds
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    npm ci

# Copy source files (paths relative to root)
COPY --link server ./server
COPY --link shared ./shared
COPY --link client ./client
COPY --link vite.config.* ./

# Copy migration files
COPY --link drizzle.config.ts ./drizzle.config.ts

# Build the server (this will also build the client via vite if configured)
RUN --mount=type=cache,target=/root/.npm \
    npm run build

# Remove dev dependencies and reinstall only production dependencies + drizzle-kit
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    rm -rf node_modules && npm ci --production

# Install drizzle-kit AFTER production install to ensure it's kept
RUN --mount=type=cache,target=/root/.npm \
    npm install drizzle-kit

# --- Production Stage ---
FROM node:${NODE_VERSION}-slim AS final
WORKDIR /app

# Install PostgreSQL client for database operations
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# Copy built server and production node_modules (including drizzle-kit)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy migration files
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/shared ./shared

# Copy client build
COPY --from=builder /app/client/dist ./client/dist

# Create startup script for SSL + migrations
RUN echo '#!/bin/bash' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Handle DigitalOcean CA certificate' >> /app/start.sh && \
    echo 'if [ ! -z "$DATABASE_CA_CERT" ]; then' >> /app/start.sh && \
    echo '  echo "Setting up DigitalOcean CA certificate..."' >> /app/start.sh && \
    echo '  echo -e "$DATABASE_CA_CERT" > /app/digitalocean-ca-cert.pem' >> /app/start.sh && \
    echo '  export NODE_EXTRA_CA_CERTS=/app/digitalocean-ca-cert.pem' >> /app/start.sh && \
    echo '  echo "CA certificate configured"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Debug: Check available tools' >> /app/start.sh && \
    echo 'echo "Checking available tools..."' >> /app/start.sh && \
    echo 'which psql || echo "psql not found"' >> /app/start.sh && \
    echo 'which npx || echo "npx not found"' >> /app/start.sh && \
    echo 'ls -la node_modules/.bin/drizzle-kit || echo "drizzle-kit not in node_modules"' >> /app/start.sh && \
    echo 'npm list drizzle-kit || echo "drizzle-kit not in npm list"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Run database migrations' >> /app/start.sh && \
    echo 'echo "Running database migrations..."' >> /app/start.sh && \
    echo 'npx drizzle-kit push || echo "Migration failed, continuing..."' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start the application' >> /app/start.sh && \
    echo 'exec npm start' >> /app/start.sh && \
    chmod +x /app/start.sh

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Security: create a non-root user and change ownership
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 5001
CMD ["/app/start.sh"]
