import { NextResponse } from 'next/server'

const SUPABASE_URL = 'https://ptaqytvztkhjpuawdxng.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0YXF5dHZ6dGtoanB1YXdkeG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDAwNjYsImV4cCI6MjA4NzUxNjA2Nn0.V9lzpPsCZX3X9rdTTa0cTz6Al47wDeMNiVC7WXbTfq4'

const INTAKE_SYSTEM = `You are VIBE, an AI product assistant. A user wants to build a software tool. Ask 2-3 targeted questions based on exactly what they described, then produce a complete build spec.
Rules:
- Read the user's prompt carefully before asking anything
- Ask questions specific to what they described — not generic questions
- Ask only ONE question at a time, one sentence max
- After 2-3 exchanges output EXACTLY this JSON and nothing else:
  {"ready": true, "enrichedPrompt": "<complete detailed spec including all field names, entity types, user roles, and workflows the user confirmed>", "summary": "<one line>"}
- Never ask more than 3 questions
- Be conversational, direct, no fluff
Examples of good targeted questions:
- For a CRM: "What fields does a contact need — name, email, phone, company, status?"
- For a task tracker: "What stages do tasks move through — todo, in progress, done, or something custom?"
- For inventory: "Are you tracking quantity levels, reorder points, or just an item catalog?"
- For a booking system: "Are these bookings for people, resources like rooms, or both?"
The enrichedPrompt must be specific enough to build the exact app — include entity names, field names, relationships, and workflows the user confirmed.`

