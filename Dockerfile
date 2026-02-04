# Use Node.js 18 on Debian Bullseye (better for system packages)
FROM node:18-bullseye

# Install system dependencies
# - libreoffice: For docx-pdf conversion
# - ffmpeg: For audio/video conversion
# - fonts-liberation & fonts-google-poppins: For PDF text rendering
RUN apt-get update && apt-get install -y \
    libreoffice \
    ffmpeg \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy package files first (for caching)
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port (Render sets PORT env var, but this is good documentation)
EXPOSE 3000

# Start command
CMD [ "npm", "start" ]
