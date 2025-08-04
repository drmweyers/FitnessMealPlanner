# Multi-stage Docker build for FitnessMealPlanner
# Optimized for smaller image size, better caching, and production readiness

# ====================================
# Stage 1: Base Dependencies
# ====================================
FROM node:20-alpine AS base

# Install system dependencies (cached separately)
RUN apk add --no-cache \
    postgresql-client \
    ca-certificates \
    tzdata \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# ====================================
# Stage 2: Dependencies Installation
# ====================================
FROM base AS deps

# Copy package files for dependency caching
COPY package*.json ./

# Install all dependencies (dev + prod for build)
RUN npm ci --include=dev --frozen-lockfile

# ====================================
# Stage 3: Build Stage
# ====================================
FROM deps AS builder

# Copy source code
COPY . .

# Verify critical files exist
RUN if [ ! -f "drizzle.config.ts" ]; then \
    echo "❌ FATAL: drizzle.config.ts missing" && exit 1; \
    fi

# Build the application
RUN npm run build

# ====================================
# Stage 4: Production Dependencies
# ====================================
FROM base AS prod-deps

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --frozen-lockfile \
    && npm install drizzle-kit \
    && npm cache clean --force

# ====================================
# Stage 5: Production Runtime
# ====================================
FROM base AS production

# Create non-root user first
RUN adduser -D -s /bin/sh appuser

# Copy production dependencies
COPY --from=prod-deps --chown=appuser:appuser /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=appuser:appuser /app/dist ./dist
COPY --from=builder --chown=appuser:appuser /app/shared ./shared
COPY --from=builder --chown=appuser:appuser /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=appuser:appuser /app/package*.json ./

# Copy client build (Vite builds to client/dist)
COPY --from=builder --chown=appuser:appuser /app/client/dist ./client/dist

# Create optimized startup script
RUN echo '#!/bin/sh' > start.sh && \
    echo 'set -e  # Exit on any error' >> start.sh && \
    echo 'echo "🚀 FitnessMealPlanner Starting..."' >> start.sh && \
    echo 'echo "📊 Environment: $NODE_ENV"' >> start.sh && \
    echo 'echo "🔧 Running database migrations..."' >> start.sh && \
    echo 'npx drizzle-kit push --config=./drizzle.config.ts --verbose || { echo "❌ Migration failed"; exit 1; }' >> start.sh && \
    echo 'echo "✅ Migrations completed"' >> start.sh && \
    echo 'echo "🎉 Starting application server..."' >> start.sh && \
    echo 'exec npm start' >> start.sh && \
    chmod +x start.sh && \
    chown appuser:appuser start.sh

# Create uploads directory with proper permissions
RUN mkdir -p public/uploads/profile-images && \
    chown -R appuser:appuser public

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5001/api/health || exit 1

# Environment and runtime configuration
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=1024" \
    PORT=5001

EXPOSE 5001

CMD ["./start.sh"]

# ====================================
# Stage 6: Development Runtime (with Puppeteer)
# ====================================
FROM deps AS development

# Install Puppeteer dependencies only for development
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Set Puppeteer environment
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy source code
COPY . .

# Create non-root user for development
RUN adduser -D -s /bin/sh appuser && \
    chown -R appuser:appuser /app

USER appuser

ENV NODE_ENV=development
EXPOSE 4000 24678

CMD ["npm", "run", "dev"]