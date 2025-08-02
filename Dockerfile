FROM node:16.20.0

COPY . /app
WORKDIR /app

RUN npm i

CMD ["npm", "run", "dev"]