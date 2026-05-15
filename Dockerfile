ARG NODE_VERSION=25-alpine
ARG PNPM_VERSION=10.33.0
ARG APP_ENV=production

FROM node:${NODE_VERSION} AS base

ARG PNPM_VERSION

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN npm install -g pnpm@${PNPM_VERSION}

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder

ARG APP_ENV=production

ENV APP_ENV=${APP_ENV}
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .

RUN if [ "$APP_ENV" = "test" ]; then \
      pnpm run build:test; \
    else \
      pnpm run build; \
    fi

FROM node:${NODE_VERSION} AS runner

ARG APP_ENV=production

WORKDIR /app

ENV NODE_ENV=production
ENV APP_ENV=${APP_ENV}
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
