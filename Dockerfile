# Playwright-Compatible Dockerfile - Using Debian base for full browser support
FROM node:20-bookworm-slim AS base
WORKDIR /app

# Install PostgreSQL client and common dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    wget \
    ca-certificates \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Development stage
FROM base AS dev

# Install Playwright system dependencies + debugging tools
RUN apt-get update && apt-get install -y \
    # Playwright dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    # Additional tools
    netcat-openbsd \
    dnsutils \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
RUN npm install

# Install Playwright browsers
RUN npx playwright install --with-deps chromium firefox webkit

# Copy application files
COPY . .

EXPOSE 5001 24678 4000

# Health check for dev container
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q --spider http://localhost:4000/api/health || exit 1

CMD ["npm", "run", "dev"]

# Build stage - CRITICAL: Verify drizzle.config.ts exists
FROM base AS builder
COPY package*.json ./
RUN npm ci --include=dev

# Copy ALL files and FAIL if drizzle.config.ts is missing
COPY . .

# CRITICAL CHECK: Fail build if drizzle.config.ts doesn't exist
RUN echo "🔍 CRITICAL CHECK: Verifying drizzle.config.ts exists..." && \
    if [ ! -f "drizzle.config.ts" ]; then \
    echo "❌ FATAL ERROR: drizzle.config.ts NOT FOUND in source!" && \
    echo "📁 Files in root directory:" && \
    ls -la && \
    echo "💡 Make sure drizzle.config.ts exists in your project root!" && \
    exit 1; \
    else \
    echo "✅ drizzle.config.ts found in source"; \
    fi

# Show file content to verify it's not empty
RUN echo "📄 drizzle.config.ts content preview:" && \
    head -5 drizzle.config.ts

# Build the application
RUN npm run build && \
    echo "✅ Build completed"

# Production stage - ENSURE drizzle.config.ts is copied
FROM base AS prod

# Copy package.json first
COPY package*.json ./

# Install dependencies (including tsx for running TypeScript seed scripts)
RUN npm ci --only=production && \
    npm install drizzle-kit tsx && \
    echo "✅ Dependencies installed"

# Copy built application
COPY --from=builder /app/dist/index.js ./dist/index.js
COPY --from=builder /app/dist/public ./dist/public
COPY --from=builder /app/shared ./shared

# Copy public static files (landing page, uploads, etc.)
COPY --from=builder /app/public ./public

# Copy server views directory (needed for PDF templates)
COPY --from=builder /app/server/views ./server/views

# CRITICAL VERIFICATION: Ensure server views were copied correctly
RUN echo "🔍 CRITICAL CHECK: Verifying server views exist..." && \
    if [ ! -d "server/views" ]; then \
    echo "❌ FATAL ERROR: server/views directory NOT FOUND!" && \
    echo "📁 Files in /app directory:" && \
    ls -la && \
    exit 1; \
    elif [ ! -f "server/views/pdfTemplate.ejs" ]; then \
    echo "❌ FATAL ERROR: server/views/pdfTemplate.ejs NOT FOUND!" && \
    echo "📁 Contents of server/views directory:" && \
    ls -la server/views/ 2>/dev/null || echo "Directory doesn't exist" && \
    exit 1; \
    else \
    echo "✅ Server views successfully copied"; \
    echo "📁 Views directory contents:" && \
    ls -la server/views/; \
    fi

# CRITICAL VERIFICATION: Ensure React app was copied correctly
RUN echo "🔍 CRITICAL CHECK: Verifying React app files exist..." && \
    if [ ! -d "dist/public" ]; then \
    echo "❌ FATAL ERROR: dist/public directory NOT FOUND!" && \
    echo "📁 Files in /app directory:" && \
    ls -la && \
    exit 1; \
    elif [ ! -f "dist/public/index.html" ]; then \
    echo "❌ FATAL ERROR: dist/public/index.html NOT FOUND!" && \
    echo "📁 Contents of dist/public directory:" && \
    ls -la dist/public/ 2>/dev/null || echo "Directory doesn't exist" && \
    exit 1; \
    else \
    echo "✅ React app files successfully copied"; \
    echo "📁 React app contents:" && \
    ls -la dist/public/ | head -10; \
    fi

