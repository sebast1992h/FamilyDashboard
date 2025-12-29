FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN node bump_version.cjs
EXPOSE 4000
CMD ["node", "server.js"]
