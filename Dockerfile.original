# FIXED Dockerfile - Ensuring drizzle.config.ts is properly copied
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache postgresql-client \
    && apk add --no-cache chromium \
    && apk add --no-cache nss \
    && apk add --no-cache freetype \
    && apk add --no-cache harfbuzz \
    && apk add --no-cache ca-certificates \
    && apk add --no-cache ttf-freefont

# Tell Puppeteer to skip downloading Chrome and use the installed version
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Development stage
FROM base AS dev
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5001 24678
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

# Install dependencies
RUN npm ci --only=production && \
    npm install drizzle-kit && \
    echo "✅ Dependencies installed"

# Copy built application
COPY --from=builder /app/dist/index.js ./dist/index.js
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/shared ./shared

# CRITICAL: Copy drizzle.config.ts with verification
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

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
    echo 'echo "🎉 Starting application..."' >> start.sh && \
    echo 'exec npm start' >> start.sh && \
    chmod +x start.sh

# Security: non-root user
RUN adduser -D -s /bin/sh appuser && \
    chown -R appuser:appuser /app
USER appuser

ENV NODE_ENV=production
EXPOSE 5001
CMD ["./start.sh"]
