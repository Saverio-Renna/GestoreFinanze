# Usa un'immagine base leggera raccomandata dal corso
FROM node:20-alpine

# Imposta la directory di lavoro all'interno del container
WORKDIR /usr/src/app

# Copia solo i file delle dipendenze per sfruttare la cache dei layer di Docker
COPY package*.json ./

# Installa le dipendenze ottimizzate per la produzione
RUN npm ci

# Copia il resto del codice sorgente
COPY . .

# Esponi la porta su cui gira Express
EXPOSE 5000

# Comando di avvio
CMD ["npm", "start"]