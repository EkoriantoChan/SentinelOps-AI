# SentinelOps AI - Cloud Migration & Deployment Guide (Render)

This guide documents how to deploy **SentinelOps AI** to Render using the pre-configured `render.yaml` blueprint or manual service provisioning.

---

## 1. Cloud Architecture Overview

| Component | Render Service Type | Details |
| :--- | :--- | :--- |
| **PostgreSQL 16** | Managed Database | Host `ide09` operational, security, and audit tables. Timezone: `Asia/Jakarta`. |
| **n8n Automation Engine** | Web Service (Docker) | Runs `docker.n8n.io/n8nio/n8n:2.44.7` with 5GB persistent disk for workflow storage. |
| **SCADA Control-Plane** | Static Site | Serves `dashboard/` static assets (`index.html`, `styles.css`, `app.js`). |

---

## 2. Deployment Steps

### Step 1: Provision via Render Blueprint
1. Push this repository to GitHub or GitLab.
2. In the Render Dashboard, click **New +** → **Blueprint**.
3. Select your repository. Render will automatically parse `render.yaml` and configure:
   - Database: `sentinelops-db` (PostgreSQL 16)
   - Web Service: `sentinelops-n8n`
   - Static Site: `sentinelops-scada-dashboard`
4. Click **Apply**.

### Step 2: Initialize Database Schema (`ide09`)
1. Once `sentinelops-db` is provisioned, copy the **External Database URL** or **PSQL Command** from Render.
2. Run the initialization script from your local terminal:
   ```bash
   psql "<RENDER_EXTERNAL_DATABASE_URL>" -f sql/schema.sql
   ```
3. Verify that all 8 tables in `ide09` (including `equipment_registry`) and seed data are populated:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'ide09';
   ```

### Step 3: Configure n8n Credentials & Workflows
1. Open your live n8n Render URL (e.g. `https://sentinelops-n8n.onrender.com`).
2. Create your n8n owner account.
3. Add Credentials in n8n UI:
   - **Postgres:**
     - Host: `sentinelops-db` (internal host from Render)
     - Database: `sentinelops`
     - User: `sentinel`
     - Password: *(from Render database credentials)*
     - Port: `5432`
     - Credential Name: `SentinelOps Postgres`
   - **OpenAI API:** Add your `OPENAI_API_KEY`.
   - **Telegram API:** Add your bot token from `@BotFather`.
4. Import the 4 workflows from the `workflows/` directory:
   - `workflows/1-entry-pesan-konfirmasi.json`
   - `workflows/2-core-agent.json`
   - `workflows/3-core-konfirmasi.json`
   - `workflows/4-dashboard-pengingat.json`
5. Activate all 4 workflows.

### Step 4: Register Telegram Webhook
To bind Telegram updates to your Render deployment:
```bash
curl -F "url=https://sentinelops-n8n.onrender.com/webhook/telegram" https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook
```

### Step 5: Configure SCADA Dashboard Base URL
In `dashboard/app.js`, set `N8N_BASE_URL` to your production n8n Render domain:
```javascript
const N8N_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5690'
  : 'https://sentinelops-n8n.onrender.com';
```

---

## 3. Production Governance Verification
Once deployed on Render, verify the security perimeter:
1. **Allowlist:** Send a message from an unlisted Telegram ID → verify rejection response and log entry in `ide09.audit_log`.
2. **Guardrail:** Send `hapus semua tugas` → verify guardrail block response and `guardrail_blocked` audit event.
3. **HITL:** Submit an equipment fault report → verify inline confirmation buttons `[Setuju]` / `[Batal]` before database commit.
