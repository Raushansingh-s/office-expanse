FROM node:20-alpine

# Install openssl for Prisma client
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies needed for Prisma generate)
RUN npm ci

# Copy application source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

# Start command: run prisma db push (or deploy) and start server
CMD ["sh", "-c", "npx prisma db push && npm start"]
