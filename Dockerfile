FROM node:alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN yarn config set network-timeout 300000
RUN yarn install
COPY ./ .
RUN export NODE_OPTIONS=--openssl-legacy-provider && yarn build

FROM nginx:1.19 as production-stage
RUN mkdir /app
COPY --from=build-stage /app/dist /app
COPY nginx.conf /etc/nginx/nginx.conf
