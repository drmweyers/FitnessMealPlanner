# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.13.1

# --- Build Stage ---
FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /app

# Install build dependencies only (no .env, no .git, no lock files copied)
COPY --link ../package.json ../package-lock.json ./

# Install dependencies with cache and bind mounts for deterministic builds
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=bind,source=../package.json,target=package.json \
    --mount=type=bind,source=../package-lock.json,target=package-lock.json \
    npm ci

# Copy only the necessary source files for the server build
COPY --link . ./server
COPY --link ../shared ./shared
COPY --link ../client ./client
COPY --link ../vite.config.* ../vite.config.*

# Build the server (this will also build the client via vite if configured)
RUN --mount=type=cache,target=/root/.npm \
    npm run build

# Remove dev dependencies and reinstall only production dependencies
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=bind,source=../package.json,target=package.json \
    --mount=type=bind,source=../package-lock.json,target=package-lock.json \
    rm -rf node_modules && npm ci --production

# --- Production Stage ---
FROM node:${NODE_VERSION}-slim AS final
WORKDIR /app

# Security: create a non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Copy built server and production node_modules only
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# If you need static assets for production serving, copy them as well
COPY --from=builder /app/public ./public

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"
USER appuser

EXPOSE 5000
CMD ["npm", "start"]
