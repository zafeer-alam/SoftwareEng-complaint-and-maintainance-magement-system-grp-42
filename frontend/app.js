// ─────────────────────────────────────────────────────────
// Campus Complaint System JavaScript
// Separated logic for API, auth, navigation, rendering, actions,
// and initialization so the frontend is easier to maintain.
// ─────────────────────────────────────────────────────────

// ── API CONFIGURATION ──
const API_BASE_URL = 'http://localhost:5000/api';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// ── API HELPER FUNCTIONS ──
function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = authToken || localStorage.getItem('authToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    authToken = token;
  }
  return headers;
}

async function apiCall(endpoint, method = 'GET', body = null) {
  try {
    const options = { method, headers: getHeaders() };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.msg || `API Error: ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error('API Error:', error);
    showToast(`❌ Error: ${error.message}`);
    throw error;
  }
}

// ── AUTHENTICATION FUNCTIONS ──
async function login(email, password) {
  try {
    const response = await apiCall('/auth/login', 'POST', { email, password });
    authToken = response.token;
    const responseUser = response.user || response;
    currentUser = {
      id: responseUser.id || responseUser._id,
      _id: responseUser._id || responseUser.id,
      name: responseUser.name,
      email: responseUser.email,
      role: responseUser.role
    };
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showToast(`✅ Logged in as ${currentUser.name || currentUser.email || 'User'}`);
    switchRole(currentUser.role === 'admin' ? 'admin' : currentUser.role === 'staff' ? 'staff' : 'user');
    return currentUser;
  } catch (error) {
    showToast('❌ Login failed: ' + error.message);
    throw error;
  }
}

async function register(name, email, password) {
  try {
    const response = await apiCall('/auth/register', 'POST', { name, email, password });
    authToken = response.token;
    const responseUser = response.user || response;
    currentUser = {
      id: responseUser.id || responseUser._id,
      _id: responseUser._id || responseUser.id,
      name: responseUser.name,
      email: responseUser.email,
      role: responseUser.role
    };
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showToast('✅ Account created! Welcome ' + (currentUser.name || currentUser.email || 'User'));
    return currentUser;
  } catch (error) {
    showToast('❌ Registration failed: ' + error.message);
    throw error;
  }
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  showToast('👋 Logged out successfully');
  location.reload();
}

// ── DATA STORE ──
let complaints = [];
let currentComplaintId = null;
let adminFilterStatus = '';
let adminFilterPriority = '';
let adminSearch = '';
let _uSearch = '';
let _uStatus = '';
let _uCat = '';

// ── NAVIGATION ──
function navigate(pageId, navEl) {
  if (!authToken) {
    showToast('❌ Please login first');
    return;
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  if (navEl) navEl.classList.add('active');
  if (pageId === 'page-user-home') renderUserHome();
  if (pageId === 'page-user-complaints') renderUserComplaints();
  if (pageId === 'page-admin-dash') renderAdminDash();
  if (pageId === 'page-admin-complaints') renderAdminTable();
  if (pageId === 'page-staff-home') renderStaffTasks();
  if (pageId === 'page-staff-completed') renderStaffDone();
  if (pageId === 'page-reports') renderReports();
}

function switchRole(role) {
  ['user-nav', 'staff-nav', 'admin-nav'].forEach(n => document.getElementById(n).style.display = 'none');
  document.getElementById(role + '-nav').style.display = 'block';
  const pages = { user: 'page-user-home', staff: 'page-staff-home', admin: 'page-admin-dash' };
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  navigate(pages[role], document.querySelector('#' + role + '-nav .nav-item'));
}

// ── STATUS HELPERS ──
function statusBadge(s) {
  const m = { 'Pending': 'badge-pending', 'In Progress': 'badge-progress', 'Resolved': 'badge-resolved' };
  return `<span class="badge ${m[s] || ''}">${s}</span>`;
}

function priorityBadge(p) {
  const m = {
    'Critical': 'background:var(--red-light);color:var(--red)',
    'High': 'background:var(--orange-light);color:var(--orange)',
    'Medium': 'background:var(--yellow-light);color:var(--yellow)',
    'Low': 'background:var(--accent-light);color:var(--accent)'
  };
  return `<span class="badge" style="${m[p] || ''}">${p}</span>`;
}

// ── USER DASHBOARD ──
async function renderUserHome() {
  try {
    if (!currentUser?._id) return;
    const userComplaints = await apiCall(`/complaints/user/${currentUser._id}`);
    const pending = userComplaints.filter(c => c.status === 'Pending').length;
    const prog = userComplaints.filter(c => c.status === 'In Progress').length;
    const res = userComplaints.filter(c => c.status === 'Resolved').length;
    document.getElementById('u-pending').textContent = pending;
    document.getElementById('u-progress').textContent = prog;
    document.getElementById('u-resolved').textContent = res;
    document.getElementById('active-complaint-count').textContent = pending + prog;
    const welcome = document.getElementById('welcome-name');
    if (welcome) welcome.textContent = currentUser?.name || currentUser?.email || 'User';
    const badge = document.getElementById('badge-user');
    if (badge) badge.textContent = userComplaints.length;
    const list = document.getElementById('user-recent-list');
    list.innerHTML = userComplaints.slice(0, 4).map(c => complaintCard(c, 'user')).join('') || '<div class="empty-state"><p>No complaints yet.</p></div>';
  } catch (error) {
    console.log('Error rendering user home:', error);
  }
}

async function renderUserComplaints(search = '', status = '', cat = '') {
  try {
    if (!currentUser?._id) return;
    let data = await apiCall(`/complaints/user/${currentUser._id}`);
    if (search) data = data.filter(c => c.subject.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase()));
    if (status) data = data.filter(c => c.status === status);
    if (cat) data = data.filter(c => c.category === cat);
    const badge = document.getElementById('badge-user');
    if (badge) badge.textContent = data.length;
    const list = document.getElementById('user-all-list');
    list.innerHTML = data.length ? data.map(c => complaintCard(c, 'user')).join('') : '<div class="empty-state"><p>No complaints found.</p></div>';
  } catch (error) {
    console.log('Error rendering user complaints:', error);
  }
}

function filterComplaints(v) { _uSearch = v; renderUserComplaints(_uSearch, _uStatus, _uCat); }
function filterByStatus(v) { _uStatus = v; renderUserComplaints(_uSearch, _uStatus, _uCat); }
function filterByCategory(v) { _uCat = v; renderUserComplaints(_uSearch, _uStatus, _uCat); }

// ── CARD RENDERING ──
function complaintCard(c, role) {
  const st = c.status === 'Pending' ? 'status-pending' : c.status === 'In Progress' ? 'status-progress' : 'status-resolved';
  const assignedName = c.assignedTo?.name || c.assignedTo || '';
  const dateStr = c.date || c.createdAt?.split('T')[0] || '';
  return `
  <div class="complaint-card border-l ${st}" onclick="viewComplaint('${c._id || c.id}','${role}')">
    <div class="complaint-header">
      <div>
        <div class="complaint-title">${c.subject}</div>
        <div class="complaint-meta">
          <span>📁 ${c.category}</span>
          <span>📍 ${c.location}</span>
          <span>📅 ${dateStr}</span>
          ${assignedName ? `<span>🔧 ${assignedName}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
        ${statusBadge(c.status)}
        ${priorityBadge(c.priority)}
      </div>
    </div>
    <div style="font-size:12px;color:var(--text3);margin-top:4px">${c._id?.substring(0,8) || c.id}</div>
  </div>`;
}

// ── DETAIL VIEW ──
async function viewComplaint(id, role) {
  try {
    const c = await apiCall(`/complaints/${id}`);
    if (!c) return;
    currentComplaintId = id;
    const assignedName = c.assignedTo?.name || '';
    const dateStr = c.createdAt?.split('T')[0] || c.date || '';
    const detailBody = document.getElementById('detail-body');
    const detailFooter = document.getElementById('detail-footer');
    if (!detailBody || !detailFooter) return;
    detailBody.innerHTML = `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        ${statusBadge(c.status)}${priorityBadge(c.priority)}
        <span class="badge badge-cat">${c.category}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div><div class="form-label">Complaint ID</div><code style="font-size:12px">${id.substring(0,8)}</code></div>
        <div><div class="form-label">Location</div><span style="font-size:13px">${c.location}</span></div>
        <div><div class="form-label">Filed By</div><span style="font-size:13px">${c.userId?.name || 'N/A'}</span></div>
        <div><div class="form-label">Date Filed</div><span style="font-size:13px">${dateStr}</span></div>
        <div><div class="form-label">Assigned To</div><span style="font-size:13px">${assignedName || '<em style="color:var(--text3)">Not assigned</em>'}</span></div>
      </div>
      <div style="margin-bottom:16px">
        <div class="form-label">Description</div>
        <div style="background:var(--bg);border-radius:var(--radius);padding:12px;font-size:13px;color:var(--text2);line-height:1.6">${c.description}</div>
      </div>
      ${c.image_url ? '<div style="background:var(--bg);border-radius:var(--radius);padding:24px;text-align:center;color:var(--text3);font-size:12px">📷 Photo attachment: <em>complaint_photo.jpg</em></div>' : ''}
      <div style="margin-top:16px">
        <div class="form-label">Status Timeline</div>
        <ul class="timeline" style="margin-top:10px">
          <li class="timeline-item"><div class="timeline-dot" style="background:var(--accent-light)">✓</div><div class="timeline-content"><strong style="font-size:12px">Complaint Submitted</strong><div class="timeline-meta">${dateStr} · by ${c.userId?.name || 'N/A'}</div></div></li>
          ${assignedName ? `<li class="timeline-item"><div class="timeline-dot" style="background:var(--blue-light)">👤</div><div class="timeline-content"><strong style="font-size:12px">Assigned to ${assignedName}</strong><div class="timeline-meta">By Admin</div></div></li>` : ''}
          ${c.status==='In Progress' ? `<li class="timeline-item"><div class="timeline-dot" style="background:var(--orange-light)">🔄</div><div class="timeline-content"><strong style="font-size:12px">Work In Progress</strong><div class="timeline-meta">Staff working on it</div></div></li>` : ''}
          ${c.status==='Resolved' ? `<li class="timeline-item"><div class="timeline-dot" style="background:var(--accent-light)">✅</div><div class="timeline-content"><strong style="font-size:12px">Resolved</strong><div class="timeline-meta">Issue fixed and closed</div></div></li>` : ''}
        </ul>
      </div>`;
    let footer = '';
    if (role === 'admin' && c.status === 'Pending') {
      footer = `<button class="btn btn-primary" onclick="closeModal('modal-detail');openModal('modal-assign')">Assign to Staff</button>`;
    } else if (role === 'staff' && c.status === 'In Progress') {
      footer = `<button class="btn btn-primary" onclick="resolveComplaint('${id}')">Mark as Resolved ✓</button>`;
    } else if (role === 'staff' && c.status === 'Pending') {
      footer = `<button class="btn btn-primary" onclick="startComplaint('${id}')">Start Working</button>`;
    }
    footer += `<button class="btn btn-secondary" onclick="closeModal('modal-detail')">Close</button>`;
    detailFooter.innerHTML = footer;
    openModal('modal-detail');
  } catch (error) {
    console.log('Error viewing complaint:', error);
  }
}

// ── ADMIN DASHBOARD ──
async function renderAdminDash() {
  try {
    const allComplaints = await apiCall('/complaints');
    const pending = allComplaints.filter(c => c.status === 'Pending').length;
    const prog = allComplaints.filter(c => c.status === 'In Progress').length;
    const res = allComplaints.filter(c => c.status === 'Resolved').length;
    const crit = allComplaints.filter(c => c.priority === 'Critical').length;
    document.getElementById('a-pending').textContent = pending;
    document.getElementById('a-progress').textContent = prog;
    document.getElementById('a-resolved').textContent = res;
    document.getElementById('a-critical').textContent = crit;
    document.getElementById('badge-admin').textContent = pending;
    const tl = document.getElementById('admin-timeline');
    tl.innerHTML = allComplaints.slice(-5).reverse().map(c => `
      <li class="timeline-item">
        <div class="timeline-dot" style="background:${c.status==='Resolved'?'var(--accent-light)':c.status==='In Progress'?'var(--blue-light)':'var(--yellow-light)'}">${c.status==='Resolved'?'✅':c.status==='In Progress'?'🔄':'⏳'}</div>
        <div class="timeline-content">
          <strong style="font-size:12px">${c.subject.substring(0,40)}${c.subject.length>40?'...':''}</strong>
          <div class="timeline-meta">${statusBadge(c.status)} · ${c.createdAt?.split('T')[0]} · ${c.userId?.name || 'N/A'}</div>
        </div>
      </li>`).join('');
    const cats = {};
    allComplaints.forEach(c => { cats[c.category] = (cats[c.category] || 0) + 1; });
    const max = Math.max(...Object.values(cats), 1);
    document.getElementById('cat-chart').innerHTML = Object.entries(cats).map(([k, v]) => `
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
          <span style="color:var(--text2)">${k}</span><span style="font-weight:600">${v}</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${(v/max*100).toFixed(0)}%;background:var(--accent-mid)"></div></div>
      </div>`).join('');
  } catch (error) {
    console.log('Error rendering admin dashboard:', error);
  }
}

// ── ADMIN TABLE ──
async function renderAdminTable() {
  try {
    let data = await apiCall('/complaints');
    if (adminSearch) data = data.filter(c => c.subject.toLowerCase().includes(adminSearch.toLowerCase()) || c.userId?.name?.toLowerCase().includes(adminSearch.toLowerCase()) || c._id?.toLowerCase().includes(adminSearch.toLowerCase()));
    if (adminFilterStatus) data = data.filter(c => c.status === adminFilterStatus);
    if (adminFilterPriority) data = data.filter(c => c.priority === adminFilterPriority);
    document.getElementById('admin-tbody').innerHTML = data.map(c => `
      <tr>
        <td><code style="font-size:11px">${c._id?.substring(0,8)}</code></td>
        <td style="max-width:200px"><div style="font-weight:500;font-size:13px">${c.subject}</div></td>
        <td><span class="badge badge-cat" style="font-size:10px">${c.category}</span></td>
        <td style="font-size:12px">${c.userId?.name || 'N/A'}</td>
        <td>${priorityBadge(c.priority)}</td>
        <td>${statusBadge(c.status)}</td>
        <td style="font-size:11px;color:var(--text3)">${c.createdAt?.split('T')[0]}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-secondary btn-sm" onclick="viewComplaint('${c._id}','admin')">View</button>
            ${c.status==='Pending' ? `<button class="btn btn-primary btn-sm" onclick="currentComplaintId='${c._id}';openModal('modal-assign')">Assign</button>` : ''}
          </div>
        </td>
      </tr>`).join('');
  } catch (error) {
    console.log('Error rendering admin table:', error);
  }
}

// ── STAFF VIEWS ──
async function renderStaffTasks() {
  try {
    const tasks = await apiCall('/complaints/pending-for-staff');
    document.getElementById('staff-task-count').textContent = tasks.length;
    document.getElementById('staff-task-list').innerHTML = tasks.length ? tasks.map(c => complaintCard(c, 'staff')).join('') : '<div class="empty-state"><p>No active tasks assigned.</p></div>';
  } catch (error) {
    console.log('Error rendering staff tasks:', error);
  }
}

async function renderStaffDone() {
  try {
    const done = await apiCall('/complaints/resolved');
    document.getElementById('staff-done-list').innerHTML = done.length ? done.map(c => complaintCard(c, 'staff')).join('') : '<div class="empty-state"><p>No completed tasks yet.</p></div>';
  } catch (error) {
    console.log('Error rendering staff done:', error);
  }
}

// ── REPORTS ──
async function renderReports() {
  try {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    const vols = [2, 3, 5, 4, 7, 6, 8];
    const maxV = Math.max(...vols);
    document.getElementById('monthly-chart').innerHTML = `
      <div style="display:flex;align-items:flex-end;gap:8px;height:120px;padding:8px 0">
        ${months.map((m, i) => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
            <div style="width:100%;background:var(--accent-mid);border-radius:4px 4px 0 0;height:${(vols[i]/maxV*100).toFixed(0)}px;min-height:8px;opacity:${i===6?1:0.6};transition:all 0.3s" title="${vols[i]} complaints"></div>
            <div style="font-size:10px;color:var(--text3)">${m}</div>
            <div style="font-size:10px;font-weight:600">${vols[i]}</div>
          </div>`).join('')}
      </div>`;
    const allComplaints = await apiCall('/complaints');
    const cats = {};
    allComplaints.forEach(c => { cats[c.category] = (cats[c.category] || 0) + 1; });
    const total = allComplaints.length || 1;
    document.getElementById('cat-dist').innerHTML = Object.entries(cats).map(([k, v]) => `
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
          <span>${k}</span><span style="color:var(--text3)">${v} (${(v/total*100).toFixed(0)}%)</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${(v/total*100).toFixed(0)}%;background:var(--blue)"></div></div>
      </div>`).join('');
    const staff = [
      { name: 'Rajan Kumar', assigned: 4, resolved: 14, time: '1.8d' },
      { name: 'Priya Sharma', assigned: 2, resolved: 9, time: '2.1d' },
      { name: 'Amit Singh', assigned: 5, resolved: 21, time: '1.5d' },
      { name: 'Meena Patel', assigned: 1, resolved: 7, time: '3.0d' },
      { name: 'Suresh Verma', assigned: 3, resolved: 18, time: '2.4d' },
    ];
    document.getElementById('staff-perf').innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>Staff Member</th><th>Assigned</th><th>Resolved</th><th>Avg Time</th><th>Rating</th></tr></thead>
        <tbody>${staff.map(s => `
          <tr>
            <td style="font-weight:500">${s.name}</td>
            <td>${s.assigned}</td>
            <td style="color:var(--accent-mid);font-weight:600">${s.resolved}</td>
            <td>${s.time}</td>
            <td>⭐ ${(3.5 + Math.random() * 1.5).toFixed(1)}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  } catch (error) {
    console.log('Error rendering reports:', error);
  }
}

