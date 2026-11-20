#!/bin/bash
set -e

echo "=========================================================="
echo "  SentinelOps AI - Automated AWS Production Deployment"
echo "=========================================================="

# 1. Update and install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "[*] Installing Docker and Docker Compose..."
    sudo apt-get update -y
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo usermod -aG docker $USER
    echo "[+] Docker installed successfully!"
fi

# 2. Setup .env from example if not exists
if [ ! -f .env ]; then
    echo "[*] Creating .env from .env.example..."
    cp .env.example .env
fi

# 3. Pull and start all Docker services
echo "[*] Launching SentinelOps AI containers (Postgres, n8n, 3D Dashboard, Task Runners, Cloudflare Tunnel)..."
sudo docker compose -f compose.yaml -f compose.prod.yaml up -d --remove-orphans

echo "[*] Waiting for PostgreSQL and n8n to be healthy..."
sleep 10

# 4. Initialize Database Schema
echo "[*] Initializing ide09 schema in PostgreSQL..."
sudo docker exec -i sentinelops-postgres psql -U sentinel -d sentinelops < sql/schema.sql

# 5. Extract Cloudflare Tunnel Public Webhook URL
echo "[*] Extracting live Cloudflare tunnel URL..."
sleep 5
TUNNEL_URL=$(sudo docker logs sentinelops-tunnel 2>&1 | grep -o 'https://[-a-z0-9.]*\.trycloudflare\.com' | tail -n 1)

echo ""
echo "=========================================================="
echo "  🚀 SentinelOps AI is LIVE on AWS!"
echo "=========================================================="
PUBLIC_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
echo " - SCADA 3D Web Dashboard : http://${PUBLIC_IP}:8085"
echo " - n8n Automation Engine  : http://${PUBLIC_IP}:5690"
if [ -n "$TUNNEL_URL" ]; then
    echo " - Cloudflare Public URL  : ${TUNNEL_URL}"
    echo ""
    echo "[*] Auto-registering Telegram bot webhook with Cloudflare tunnel..."
    python3 scripts/register_telegram_webhook.py "$TUNNEL_URL" || true
fi
echo "=========================================================="
