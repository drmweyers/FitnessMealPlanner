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

EXPOSE 5001
ENV NODE_ENV=production
CMD ["npm", "run", "start"]
