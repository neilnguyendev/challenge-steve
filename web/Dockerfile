# Production image for the Next.js frontend.

# Install and build in ONE stage. Next's standalone output traces the modules
# it needs and copies them; pnpm's symlinked node_modules does not survive
# being COPYed between stages, and the traced server then boots to a
# MODULE_NOT_FOUND on a transitive dependency.
FROM node:24-alpine AS build
RUN npm install -g pnpm@10.19.0
WORKDIR /app

# A flat node_modules, only for this image. Next's standalone output traces the
# files it needs and copies them; pnpm's default symlinked .pnpm layout leaves
# the traced paths pointing at links the runtime stage never received, and the
# server boots to MODULE_NOT_FOUND on a transitive dependency. Development keeps
# the default layout — this is a packaging concern, not a project-wide one.
ENV NPM_CONFIG_NODE_LINKER=hoisted

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, not
# read at boot — so the API address has to be known here, and changing it means
# rebuilding rather than restarting.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Runtime carries the standalone server and nothing else — no pnpm, no source,
# no dependency tree — and does not run as root.
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
