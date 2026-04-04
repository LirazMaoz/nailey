FROM node:20-alpine

WORKDIR /app

# Install server deps
COPY server/package*.json ./server/
RUN npm install --prefix server

# Install and build client
COPY client/package*.json ./client/
RUN npm install --prefix client

COPY . .
RUN npm run build --prefix client

EXPOSE 3001
ENV NODE_ENV=production

CMD ["node", "server/src/index.js"]
