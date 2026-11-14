# Production image: docker build -t droneview-ops . && docker run -p 3000:3000 --env-file .env droneview-ops
FROM node:22 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:22 AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma
# full node_modules so the Prisma CLI can apply migrations at start-up
COPY --from=build /app/node_modules ./node_modules
RUN mkdir -p /app/storage/uploads
EXPOSE 3000
# apply pending migrations, then start
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
