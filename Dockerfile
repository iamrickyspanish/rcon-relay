FROM node:lts

COPY . /app
WORKDIR /app

RUN npm i

CMD ["npm", "run", "dev"]