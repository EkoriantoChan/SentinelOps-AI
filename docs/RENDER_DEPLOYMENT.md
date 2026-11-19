# SentinelOps AI - Cloud Deployment Guide (Render)

This guide documents how to deploy **SentinelOps AI** to Render using the pre-configured blueprints or manual provisioning.

---

## 1. Cloud Architecture Overview

| Component | Render Service Type | Details |
| :--- | :--- | :--- |
| **PostgreSQL 16** | Managed Database | Hosts `ide09` operational, security, and audit tables. Timezone: `Asia/Jakarta`. |
| **n8n Automation Engine** | Web Service (Docker) | Runs `docker.n8n.io/n8nio/n8n:2.44.7` backed by PostgreSQL (`n8n_system` schema). |
| **SCADA Digital Twin** | Static Site | Serves `dashboard/` static assets (`index.html`, `styles.css`, `app.js`, Three.js 3D visualizer). |

---

## 2. Step-by-Step Cloud Deployment

### Step 1: Push Repository to GitHub
If you haven't pushed this project to GitHub yet:
1. Create a new repository on [GitHub](https://github.com/new) (e.g. `SentinelOps-AI`).
2. Run the following commands from your project root:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/SentinelOps-AI.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 2: Deploy on Render via Blueprint
1. Go to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Blueprint**.
3. Connect your GitHub repository.
4. Render will detect `render.yaml` (or choose `render.free.yaml` if you prefer the 100% Free Tier plan).
5. Render will automatically provision:
   - **`sentinelops-db`**: PostgreSQL 16
   - **`sentinelops-n8n`**: Automation Engine (Connected to PostgreSQL)
   - **`sentinelops-scada-dashboard`**: Web static site
6. Under Environment Variables:
   - Enter `OPENAI_API_KEY`: *(Your OpenAI API key)*
   - Enter `TELEGRAM_BOT_TOKEN`: `9045682587:AAGOHDz0usTpkSJ2t1PBcJ3DNyjW9H2gWko`
7. Click **Apply**.

---

### Step 3: Initialize Database Schema (`ide09`)
1. Once `sentinelops-db` status changes to **Available**, click on it in Render.
2. Under **Connections**, copy the **External Database URL** (e.g. `postgresql://sentinel:...@dpg-...singapore-postgres.render.com/sentinelops`).
3. Run the automated initialization script from your local terminal:
   ```bash
   python scripts/init_render_db.py "<RENDER_EXTERNAL_DATABASE_URL>"
   ```
   *(This creates the `ide09` schema, all 8 tables, indexes, and seeds supervisor chat ID `1845199518`.)*

---

### Step 4: Configure n8n Credentials & Workflows
1. Open your live n8n Render URL (e.g. `https://sentinelops-n8n.onrender.com`).
2. Create your owner account on first login.
3. Configure Credentials in the n8n UI:
   - **Postgres:**
     - Host: `sentinelops-db` *(Render internal hostname)*
     - Database: `sentinelops`
     - User: `sentinel`
     - Password: *(from Render database credentials)*
     - Port: `5432`
     - Credential Name: `SentinelOps Postgres`
   - **OpenAI API:**
     - Name: `OpenAI account`
     - API Key: *(Your OpenAI API key)*
   - **Telegram API:**
     - Name: `Telegram account`
     - Access Token: `9045682587:AAGOHDz0usTpkSJ2t1PBcJ3DNyjW9H2gWko`
4. Import the 4 workflow files from the `workflows/` directory:
   - `workflows/1-entry-pesan-konfirmasi.json`
   - `workflows/2-core-agent.json`
   - `workflows/3-core-konfirmasi.json`
   - `workflows/4-dashboard-pengingat.json`
5. Toggle all 4 workflows to **Active**.

---

### Step 5: Switch Telegram Webhook to Render
Run the webhook registration helper from your terminal, passing your live Render n8n URL:
```bash
python scripts/register_telegram_webhook.py https://sentinelops-n8n.onrender.com
```
*(This sets the webhook URL with the required secret token handshake `hy4bNgxoLJSKoHCW_node-telegram-trigger`.)*

---

### Step 6: Access Live SCADA 3D Web Dashboard
1. Open your deployed Static Site URL (e.g. `https://sentinelops-scada-dashboard.onrender.com`).
2. The dashboard will automatically connect to your Render n8n backend:
   ```
   https://sentinelops-scada-dashboard.onrender.com/?n8n=https://sentinelops-n8n.onrender.com
   ```
3. Verify that the 3D Digital Twin, live fault markers, expense charts, and WIB clock are all streaming live!
