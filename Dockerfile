FROM node:24-alpine

WORKDIR /app
COPY --chown=node:node . .

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=10000

USER node
EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O - "http://127.0.0.1:${PORT}/api/health" || exit 1

CMD ["npm", "start"]
