# Build + run a Next.js standalone app. Uses Node's built-in node:sqlite
# (no native modules to compile).
FROM node:26-slim AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

FROM node:26-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:26-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/conference.db

# Standalone output bundles only what's needed to run.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "server.js"]
