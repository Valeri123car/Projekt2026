FROM node:20-alpine
RUN apk add --no-cache openssl python3
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --only=production
RUN npx prisma generate
COPY src ./src
COPY server/python ./server/python
EXPOSE 3000
CMD ["node", "src/app.js"]