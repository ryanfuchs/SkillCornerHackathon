# Build static assets
FROM node:20-alpine AS builder
WORKDIR /app

COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 100000

COPY frontend/ .
RUN yarn build

# Serve the static SPA with a minimal static file server (no nginx)
FROM node:20-alpine

WORKDIR /app
RUN yarn global add serve@14

COPY --from=builder /app/dist ./dist

EXPOSE 80

# -s = single-page mode (history-API fallback to index.html)
CMD ["serve", "-s", "dist", "-l", "80"]
