FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Remove old properties files that are replaced by JSON
RUN rm -f src/components/i18n/messages_*.properties

EXPOSE 3000

CMD ["npm", "start"]