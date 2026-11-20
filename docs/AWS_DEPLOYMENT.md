# SentinelOps AI - AWS Deployment Guide (EC2 & Lightsail)

Deploying **SentinelOps AI** on AWS gives you **24/7 zero-cold-start performance**, 2.2-second Telegram bot latency, and permanent PostgreSQL database storage.

---

## 1. Launch AWS EC2 Instance (2 Minutes)

1. Open the [AWS EC2 Console](https://console.aws.amazon.com/ec2).
2. Click **Launch Instance**:
   * **Name:** `SentinelOps-AI-Server`
   * **OS Image:** **Ubuntu 24.04 LTS** (or 22.04 LTS)
   * **Instance Type:** `t2.micro` (AWS Free Tier eligible) or `t3.small` (recommended for smooth 3D streaming)
   * **Key Pair:** Select your key pair or choose *"Proceed without a key pair"* if using browser EC2 Instance Connect.
3. Under **Network settings / Security Group**:
   * Check **Allow SSH traffic** (Port 22)
   * Check **Allow HTTP traffic** (Port 80)
   * Click **Edit** and add Custom TCP Rules:
     * Port `8085` (Anywhere `0.0.0.0/0`) $\rightarrow$ **SCADA 3D Web Dashboard**
     * Port `5690` (Anywhere `0.0.0.0/0`) $\rightarrow$ **n8n Automation Engine**
4. Click **Launch Instance**.

---

## 2. Deploy with One Script (1 Minute)

1. Connect to your instance (click **Connect** $\rightarrow$ **EC2 Instance Connect** directly in your browser).
2. Run these two commands in the terminal:

```bash
git clone https://github.com/EkoriantoChan/SentinelOps-AI.git
cd SentinelOps-AI && bash scripts/deploy_aws.sh
```

### What this automated script does:
1. Installs Docker and Docker Compose Plugin.
2. Launches all 5 containers (`postgres`, `n8n`, `task-runners`, `dashboard`, `cloudflare-tunnel`).
3. Initializes the `ide09` database schema and asset registry automatically.
4. Generates an encrypted Cloudflare HTTPS tunnel for instant Telegram bot webhook delivery.
5. Displays your live public URLs for the 3D SCADA Dashboard and n8n Engine!

---

## 3. Access Your Live Cloud URLs

* **3D SCADA Plant Twin:** `http://<YOUR_EC2_PUBLIC_IP>:8085`
* **n8n Automation Engine:** `http://<YOUR_EC2_PUBLIC_IP>:5690`
* **Telegram Bot:** [@SentinelOps_AI_Plant_Bot](https://t.me/SentinelOps_AI_Plant_Bot) *(responds instantly with 0 cold starts)*
