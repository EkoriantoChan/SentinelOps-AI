// SentinelOps AI - SCADA Control-Plane Application Logic
// Dynamic n8n Base URL: auto-detects localhost, Render, or allows query param override (?n8n=...)
const urlParams = new URLSearchParams(window.location.search);
const customN8n = urlParams.get('n8n') || localStorage.getItem('sentinelops_n8n_url');
const N8N_BASE_URL = customN8n || (
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5690'
    : (window.location.origin.includes('onrender.com') 
        ? 'https://sentinelops-n8n.onrender.com' 
        : window.location.origin)
);

// Real-time WIB Clock
function updateWibClock() {
  const clockEl = document.getElementById('current-wib-clock');
  if (!clockEl) return;
  const now = new Date();
  const options = {
    timeZone: 'Asia/Jakarta',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  const timeStr = new Intl.DateTimeFormat('id-ID', options).format(now);
  clockEl.textContent = `${timeStr} WIB`;
}
setInterval(updateWibClock, 1000);
updateWibClock();

// State Cache
let dashboardCache = null;

// Currency Formatter
function formatIDR(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

// Fetch Dashboard Data from n8n Webhook
async function fetchDashboardData() {
  const n8nStatusEl = document.getElementById('n8n-status');
  try {
    const res = await fetch(`${N8N_BASE_URL}/webhook/dashboard-data`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    dashboardCache = data;
    renderDashboard(data);
    if (n8nStatusEl) {
      n8nStatusEl.textContent = 'ONLINE (OK)';
      n8nStatusEl.style.color = 'var(--accent-green)';
    }
  } catch (err) {
    console.warn('Dashboard fetch failed (n8n may still be initializing):', err.message);
    if (n8nStatusEl) {
      n8nStatusEl.textContent = 'CONNECTING...';
      n8nStatusEl.style.color = 'var(--accent-amber)';
    }
  }
}

// Render Complete SCADA UI
function renderDashboard(data) {
  if (!data) return;

  // 1. KPIs
  const kpi = data.kpi || {};
  document.getElementById('kpi-open-faults').textContent = kpi.open_faults ?? 0;
  document.getElementById('kpi-critical-badge').textContent = `${kpi.critical_faults ?? 0} CRITICAL`;
  document.getElementById('kpi-total-spend').textContent = formatIDR(kpi.total_expenses);
  document.getElementById('kpi-active-reminders').textContent = kpi.active_reminders ?? 0;
  
  const pendingCount = kpi.pending_actions ?? (data.pending ? data.pending.length : 0);
  document.getElementById('kpi-pending-actions').textContent = pendingCount;
  document.getElementById('hitl-queue-count').textContent = `${pendingCount} Proposisi`;

  // 2. HITL Pending Approvals
  renderHitlList(data.pending || []);

  // 3. Equipment Faults Ledger
  renderFaultsTable(data.faults || []);

  // 4. Spare-Part Expenses
  renderExpensesTable(data.expenses || []);

  // 5. Preventive Reminders
  renderRemindersTable(data.reminders || []);

  // 6. Security Audit Feed
  renderAuditFeed(data.audit_log || []);

  // 7. 3D Digital Twin Telemetry Synchronization
  if (window.PlantDigitalTwin && typeof window.PlantDigitalTwin.updateFaultStatus === 'function') {
    window.PlantDigitalTwin.updateFaultStatus(data.faults || []);
  }
}

// Render HITL Approval List
function renderHitlList(pendingList) {
  const container = document.getElementById('hitl-list');
  if (!container) return;

  if (pendingList.length === 0) {
    container.innerHTML = `<div class="empty-state">✅ Tidak ada usulan pending. Semua perubahan operasional telah diproses.</div>`;
    return;
  }

  container.innerHTML = pendingList.map(item => `
    <div class="hitl-item" data-id="${item.id}" data-request="${item.request_id}">
      <div class="hitl-header-row">
        <span class="hitl-tool-badge">TOOL: ${escapeHtml(item.tool)}</span>
        <span class="hitl-req-id">REQ: ${escapeHtml(item.request_id)} (Chat: ${escapeHtml(item.chat_id)})</span>
      </div>
      <div class="hitl-summary">${escapeHtml(item.ringkasan)}</div>
      <div class="hitl-args">${escapeHtml(JSON.stringify(item.args))}</div>
      <div class="hitl-actions-row">
        <button class="btn-approve" onclick="handleDecision('${item.request_id}', '${item.chat_id}', 'confirm')">
          ✅ Setuju (Commit to DB)
        </button>
        <button class="btn-reject" onclick="handleDecision('${item.request_id}', '${item.chat_id}', 'cancel')">
          ❌ Batal (Reject & Log)
        </button>
      </div>
    </div>
  `).join('');
}

// Render Faults Table
function renderFaultsTable(faults) {
  const tbody = document.getElementById('tbody-faults');
  if (!tbody) return;

  if (faults.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">Tidak ada kerusakan mesin terbuka.</td></tr>`;
    return;
  }

  tbody.innerHTML = faults.map(f => `
    <tr class="fault-row" data-asset="${escapeHtml(f.asset_tag)}" style="cursor: pointer;" title="Klik untuk fokus 3D Digital Twin">
      <td><strong>#${f.id}</strong></td>
      <td><span class="badge-status terbuka">${escapeHtml(f.asset_tag)}</span></td>
      <td>${escapeHtml(f.line_area)}</td>
      <td>${escapeHtml(f.deskripsi)}</td>
      <td><span class="badge-sev ${f.severity}">${escapeHtml(f.severity)}</span></td>
      <td>${f.downtime_mins} m</td>
      <td>${f.tenggat ? f.tenggat.split('T')[0] : '-'}</td>
      <td><span class="badge-status ${f.status}">${escapeHtml(f.status)}</span></td>
    </tr>
  `).join('');

  // Attach row click to focus 3D machine
  tbody.querySelectorAll('.fault-row').forEach(row => {
    row.addEventListener('click', () => {
      const tag = row.getAttribute('data-asset');
      if (tag && window.PlantDigitalTwin && typeof window.PlantDigitalTwin.selectMachine === 'function') {
        window.PlantDigitalTwin.selectMachine(tag);
      }
    });
  });
}

// Render Expenses Table
function renderExpensesTable(expenses) {
  const tbody = document.getElementById('tbody-expenses');
  if (!tbody) return;

  if (expenses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Belum ada catatan pengeluaran sparepart.</td></tr>`;
    return;
  }

  tbody.innerHTML = expenses.map(e => `
    <tr>
      <td>#${e.id}</td>
      <td>${escapeHtml(e.asset_tag || '-')}</td>
      <td><strong>${escapeHtml(e.part_name)}</strong></td>
      <td><span class="badge-status aktif">${escapeHtml(e.kategori)}</span></td>
      <td><strong>${formatIDR(e.jumlah)}</strong></td>
      <td>${escapeHtml(e.vendor || '-')}</td>
      <td>${e.tanggal ? e.tanggal.split('T')[0] : '-'}</td>
    </tr>
  `).join('');
}

// Render Reminders Table
function renderRemindersTable(reminders) {
  const tbody = document.getElementById('tbody-reminders');
  if (!tbody) return;

  if (reminders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Tidak ada jadwal pengingat aktif.</td></tr>`;
    return;
  }

  tbody.innerHTML = reminders.map(r => {
    let dateStr = r.waktu;
    try {
      const d = new Date(r.waktu);
      dateStr = d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';
    } catch(e) {}

    return `
      <tr>
        <td>#${r.id}</td>
        <td><strong>${escapeHtml(r.asset_tag || '-')}</strong></td>
        <td>${escapeHtml(r.teks)}</td>
        <td>${dateStr}</td>
        <td><span class="badge-status ${r.status}">${escapeHtml(r.status)}</span></td>
      </tr>
    `;
  }).join('');
}

// Render Audit Feed
function renderAuditFeed(auditList) {
  const feed = document.getElementById('audit-feed');
  if (!feed) return;

  if (auditList.length === 0) {
    feed.innerHTML = `<div class="empty-state">Belum ada catatan audit.</div>`;
    return;
  }

  feed.innerHTML = auditList.map(a => {
    let timeStr = a.waktu;
    try {
      const d = new Date(a.waktu);
      timeStr = d.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false }) + ' WIB';
    } catch(e) {}

    let detailStr = '';
    if (a.detail) {
      if (typeof a.detail === 'object') {
        detailStr = JSON.stringify(a.detail);
      } else {
        detailStr = String(a.detail);
      }
    }

    return `
      <div class="audit-item ${escapeHtml(a.event)}">
        <div class="audit-top">
          <span class="audit-event">[${escapeHtml(a.event)}]</span>
          <span class="audit-time">${timeStr} (Chat: ${escapeHtml(a.chat_id || '-')})</span>
        </div>
        <div class="audit-detail">${escapeHtml(detailStr)}</div>
      </div>
    `;
  }).join('');
}

// Handle HITL Supervisor Decision (Confirm / Cancel)
async function handleDecision(requestId, chatId, decision) {
  if (!confirm(`Konfirmasi keputusan: Apakah Anda yakin ingin memilih ${decision.toUpperCase()} untuk Request ID: ${requestId}?`)) {
    return;
  }

  try {
    const res = await fetch(`${N8N_BASE_URL}/webhook/konfirmasi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId || '100200300',
        request_id: requestId,
        decision: decision
      })
    });
    const result = await res.json();
    alert(`Hasil: ${result.message || 'Keputusan berhasil diproses!'}`);
    fetchDashboardData();
  } catch (err) {
    alert(`Gagal memproses keputusan: ${err.message}`);
  }
}

// Operator Console Submission
document.getElementById('btn-submit-console')?.addEventListener('click', async () => {
  const chatId = document.getElementById('console-chat-id').value.trim();
  const prompt = document.getElementById('console-prompt').value.trim();
  const outputEl = document.getElementById('console-output');
  const contentEl = document.getElementById('output-content');

  if (!prompt) {
    alert('Silakan masukkan perintah atau laporan anomali.');
    return;
  }

  outputEl.classList.remove('hidden');
  contentEl.textContent = 'Mengirim perintah ke SentinelOps Agent...';

  try {
    const res = await fetch(`${N8N_BASE_URL}/webhook/pesan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        teks: prompt,
        source: 'webhook'
      })
    });

    const data = await res.json();
    contentEl.textContent = data.reply_text || data.message || JSON.stringify(data, null, 2);
    // Refresh dashboard after a short pause
    setTimeout(fetchDashboardData, 1000);
  } catch (err) {
    contentEl.textContent = `Error: ${err.message}`;
  }
});

// Preset Buttons Handler
document.querySelectorAll('.btn-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    const text = btn.getAttribute('data-text');
    const input = document.getElementById('console-prompt');
    if (input) {
      input.value = text;
      input.focus();
    }
  });
});

// Trigger Preventive Reminders Evaluator
document.getElementById('btn-trigger-reminders')?.addEventListener('click', async () => {
  try {
    const res = await fetch(`${N8N_BASE_URL}/webhook/trigger-reminders`, { method: 'POST' });
    const data = await res.json();
    alert('Evaluator pengingat preventif berhasil dijalankan!');
    fetchDashboardData();
  } catch (err) {
    alert(`Gagal menjalankan evaluator: ${err.message}`);
  }
});

// Refresh Button Handler
document.getElementById('btn-refresh')?.addEventListener('click', fetchDashboardData);

// Utility: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initial Fetch & Periodic Auto-Refresh (Every 5 seconds)
fetchDashboardData();
setInterval(fetchDashboardData, 5000);
