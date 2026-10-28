FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
# Keep installation flags aligned with the Jenkins pipeline.
RUN npm ci --legacy-peer-deps --no-audit --no-fund

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# The API URL is supplied when the container starts via --env-file.
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production \
      PORT=3002 \
      NODE_OPTIONS=--max-http-header-size=32768 \
      HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 3002
CMD ["node", "server.js"]
