# ── Stage: Production image with Node + Python ──────────────────────────────
FROM node:20-slim

# Install Python3, pip, and build tools needed by some packages
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv gcc && \
    rm -rf /var/lib/apt/lists/*

# Install required Python packages globally
RUN pip3 install --break-system-packages \
    numpy \
    pandas \
    pymongo \
    scikit-learn \
    dnspython

WORKDIR /app

# Install Node dependencies (production only)
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the backend source
COPY . .

EXPOSE 5001

CMD ["node", "server.js"]

