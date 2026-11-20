Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SentinelOps AI - Local Development Launcher" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check if Docker daemon is running
Write-Host "[*] Checking Docker status..." -ForegroundColor Yellow
$dockerReady = $false
try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -eq 0) { $dockerReady = $true }
} catch {}

if (-not $dockerReady) {
    Write-Host "[!] Docker Desktop is not ready yet. Starting Docker Desktop..." -ForegroundColor Yellow
    if (Test-Path 'C:\Program Files\Docker\Docker\Docker Desktop.exe') {
        Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
    } else {
        Write-Host "[-] Please open Docker Desktop from your Start menu." -ForegroundColor Red
    }

    Write-Host "[*] Waiting for Docker to start (up to 45s)..." -ForegroundColor Yellow
    for ($i = 1; $i -le 30; $i++) {
        Start-Sleep -Seconds 2
        try {
            $null = docker info 2>&1
            if ($LASTEXITCODE -eq 0) {
                $dockerReady = $true
                break
            }
        } catch {}
    }
}

if (-not $dockerReady) {
    Write-Host ""
    Write-Host "[-] Docker is still starting up." -ForegroundColor Red
    Write-Host "    Please ensure Docker Desktop is open and green in your taskbar, then run this script again!" -ForegroundColor Yellow
    exit 1
}

Write-Host "[+] Docker is running!" -ForegroundColor Green

# 2. Launch Docker Compose
Write-Host "[*] Starting local containers (Postgres, n8n, 3D Dashboard, Cloudflare Tunnel)..." -ForegroundColor Yellow
docker compose up -d

Write-Host "[*] Waiting 12 seconds for PostgreSQL and n8n to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 12

# 3. Initialize Postgres Schema
Write-Host "[*] Initializing ide09 schema in PostgreSQL..." -ForegroundColor Yellow
Get-Content sql/schema.sql | docker exec -i sentinelops-postgres psql -U sentinel -d sentinelops

# 4. Provision credentials
Write-Host "[*] Setting up credentials in n8n..." -ForegroundColor Yellow
python scripts/setup_n8n_credentials.py

# 5. Import Workflows
Write-Host "[*] Importing workflows into n8n..." -ForegroundColor Yellow
docker exec sentinelops-n8n n8n import:workflow --separate --input=/home/node/workflows

# 6. Publish Workflows
Write-Host "[*] Publishing workflows..." -ForegroundColor Yellow
python scripts/publish_workflows.py

# 7. Extract Cloudflare Tunnel and register Telegram webhook
Write-Host "[*] Extracting Cloudflare tunnel URL..." -ForegroundColor Yellow
$tunnelUrl = ""
for ($i = 1; $i -le 20; $i++) {
    $logs = docker logs sentinelops-tunnel 2>&1
    $matches = [regex]::Matches($logs, 'https://[-a-z0-9.]*\.trycloudflare\.com')
    if ($matches.Count -gt 0) {
        $tunnelUrl = $matches[$matches.Count - 1].Value
        break
    }
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  🚀 SentinelOps AI is RUNNING LOCALLY!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " - SCADA 3D Web Dashboard : http://localhost:8085" -ForegroundColor Cyan
Write-Host " - n8n Automation Engine  : http://localhost:5690" -ForegroundColor Cyan
if ($tunnelUrl) {
    Write-Host " - Cloudflare Public URL  : $tunnelUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[*] Registering Telegram webhook with tunnel..." -ForegroundColor Yellow
    python scripts/register_telegram_webhook.py "$tunnelUrl"
}

Write-Host ""
Write-Host "[*] Opening SCADA 3D Web Dashboard in your browser..." -ForegroundColor Green
Start-Process "http://localhost:8085"