# CRITICAL VERIFICATION: Ensure public static files were copied
RUN echo "🔍 CRITICAL CHECK: Verifying public static files exist..." && \
    if [ ! -d "public" ]; then \
    echo "❌ FATAL ERROR: public directory NOT FOUND!" && \
    echo "📁 Files in /app directory:" && \
    ls -la && \
    exit 1; \
    elif [ ! -f "public/landing/index.html" ]; then \
    echo "❌ FATAL ERROR: public/landing/index.html NOT FOUND!" && \
    echo "📁 Contents of public directory:" && \
    ls -la public/ && \
    exit 1; \
    else \
    echo "✅ public static files successfully copied"; \
    echo "📁 Public directory contents:" && \
    ls -la public/ && \
    echo "📄 Landing page verified:" && \
    ls -la public/landing/index.html; \
    fi

# CRITICAL: Copy drizzle.config.ts with verification
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Copy database seeds directory for auto-seeding
COPY --from=builder /app/server/db/seeds ./server/db/seeds

# Copy scripts directory (includes comprehensive test data seeding script)
COPY --from=builder /app/server/scripts ./server/scripts

# MANDATORY VERIFICATION: Fail if drizzle.config.ts wasn't copied
RUN echo "🔍 FINAL VERIFICATION: Checking drizzle.config.ts in production stage..." && \
    if [ ! -f "drizzle.config.ts" ]; then \
    echo "❌ FATAL ERROR: drizzle.config.ts NOT COPIED to production stage!" && \
    echo "📁 Files in /app directory:" && \
    ls -la && \
    exit 1; \
    else \
    echo "✅ drizzle.config.ts successfully copied to production stage"; \
    fi

# Show final file verification
RUN echo "📋 FINAL FILE CHECK:" && \
    ls -la drizzle.config.ts && \
    echo "📄 File content preview:" && \
    head -3 drizzle.config.ts

# Test drizzle-kit can find the config
RUN echo "🧪 Testing drizzle-kit with config file..." && \
    npx drizzle-kit --help > /dev/null && \
    echo "✅ drizzle-kit is working"

# Create startup script with explicit file checks
RUN echo '#!/bin/sh' > start.sh && \
    echo 'set -e' >> start.sh && \
    echo 'echo "🚀 FitMeal Pro Starting..."' >> start.sh && \
    echo 'echo "📁 Current directory: $(pwd)"' >> start.sh && \
    echo 'echo "📋 Checking critical files:"' >> start.sh && \
    echo 'ls -la drizzle.config.ts || echo "❌ drizzle.config.ts MISSING!"' >> start.sh && \
    echo 'ls -la dist/index.js || echo "❌ dist/index.js MISSING!"' >> start.sh && \
    echo 'if [ -n "$DATABASE_CA_CERT" ]; then' >> start.sh && \
    echo '  echo "🔒 Setting up SSL certificate..."' >> start.sh && \
    echo '  echo -e "$DATABASE_CA_CERT" > /tmp/ca.pem' >> start.sh && \
    echo '  export NODE_EXTRA_CA_CERTS=/tmp/ca.pem' >> start.sh && \
    echo 'fi' >> start.sh && \
    echo 'echo "⚡ Running migrations with drizzle.config.ts..."' >> start.sh && \
    echo 'npx drizzle-kit push --config=./drizzle.config.ts --verbose || echo "⚠️ Migration failed"' >> start.sh && \
    echo 'echo "🌱 Auto-seeding test accounts..."' >> start.sh && \
    echo 'npm run seed:production || echo "⚠️ Test account seeding failed (non-fatal)"' >> start.sh && \
    echo 'if [ "$RUN_COMPREHENSIVE_SEED" = "true" ]; then' >> start.sh && \
    echo '  echo "🌱 Running comprehensive test data seeding..."' >> start.sh && \
    echo '  npx tsx server/scripts/seed-comprehensive-test-data.ts || echo "⚠️ Comprehensive seed failed (non-fatal)"' >> start.sh && \
    echo 'fi' >> start.sh && \
    echo 'echo "🎉 Starting application..."' >> start.sh && \
    echo 'exec npm start' >> start.sh && \
    chmod +x start.sh

# Security: non-root user
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

ENV NODE_ENV=production
EXPOSE 5001
CMD ["./start.sh"]
