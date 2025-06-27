# 1. Development Stage
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5001 24678
CMD ["npm", "run", "dev"]

# 2. Builder Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=dev /app/package*.json ./
COPY --from=dev /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3. Production Stage
FROM node:20-alpine AS prod
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/node_modules ./node_modules

# (DevOps Fix) Install tsx for execution
RUN npm install -g tsx

# Prune dev dependencies
RUN npm prune --production

# Create a startup script that handles DigitalOcean CA certificate
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Handle DigitalOcean CA certificate if provided' >> /app/start.sh && \
    echo 'if [ ! -z "$DATABASE_CA_CERT" ]; then' >> /app/start.sh && \
    echo '  echo "Setting up DigitalOcean CA certificate..."' >> /app/start.sh && \
    echo '  echo -e "$DATABASE_CA_CERT" > /app/digitalocean-ca-cert.pem' >> /app/start.sh && \
    echo '  export NODE_EXTRA_CA_CERTS=/app/digitalocean-ca-cert.pem' >> /app/start.sh && \
    echo '  echo "CA certificate configured at: $NODE_EXTRA_CA_CERTS"' >> /app/start.sh && \
    echo 'else' >> /app/start.sh && \
    echo '  echo "No DATABASE_CA_CERT provided, using default certificates"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start the application' >> /app/start.sh && \
    echo 'exec npm run start' >> /app/start.sh && \
    chmod +x /app/start.sh

EXPOSE 5001
ENV NODE_ENV=production

# Use the startup script instead of direct npm start
CMD ["/app/start.sh"]
