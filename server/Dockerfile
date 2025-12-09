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

# Copy ALL source files (paths relative to root)
COPY --link server ./server
COPY --link shared ./shared
COPY --link client ./client
COPY --link scripts ./scripts
COPY --link vite.config.ts ./
COPY --link tsconfig.json ./
COPY --link postcss.config.js ./
COPY --link tailwind.config.ts ./

# Copy migration files
COPY --link drizzle.config.ts ./drizzle.config.ts

# Build the client using vite (FIXED: changed build:client to build)
RUN --mount=type=cache,target=/root/.npm \
    npm run build

# Debug: Find where vite actually built the files
RUN echo "🔍 Finding build output..." && \
    find . -name "index.html" -type f 2>/dev/null || true && \
    find . -name "*.css" -path "*/dist/*" -type f 2>/dev/null || true && \
    echo "📁 Directory structure:" && \
    ls -la . && \
    ls -la client/ || true && \
    ls -la client/dist/ || true && \
    ls -la client/client/ || true && \
    echo "Client build verification complete"

# Remove dev dependencies and reinstall only production dependencies
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    rm -rf node_modules && npm ci --production

# Install tsx and drizzle-kit for production
RUN --mount=type=cache,target=/root/.npm \
    npm install tsx drizzle-kit

# --- Production Stage ---
FROM node:${NODE_VERSION}-slim AS final
WORKDIR /app

# Install PostgreSQL client for database operations
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# Copy production node_modules (including tsx and drizzle-kit)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./

# Copy ALL TypeScript source files (server needs access to shared, tsx needs tsconfig)
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared

# Copy scripts directory for admin commands
COPY --from=builder /app/scripts ./scripts

# Copy configuration files that server might need
COPY --from=builder /app/vite.config.ts ./
COPY --from=builder /app/postcss.config.js ./
COPY --from=builder /app/tailwind.config.ts ./

# Copy migration files
COPY --from=builder /app/drizzle.config.ts ./

# Copy built client files (vite outputs to dist/public as per vite.config.ts)
# Server expects React app at server/public/
COPY --from=builder /app/dist/public ./server/public
COPY --from=builder /app/dist/index.js ./dist/index.js

# Verify all critical files are present
RUN echo "🔍 Verifying production files..." && \
    ls -la drizzle.config.ts && \
    ls -la server/index.ts && \
    ls -la shared/ && \
    ls -la scripts/ && \
    ls -la server/public/ && \
    ls -la dist/index.js && \
    echo "✅ All critical files present"

# Create startup script for SSL + migrations
RUN echo '#!/bin/bash' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Handle DigitalOcean CA certificate' >> /app/start.sh && \
    echo 'if [ ! -z "$DATABASE_CA_CERT" ]; then' >> /app/start.sh && \
    echo '  echo "🔒 Setting up DigitalOcean CA certificate..."' >> /app/start.sh && \
    echo '  echo -e "$DATABASE_CA_CERT" > /app/digitalocean-ca-cert.pem' >> /app/start.sh && \
    echo '  export NODE_EXTRA_CA_CERTS=/app/digitalocean-ca-cert.pem' >> /app/start.sh && \
    echo '  echo "✅ CA certificate configured"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Debug: Check available tools and files' >> /app/start.sh && \
    echo 'echo "🔍 Checking environment..."' >> /app/start.sh && \
    echo 'echo "Working directory: $(pwd)"' >> /app/start.sh && \
    echo 'echo "Node version: $(node --version)"' >> /app/start.sh && \
    echo 'echo "NPM version: $(npm --version)"' >> /app/start.sh && \
    echo 'which psql && echo "✅ psql found" || echo "❌ psql not found"' >> /app/start.sh && \
    echo 'which npx && echo "✅ npx found" || echo "❌ npx not found"' >> /app/start.sh && \
    echo 'ls -la node_modules/.bin/drizzle-kit && echo "✅ drizzle-kit binary found" || echo "❌ drizzle-kit binary missing"' >> /app/start.sh && \
    echo 'npm list drizzle-kit && echo "✅ drizzle-kit in npm list" || echo "❌ drizzle-kit not in npm list"' >> /app/start.sh && \
    echo 'echo "📁 Critical files check:"' >> /app/start.sh && \
    echo 'ls -la server/index.ts && echo "✅ server entry point found" || echo "❌ server/index.ts missing"' >> /app/start.sh && \
    echo 'ls -la shared/ && echo "✅ shared directory found" || echo "❌ shared directory missing"' >> /app/start.sh && \
    echo 'ls -la scripts/ && echo "✅ scripts directory found" || echo "❌ scripts directory missing"' >> /app/start.sh && \
    echo 'ls -la server/public/index.html && echo "✅ client build found" || echo "❌ client build missing"' >> /app/start.sh && \
    echo 'ls -la drizzle.config.ts && echo "✅ drizzle config found" || echo "❌ drizzle config missing"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Run database migrations' >> /app/start.sh && \
    echo 'echo "⚡ Running database migrations..."' >> /app/start.sh && \
    echo 'npx drizzle-kit push --config=./drizzle.config.ts || echo "⚠️ Migration failed, continuing..."' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Auto-seed production test accounts' >> /app/start.sh && \
    echo 'echo "🌱 Auto-seeding test accounts..."' >> /app/start.sh && \
    echo 'npx tsx server/db/seeds/auto-seed-production.ts || echo "⚠️ Test account seeding failed (non-fatal)"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Comprehensive test data seeding (if enabled)' >> /app/start.sh && \
    echo 'if [ "$RUN_COMPREHENSIVE_SEED" = "true" ]; then' >> /app/start.sh && \
    echo '  echo "🌱 Running comprehensive test data seeding..."' >> /app/start.sh && \
    echo '  npx tsx server/scripts/seed-comprehensive-test-data.ts || echo "⚠️ Comprehensive seed failed (non-fatal)"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start the application with tsx (matches package.json start script)' >> /app/start.sh && \
    echo 'echo "🚀 Starting FitMeal Pro server..."' >> /app/start.sh && \
    echo 'exec npx tsx server/index.ts' >> /app/start.sh && \
    chmod +x /app/start.sh

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Security: create a non-root user and change ownership
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 5001
CMD ["/app/start.sh"]