export async function POST(request: Request) {
  const { messages, build } = await request.json()

  if (build) {
    const prompt = messages[messages.length - 1]?.content ?? ''
    const APP_SYSTEM = `You are VIBE, a full-stack app builder.
BUILD A WORKING APPLICATION. NOT a website. NOT a landing page. NOT a marketing page.
The app opens directly to a DATA TABLE. ALL data reads and writes use the Supabase REST API. ZERO hardcoded records.
Output starts with <!DOCTYPE html>. No explanation, no preamble, no markdown.
HEAD must include:
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700;800&display=swap" rel="stylesheet">
<script>window.__VIBE_SUPABASE_URL__="https://ptaqytvztkhjpuawdxng.supabase.co";window.__VIBE_SUPABASE_ANON_KEY__="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0YXF5dHZ6dGtoanB1YXdkeG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDAwNjYsImV4cCI6MjA4NzUxNjA2Nn0.V9lzpPsCZX3X9rdTTa0cTz6Al47wDeMNiVC7WXbTfq4";</script>
STYLE:
:root{--bg:#0f172a;--text:#f1f5f9;--primary:#7c3aed;--accent:#06b6d4;--surface:#1e293b;--surface2:#273549;--border:#334155;--danger:#ef4444;--success:#22c55e;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;height:100vh;overflow:hidden;}
REQUIRED LAYOUT:
<body>
<div style="display:flex;height:100vh;overflow:hidden;">
  <aside id="sidebar" style="width:240px;min-width:240px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow-y:auto;">
    <div style="padding:1.5rem 1rem;border-bottom:1px solid var(--border);"><h1 style="font-family:'Space Grotesk',sans-serif;font-size:1.1rem;font-weight:700;color:var(--primary);">APP NAME</h1></div>
    <nav id="sidebar-nav" style="padding:1rem 0.5rem;display:flex;flex-direction:column;gap:0.25rem;"></nav>
  </aside>
  <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
    <header style="padding:1rem 1.5rem;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
      <h2 id="view-title" style="font-size:1.1rem;font-weight:600;color:var(--text);">Records</h2>
      <button id="btn-add" style="background:var(--primary);color:#fff;border:none;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;font-weight:500;font-size:0.875rem;">+ Add New</button>
    </header>
    <div style="padding:0.75rem 1.5rem;background:var(--surface);border-bottom:1px solid var(--border);display:flex;gap:0.75rem;">
      <input id="search-input" placeholder="Search..." style="flex:1;max-width:320px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:0.4rem 0.75rem;font-size:0.875rem;outline:none;">
    </div>
    <main id="main-content" style="flex:1;overflow:auto;padding:1.5rem;">
      <div id="loading-state" style="text-align:center;padding:4rem;color:#64748b;">Loading...</div>
      <div id="empty-state" style="display:none;text-align:center;padding:4rem 2rem;">
        <p style="color:#64748b;font-size:1rem;margin-bottom:1rem;">No records yet</p>
        <button id="btn-empty-add" style="background:var(--primary);color:#fff;border:none;padding:0.6rem 1.25rem;border-radius:6px;cursor:pointer;font-weight:500;">Add your first record</button>
      </div>
      <div id="table-container" style="display:none;overflow-x:auto;"></div>
    </main>
  </div>
</div>
<div id="modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:50;"></div>
<div id="modal" style="display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:2rem;width:480px;max-width:90vw;max-height:85vh;overflow-y:auto;z-index:51;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
    <h3 id="modal-title" style="font-size:1rem;font-weight:600;color:var(--text);">Add Record</h3>
    <button id="modal-close-btn" style="background:none;border:none;color:var(--text);font-size:1.5rem;cursor:pointer;line-height:1;">&times;</button>
  </div>
  <form id="record-form"></form>
</div>
<div id="vibe-toast" style="display:none;position:fixed;bottom:1.5rem;right:1.5rem;padding:0.75rem 1.25rem;border-radius:8px;font-size:0.875rem;z-index:100;color:#fff;"></div>
</body>
ALL DATA lives in Supabase table app_data: {id uuid, collection text, record jsonb, created_at timestamptz}
Infer collection name(s) from the prompt (contacts, deals, tasks, etc).
REQUIRED JAVASCRIPT — implement every function completely, no stubs:
const COLLECTION = 'INFER_FROM_PROMPT';
let allRows = [];
let editingId = null;
function vibeHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': window.__VIBE_SUPABASE_ANON_KEY__,
    'Authorization': 'Bearer ' + window.__VIBE_SUPABASE_ANON_KEY__
  };
}
async function loadRecords() {
  document.getElementById('loading-state').style.display = 'block';
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('table-container').style.display = 'none';
  try {
    const r = await fetch(window.__VIBE_SUPABASE_URL__ + '/rest/v1/app_data?collection=eq.' + COLLECTION + '&order=created_at.desc', { headers: vibeHeaders() });
    allRows = await r.json();
    renderTable(allRows);
  } catch(e) { showToast('Failed to load records', 'error'); }
  document.getElementById('loading-state').style.display = 'none';
}
function renderTable(rows) {
  if (!rows || rows.length === 0) {
    document.getElementById('empty-state').style.display = 'block';
    document.getElementById('table-container').style.display = 'none';
    return;
  }
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('table-container').style.display = 'block';
  const fields = Object.keys(rows[0].record || {});
  let html = '<table style="width:100%;border-collapse:collapse;font-size:0.875rem;">';
  html += '<thead style="background:var(--surface2);"><tr>';
  fields.forEach(f => { html += '<th style="text-align:left;padding:0.6rem 0.75rem;color:#94a3b8;font-weight:500;border-bottom:1px solid var(--border);">' + f + '</th>'; });
  html += '<th style="text-align:right;padding:0.6rem 0.75rem;color:#94a3b8;font-weight:500;border-bottom:1px solid var(--border);">Actions</th></tr></thead><tbody>';
  rows.forEach(row => {
    html += '<tr style="border-bottom:1px solid var(--border);">';
    fields.forEach(f => {
      const val = row.record[f] ?? '';
      html += '<td style="padding:0.6rem 0.75rem;color:var(--text);">' + String(val) + '</td>';
    });
    html += '<td style="padding:0.6rem 0.75rem;text-align:right;">';
    html += '<button class="edit-btn" data-id="' + row.id + '" style="background:none;border:1px solid var(--border);color:var(--text);padding:0.25rem 0.6rem;border-radius:4px;cursor:pointer;font-size:0.75rem;margin-right:0.4rem;">Edit</button>';
    html += '<button class="delete-btn" data-id="' + row.id + '" style="background:none;border:1px solid var(--danger);color:var(--danger);padding:0.25rem 0.6rem;border-radius:4px;cursor:pointer;font-size:0.75rem;">Delete</button>';
    html += '</td></tr>';
  });
  html += '</tbody></table>';
  document.getElementById('table-container').innerHTML = html;
}
function openModal(id) {
  editingId = id || null;
  document.getElementById('modal-title').textContent = id ? 'Edit Record' : 'Add Record';
  const form = document.getElementById('record-form');
  const fields = FORM_FIELDS; // array of {name, label, type, required}
  let html = '';
  let record = {};
  if (id) { const row = allRows.find(r => r.id === id); if (row) record = row.record; }
  fields.forEach(f => {
    html += '<div style="margin-bottom:1rem;">';
    html += '<label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:0.4rem;">' + f.label + (f.required ? ' *' : '') + '</label>';
    if (f.type === 'select') {
      html += '<select name="' + f.name + '" style="width:100%;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:0.5rem 0.75rem;font-size:0.875rem;">';
      f.options.forEach(o => { html += '<option value="' + o + '"' + (record[f.name] === o ? ' selected' : '') + '>' + o + '</option>'; });
      html += '</select>';
    } else if (f.type === 'textarea') {
      html += '<textarea name="' + f.name + '" rows="3" style="width:100%;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:0.5rem 0.75rem;font-size:0.875rem;resize:vertical;">' + (record[f.name] || '') + '</textarea>';
    } else {
      html += '<input type="' + f.type + '" name="' + f.name + '" value="' + (record[f.name] || '') + '" ' + (f.required ? 'required' : '') + ' style="width:100%;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:0.5rem 0.75rem;font-size:0.875rem;">';
    }
    html += '</div>';
  });
  html += '<div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1.5rem;">';
  html += '<button type="button" class="cancel-btn" style="background:none;border:1px solid var(--border);color:var(--text);padding:0.5rem 1rem;border-radius:6px;cursor:pointer;">Cancel</button>';
  html += '<button type="submit" style="background:var(--primary);color:#fff;border:none;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;font-weight:500;">Save</button>';
  html += '</div>';
  form.innerHTML = html;
  document.getElementById('modal-overlay').style.display = 'block';
  document.getElementById('modal').style.display = 'block';
}
function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById('modal').style.display = 'none';
  editingId = null;
}
async function saveRecord(event) {
  event.preventDefault();
  const form = event.target;
  const data = {};
  new FormData(form).forEach((v, k) => { data[k] = v; });
  const btn = form.querySelector('[type=submit]');
  btn.textContent = 'Saving...'; btn.disabled = true;
  try {
    if (editingId) {
      await fetch(window.__VIBE_SUPABASE_URL__ + '/rest/v1/app_data?id=eq.' + editingId, { method: 'PATCH', headers: { ...vibeHeaders(), 'Prefer': 'return=representation' }, body: JSON.stringify({ record: data }) });
    } else {
      await fetch(window.__VIBE_SUPABASE_URL__ + '/rest/v1/app_data', { method: 'POST', headers: { ...vibeHeaders(), 'Prefer': 'return=representation' }, body: JSON.stringify({ collection: COLLECTION, record: data }) });
    }
    closeModal();
    await loadRecords();
    showToast('Saved successfully', 'success');
  } catch(e) { showToast('Save failed', 'error'); }
  btn.textContent = 'Save'; btn.disabled = false;
}
async function confirmDelete(id) {
  if (!confirm('Delete this record?')) return;
  try {
    await fetch(window.__VIBE_SUPABASE_URL__ + '/rest/v1/app_data?id=eq.' + id, { method: 'DELETE', headers: vibeHeaders() });
    await loadRecords();
    showToast('Deleted', 'success');
  } catch(e) { showToast('Delete failed', 'error'); }
}
function filterTable() {
  const q = document.getElementById('search-input').value.toLowerCase();
  renderTable(allRows.filter(row => JSON.stringify(row.record).toLowerCase().includes(q)));
}
function showToast(msg, type) {
  const t = document.getElementById('vibe-toast');
  t.textContent = msg;
  t.style.background = type === 'success' ? '#22c55e' : '#ef4444';
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 3000);
}
document.addEventListener('DOMContentLoaded', function() {
  loadRecords();
  document.getElementById('btn-add').addEventListener('click', function() { openModal(); });
  document.getElementById('btn-empty-add').addEventListener('click', function() { openModal(); });
  document.getElementById('modal-overlay').addEventListener('click', closeModal);
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('search-input').addEventListener('input', filterTable);
  document.getElementById('record-form').addEventListener('submit', function(e) { saveRecord(e); });
  document.addEventListener('click', function(e) {
    var editBtn = e.target.closest('.edit-btn');
    var deleteBtn = e.target.closest('.delete-btn');
    var cancelBtn = e.target.closest('.cancel-btn');
    if (editBtn) openModal(editBtn.dataset.id);
    if (deleteBtn) confirmDelete(deleteBtn.dataset.id);
    if (cancelBtn) closeModal();
  });
});
CRITICAL: Replace COLLECTION and FORM_FIELDS with actual values based on the user prompt.
FORM_FIELDS is a JS array defined before openModal: const FORM_FIELDS = [{name:'field_name', label:'Field Label', type:'text|email|number|select|textarea', required:true, options:['opt1','opt2']}];
For select fields infer sensible options from the prompt context.
Output MUST start <!DOCTYPE html> and end </html>.`
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        system: APP_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    return NextResponse.json({ html: data.content?.[0]?.text ?? '', usage: data.usage })
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: INTAKE_SYSTEM,
      messages,
    }),
  })
  const data = await res.json()
  return NextResponse.json({ text: data.content?.[0]?.text ?? '' })
}
