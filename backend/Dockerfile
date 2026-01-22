FROM node:20-alpine
WORKDIR /app

# Installiere netcat für Datenbankwarten
RUN apk add --no-cache netcat-openbsd

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
RUN npx prisma generate
COPY . .
RUN node bump_version.cjs

# Mache das Start-Script ausführbar
RUN chmod +x start.sh

EXPOSE 4000
CMD ["./start.sh"]
