# STAGE 1: Build dell'applicazione React
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# STAGE 2: Web Server Nginx
FROM nginx:alpine
# Copia la build generata dallo stage precedente nella cartella pubblica di Nginx
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]