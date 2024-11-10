FROM node:20.10-alpine3.19

WORKDIR /app
COPY ./package.json .
COPY ./yarn.lock .
RUN yarn remove sharp

RUN yarn install

COPY . .

RUN yarn add sharp --ignore-engines

CMD ["yarn", "start"]