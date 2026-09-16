FROM node:22-alpine
ENV PYTHONBUFFERED = 1
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
CMD ["npm","run","dev"]