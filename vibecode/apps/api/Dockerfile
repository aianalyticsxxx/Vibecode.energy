FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with npm
RUN npm ci

# Copy source code
COPY . .

# Build
RUN npm run build

# Expose port
EXPOSE 4000

# Start
CMD ["npm", "start"]