// ── SUBMIT COMPLAINTS ──
async function submitComplaint() {
  if (!authToken || !currentUser) {
    showToast('❌ Please login first to submit a complaint');
    return;
  }
  const cat = document.getElementById('c-category').value;
  const sub = document.getElementById('c-subject').value;
  const desc = document.getElementById('c-description').value;
  const loc = document.getElementById('c-location').value;
  const pri = document.getElementById('c-priority').value;
  if (!cat || !sub || !desc || !loc) {
    document.getElementById('submit-alert').innerHTML = '<div class="alert alert-error">⚠️ Please fill all required fields.</div>';
    document.getElementById('submit-alert').style.display = 'block';
    return;
  }
  try {
    await apiCall('/complaints', 'POST', { subject: sub, category: cat, location: loc, description: desc, priority: pri, status: 'Pending' });
    closeModal('modal-complaint');
    ['c-category', 'c-subject', 'c-description', 'c-location'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('submit-alert').style.display = 'none';
    showToast('✅ Complaint submitted successfully!');
    renderUserHome();
    renderUserComplaints(_uSearch, _uStatus, _uCat);
  } catch (error) {
    document.getElementById('submit-alert').innerHTML = '<div class="alert alert-error">❌ ' + (error.message || 'Failed to submit') + '</div>';
    document.getElementById('submit-alert').style.display = 'block';
  }
}

async function submitFromPage() {
  if (!authToken || !currentUser) {
    showToast('❌ Please login first to submit a complaint');
    return;
  }
  const cat = document.getElementById('s-category').value;
  const loc = document.getElementById('s-location').value;
  const sub = document.getElementById('s-subject').value;
  const desc = document.getElementById('s-desc').value;
  if (!cat || !loc || !sub || !desc) { showToast('⚠️ Please fill all required fields.'); return; }
  try {
    await apiCall('/complaints', 'POST', { subject: sub, category: cat, location: loc, description: desc, priority: 'Medium', status: 'Pending' });
    showToast('✅ Complaint submitted!');
    ['s-category', 's-location', 's-subject', 's-desc'].forEach(id => document.getElementById(id).value = '');
    renderUserHome();
    renderUserComplaints(_uSearch, _uStatus, _uCat);
  } catch (error) {
    showToast('❌ Failed to submit: ' + error.message);
  }
}

// ── ASSIGNMENT AND STAFF ACTIONS ──
async function confirmAssign() {
  const staff = document.getElementById('assign-staff').value;
  if (!staff) { showToast('⚠️ Please select a staff member.'); return; }
  try {
    await apiCall(`/complaints/${currentComplaintId}`, 'PUT', { status: 'In Progress', assignedTo: staff });
    closeModal('modal-assign');
    showToast('✅ Assigned! Notification sent.');
    renderAdminTable();
    renderAdminDash();
  } catch (error) {
    showToast('❌ Failed to assign: ' + error.message);
  }
}

async function resolveComplaint(id) {
  try {
    await apiCall(`/complaints/${id}`, 'PUT', { status: 'Resolved' });
    closeModal('modal-detail');
    showToast('🎉 Complaint marked as resolved! User notified.');
    renderStaffTasks();
  } catch (error) {
    showToast('❌ Failed to resolve: ' + error.message);
  }
}

async function startComplaint(id) {
  try {
    await apiCall(`/complaints/${id}`, 'PUT', { status: 'In Progress' });
    closeModal('modal-detail');
    showToast('🔄 Started working on complaint');
    renderStaffTasks();
  } catch (error) {
    showToast('❌ Failed to start: ' + error.message);
  }
}

// ── MODAL AND TOAST HELPERS ──
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-backdrop').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); }));

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── ADMIN FILTERS ──
function filterAdminComplaints(v) { adminSearch = v; renderAdminTable(); }
function filterAdminStatus(v) { adminFilterStatus = v; renderAdminTable(); }
function filterAdminPriority(v) { adminFilterPriority = v; renderAdminTable(); }

// ── INITIALIZATION ──
window.addEventListener('load', () => {
  if (!authToken || !currentUser) {
    if (authToken && !currentUser) {
      localStorage.removeItem('authToken');
      authToken = null;
    }
    const loginPage = `
    <div id="login-overlay" style="position:fixed;inset:0;background:var(--bg);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px">
      <div style="background:var(--surface2);border-radius:var(--radius-lg);padding:40px;max-width:400px;width:100%;box-shadow:var(--shadow-lg)">
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:48px;margin-bottom:12px">🏫</div>
          <h1 style="font-size:20px;font-weight:600;margin-bottom:4px">Campus Care</h1>
          <p style="font-size:12px;color:var(--text3)">Complaint & Maintenance Portal</p>
        </div>
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" id="login-email" placeholder="your@email.com" />
        </div>
        <div class="form-group" style="margin-bottom:24px">
          <label class="form-label">Password</label>
          <input type="password" class="form-input" id="login-password" placeholder="••••••••" />
        </div>
        <button class="btn btn-primary" style="width:100%;margin-bottom:8px;cursor:pointer" onclick="handleLogin()">Login</button>
        <button class="btn btn-secondary" style="width:100%;margin-bottom:8px;cursor:pointer" onclick="switchToRegister()">Create Account</button>
        <div style="text-align:center;font-size:11px;color:var(--text3);margin-top:16px">
          Demo: admin@e.com / admin123<br/>
          or staff@e.com / staff123
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('afterbegin', loginPage);
  } else {
    const role = currentUser?.role || 'user';
    switchRole(role === 'admin' ? 'admin' : role === 'staff' ? 'staff' : 'user');
  }
});

async function handleLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  if (!email || !password) {
    showToast('⚠️ Email and password required');
    return;
  }
  try {
    await login(email, password);
    document.getElementById('login-overlay')?.remove();
  } catch (error) {
    showToast('❌ Login failed');
  }
}

function switchToRegister() {
  const loginOverlay = document.getElementById('login-overlay');
  if (!loginOverlay) return;
  loginOverlay.innerHTML = `
    <div style="background:var(--surface2);border-radius:var(--radius-lg);padding:40px;max-width:400px;width:100%;box-shadow:var(--shadow-lg)">
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:48px;margin-bottom:12px">🏫</div>
        <h1 style="font-size:20px;font-weight:600;margin-bottom:4px">Campus Care</h1>
        <p style="font-size:12px;color:var(--text3)">Create New Account</p>
      </div>
      <div class="form-group" style="margin-bottom:16px">
        <label class="form-label">Full Name</label>
        <input type="text" class="form-input" id="reg-name" placeholder="Your full name" />
      </div>
      <div class="form-group" style="margin-bottom:16px">
        <label class="form-label">Email</label>
        <input type="email" class="form-input" id="reg-email" placeholder="your@email.com" />
      </div>
      <div class="form-group" style="margin-bottom:24px">
        <label class="form-label">Password</label>
        <input type="password" class="form-input" id="reg-password" placeholder="••••••••" />
      </div>
      <button class="btn btn-primary" style="width:100%;margin-bottom:8px;cursor:pointer" onclick="handleRegister()">Create Account</button>
      <button class="btn btn-secondary" style="width:100%;cursor:pointer" onclick="switchToLogin()">Back to Login</button>
    </div>`;
}

function switchToLogin() {
  const loginOverlay = document.getElementById('login-overlay');
  if (!loginOverlay) return;
  loginOverlay.innerHTML = `
    <div style="background:var(--surface2);border-radius:var(--radius-lg);padding:40px;max-width:400px;width:100%;box-shadow:var(--shadow-lg)">
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:48px;margin-bottom:12px">🏫</div>
        <h1 style="font-size:20px;font-weight:600;margin-bottom:4px">Campus Care</h1>
        <p style="font-size:12px;color:var(--text3)">Complaint & Maintenance Portal</p>
      </div>
      <div class="form-group" style="margin-bottom:16px">
        <label class="form-label">Email</label>
        <input type="email" class="form-input" id="login-email" placeholder="your@email.com" />
      </div>
      <div class="form-group" style="margin-bottom:24px">
        <label class="form-label">Password</label>
        <input type="password" class="form-input" id="login-password" placeholder="••••••••" />
      </div>
      <button class="btn btn-primary" style="width:100%;margin-bottom:8px;cursor:pointer" onclick="handleLogin()">Login</button>
      <button class="btn btn-secondary" style="width:100%;margin-bottom:8px;cursor:pointer" onclick="switchToRegister()">Create Account</button>
      <div style="text-align:center;font-size:11px;color:var(--text3);margin-top:16px">
        Demo: admin@e.com / admin123<br/>
        or staff@e.com / staff123
      </div>
    </div>`;
}

async function handleRegister() {
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  if (!name || !email || !password) {
    showToast('⚠️ All fields are required');
    return;
  }
  try {
    const response = await register(name, email, password);
    document.getElementById('login-overlay')?.remove();
    const role = response.role || 'user';
    switchRole(role === 'admin' ? 'admin' : role === 'staff' ? 'staff' : 'user');
  } catch (error) {
    console.log('Registration failed:', error);
  }
}
