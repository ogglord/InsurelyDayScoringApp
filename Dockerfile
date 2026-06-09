# Build + run the Next.js app with `next start`. Uses Node's built-in
# node:sqlite (no native modules to compile). Matches the LXC/systemd runtime.
FROM node:26-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
# Drop dev dependencies (typescript, playwright, types) from the image.
RUN npm prune --omit=dev

FROM node:26-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/conference.db

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json

VOLUME ["/data"]
EXPOSE 3000
CMD ["npm", "start"]
