FROM node:18-slim

# Set environment
ENV NODE_ENV=production

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy server code
COPY . .

EXPOSE 5000

CMD ["npm", "start"]
