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
    console.log(`API Call: ${method} ${endpoint}`, { headers: options.headers, body });
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    console.log(`Response status: ${response.status}`);
    const data = await response.json();
    console.log(`Response data:`, data);
    if (!response.ok) {
      throw new Error(data.msg || `API Error: ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error('API Error:', error);
    showToast(` Error: ${error.message}`);
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

async function register(name, email, password, role = 'user') {
  try {
    const response = await apiCall('/auth/register', 'POST', { name, email, password, role });
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
// Define which pages are accessible by which roles
const rolePageAccess = {
  user: ['page-user-home', 'page-user-complaints', 'page-submit'],
  staff: ['page-staff-home', 'page-staff-completed'],
  admin: ['page-admin-dash', 'page-admin-complaints', 'page-admin-staff', 'page-reports', 'page-flow', 'page-api', 'page-schema']
};

function navigate(pageId, navEl) {
  if (!authToken) {
    showToast('❌ Please login first');
    return;
  }
  
  // Check if current user's role can access this page
  const userRole = currentUser?.role || 'user';
  const allowedPages = rolePageAccess[userRole] || [];
  
  if (!allowedPages.includes(pageId)) {
    showToast('❌ 400 Bad Request: You do not have permission to access this page');
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
  if (pageId === 'page-admin-staff') renderAdminStaff();
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
  
  // Show rate button for students when complaint is resolved and not yet rated
  const rateButton = role === 'user' && c.status === 'Resolved' && !c.rating 
    ? `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openRatingModal('${c._id || c.id}')" style="margin-top:8px">⭐ Rate Service</button>`
    : '';
  
  // Show resolve button for staff on active tasks
  const resolveButton = role === 'staff' && c.status !== 'Resolved'
    ? `<button class="btn btn-success btn-sm" onclick="event.stopPropagation(); markAsResolved('${c._id || c.id}')" style="margin-top:8px">✓ Mark Resolved</button>`
    : '';
  
  const ratingBadge = c.rating 
    ? `<div style="margin-top:6px;display:flex;align-items:center;gap:4px;font-size:12px">
         <span>⭐ ${c.rating}/5</span>
         ${c.studentApprovedAt ? '<span style="color:var(--accent)">✓ Approved</span>' : ''}
       </div>`
    : '';
  
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
    ${ratingBadge}
    ${rateButton}
    ${resolveButton}
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

// ── ADMIN: STAFF MANAGEMENT ──
async function renderAdminStaff() {
  try {
    const staff = await apiCall('/staff');
    const tbody = document.getElementById('staff-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = staff.map(s => `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td><span class="badge badge-assigned">Maintenance</span></td>
        <td>${s.activeTasksCount}</td>
        <td>${s.resolvedCount}</td>
        <td><span class="badge ${s.activeTasksCount > 0 ? 'badge-pending' : 'badge-resolved'}">${s.activeTasksCount > 0 ? 'Not Available' : 'Available'}</span></td>
        <td><button class="btn btn-secondary btn-sm" onclick="viewStaffProfile('${s._id}')">View</button></td>
      </tr>`).join('');
  } catch (error) {
    console.log('Error rendering admin staff:', error);
  }
}

// View staff profile
async function viewStaffProfile(staffId) {
  try {
    // Show modal using proper function
    openModal('modal-staff-profile');
    
    // Show loading state
    document.getElementById('staff-profile-loading').style.display = 'block';
    document.getElementById('staff-profile-content').style.display = 'none';
    document.getElementById('staff-profile-error').style.display = 'none';

    // Fetch staff details
    const staffData = await apiCall(`/staff/${staffId}`);
    
    // Hide loading and show content
    document.getElementById('staff-profile-loading').style.display = 'none';
    document.getElementById('staff-profile-content').style.display = 'block';

    // Populate profile data
    document.getElementById('profile-name').textContent = staffData.name || '-';
    document.getElementById('profile-email').textContent = staffData.email || '-';
    document.getElementById('profile-role').textContent = staffData.role || '-';
    document.getElementById('profile-joined').textContent = staffData.createdAt ? new Date(staffData.createdAt).toLocaleDateString() : '-';
    document.getElementById('profile-active').textContent = staffData.activeTasksCount || 0;
    document.getElementById('profile-resolved').textContent = staffData.resolvedCount || 0;
  } catch (error) {
    console.error('Error loading staff profile:', error);
    document.getElementById('staff-profile-loading').style.display = 'none';
    document.getElementById('staff-profile-error').style.display = 'block';
    document.getElementById('staff-profile-error').textContent = '❌ ' + (error.message || 'Unable to load staff profile');
  }
}

// ── STAFF VIEWS ──
async function renderStaffTasks() {
  try {
    // Display staff name
    if (currentUser && currentUser.name) {
      document.getElementById('staff-name').textContent = currentUser.name;
    }
    
    console.log("=== STAFF DASHBOARD ===");
    console.log("Current User:", currentUser);
    console.log("Auth Token:", authToken);
    
    const tasks = await apiCall('/complaints/pending-for-staff');
    console.log("Pending tasks response:", tasks);
    
    const resolved = await apiCall('/complaints/resolved');
    console.log("Resolved tasks response:", resolved);
    
    // Calculate stats
    const assigned = tasks.length;
    const inProgress = tasks.filter(t => t.status === "In Progress").length;
    
    // Get tasks resolved in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const resolvedThisWeek = resolved.filter(r => new Date(r.updatedAt) >= sevenDaysAgo).length;
    
    console.log("Stats - Assigned:", assigned, "InProgress:", inProgress, "ResolvedWeek:", resolvedThisWeek);
    
    // Update stat cards
    const statCards = document.querySelectorAll('#page-staff-home .stat-card');
    if (statCards.length >= 3) {
      statCards[0].querySelector('.stat-value').textContent = assigned;
      statCards[1].querySelector('.stat-value').textContent = inProgress;
      statCards[2].querySelector('.stat-value').textContent = resolvedThisWeek;
    }
    
    // Update task count alert
    document.getElementById('staff-task-count').textContent = assigned;
    
    // Update task list
    if (tasks.length > 0) {
      document.getElementById('staff-task-list').innerHTML = tasks.map(c => {
        try {
          return complaintCard(c, 'staff');
        } catch (err) {
          console.error("Error rendering complaint card:", err, c);
          return `<div style="color:red">Error rendering task</div>`;
        }
      }).join('');
    } else {
      document.getElementById('staff-task-list').innerHTML = '<div class="empty-state"><p>No active tasks assigned.</p></div>';
    }
  } catch (error) {
    console.error('Error rendering staff tasks:', error);
    console.error('Error stack:', error.stack);
    showToast('❌ Error fetching tasks: ' + error.message);
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
    // Fetch staff performance first
    const staffData = await apiCall('/reports/staffPerformance');
    const allStaff = staffData.staffPerformance || [];
    
    // Calculate stats from staff data
    let totalResolved = 0;
    let totalAssigned = 0;
    allStaff.forEach(s => {
      totalAssigned += s.assigned || 0;
      totalResolved += s.resolved || 0;
    });
    const totalComplaints = totalAssigned + totalResolved;
    const resolutionRate = totalComplaints > 0 ? Math.round((totalResolved / totalComplaints) * 100) : 0;
    const activeStaff = allStaff.length;
    
    const statCards = document.querySelectorAll('.stat-card');
    statCards[0].innerHTML = `<div class="stat-label">Total Complaints</div><div class="stat-value">${totalComplaints}</div><div class="stat-sub">All time</div>`;
    statCards[1].innerHTML = `<div class="stat-label">Avg Resolution Time</div><div class="stat-value" style="font-size:22px">0d</div><div class="stat-sub">Average</div>`;
    statCards[2].innerHTML = `<div class="stat-label">Resolution Rate</div><div class="stat-value" style="color:var(--accent-mid)">${resolutionRate}%</div><div class="stat-sub">Completed</div>`;
    statCards[3].innerHTML = `<div class="stat-label">Active Staff</div><div class="stat-value">${activeStaff}</div><div class="stat-sub">On team</div>`;
    
    // Fetch all complaints for category and monthly data
    const allComplaints = await apiCall('/complaints');
    
    // Fetch monthly chart data
    const monthlyData = await apiCall('/reports/monthly');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthCounts = new Array(12).fill(0);
    monthlyData.monthly.forEach(m => {
      if (m._id && m._id.month) {
        monthCounts[m._id.month - 1] = m.count;
      }
    });
    const currentMonth = new Date().getMonth();
    const displayMonths = months.slice(Math.max(0, currentMonth - 6), currentMonth + 1);
    const displayCounts = monthCounts.slice(Math.max(0, currentMonth - 6), currentMonth + 1);
    const maxV = Math.max(...displayCounts, 1);
    document.getElementById('monthly-chart').innerHTML = `
      <div style="display:flex;align-items:flex-end;gap:8px;height:120px;padding:8px 0">
        ${displayMonths.map((m, i) => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
            <div style="width:100%;background:var(--accent-mid);border-radius:4px 4px 0 0;height:${(displayCounts[i]/maxV*100).toFixed(0)}px;min-height:8px;opacity:${i===displayMonths.length-1?1:0.6};transition:all 0.3s" title="${displayCounts[i]} complaints"></div>
            <div style="font-size:10px;color:var(--text3)">${m}</div>
            <div style="font-size:10px;font-weight:600">${displayCounts[i]}</div>
          </div>`).join('')}
      </div>`;
    
    // Category distribution
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
    
    // Staff Performance Table
    document.getElementById('staff-perf').innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>Staff Member</th><th>Assigned</th><th>Resolved</th><th>Avg Time</th><th>Avg Rating</th><th>Ratings Count</th></tr></thead>
        <tbody>${allStaff.map(s => {
          const ratingDisplay = s.avgRating === "N/A" ? "—" : `${s.avgRating}⭐`;
          return `
          <tr>
            <td style="font-weight:500">${s.name}</td>
            <td>${s.assigned}</td>
            <td style="color:var(--accent-mid);font-weight:600">${s.resolved}</td>
            <td>${s.avgTime}</td>
            <td style="font-weight:600;color:var(--orange)">${ratingDisplay}</td>
            <td>${s.ratedCount}</td>
          </tr>`;
        }).join('')}
        </tbody>
      </table></div>`;
  } catch (error) {
    console.error('Error rendering reports:', error);
    showToast('⚠️ Error loading reports: ' + error.message);
  }
}

// ── SUBMIT COMPLAINTS ──
async function submitComplaint() {
  console.log("submitComplaint called - authToken:", authToken, "currentUser:", currentUser);
  
  if (!authToken || !currentUser) {
    showToast('❌ Please login first to submit a complaint');
    return;
  }
  const cat = document.getElementById('c-category').value;
  const sub = document.getElementById('c-subject').value;
  const desc = document.getElementById('c-description').value;
  const loc = document.getElementById('c-location').value;
  const pri = document.getElementById('c-priority').value;
  
  console.log("Form values:", { category: cat, subject: sub, description: desc, location: loc, priority: pri });
  
  if (!cat || !sub || !desc || !loc) {
    document.getElementById('submit-alert').innerHTML = '<div class="alert alert-error">⚠️ Please fill all required fields.</div>';
    document.getElementById('submit-alert').style.display = 'block';
    console.log("Form validation failed");
    return;
  }
  try {
    console.log("Calling /complaints API with data:", { subject: sub, category: cat, location: loc, description: desc, priority: pri, status: 'Pending' });
    await apiCall('/complaints', 'POST', { subject: sub, category: cat, location: loc, description: desc, priority: pri, status: 'Pending' });
    closeModal('modal-complaint');
    ['c-category', 'c-subject', 'c-description', 'c-location'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('submit-alert').style.display = 'none';
    showToast('✅ Complaint submitted successfully!');
    renderUserHome();
    renderUserComplaints(_uSearch, _uStatus, _uCat);
  } catch (error) {
    console.error("Complaint submission error:", error);
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
async function openModal(id) { 
  document.getElementById(id).classList.add('open'); 
  // Populate staff dropdown when assign modal is opened
  if (id === 'modal-assign') {
    await populateAssignStaff();
  }
}

async function populateAssignStaff() {
  try {
    const staff = await apiCall('/staff');
    const selectEl = document.getElementById('assign-staff');
    selectEl.innerHTML = '<option value="">Choose staff...</option>' + 
      staff.map(s => `<option value="${s._id}">${s.name} — Maintenance</option>`).join('');
  } catch (error) {
    console.log('Error populating staff:', error);
  }
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-backdrop').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); }));

// ── RATING FUNCTIONALITY ──
let currentComplaintRating = {
  id: null,
  rating: 0
};

function openRatingModal(complaintId) {
  currentComplaintRating = { id: complaintId, rating: 0 };
  document.getElementById('rating-comment').value = '';
  document.getElementById('rating-text').textContent = 'No rating selected';
  document.getElementById('submit-rating-btn').disabled = true;
  document.getElementById('stars-display').textContent = '☆ ☆ ☆ ☆ ☆';
  document.querySelectorAll('.star-btn').forEach(btn => btn.textContent = '☆');
  openModal('modal-rate');
}

function setRating(rating) {
  currentComplaintRating.rating = rating;
  const labels = ['', '😞 Poor', '😐 Fair', '😊 Good', '😄 Very Good', '😍 Excellent'];
  document.getElementById('rating-text').textContent = `${rating} star${rating > 1 ? 's' : ''} - ${labels[rating]}`;
  
  // Update star display
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += (i <= rating ? '★' : '☆') + (i < 5 ? ' ' : '');
  }
  document.getElementById('stars-display').textContent = stars;
  
  // Update buttons
  document.querySelectorAll('.star-btn').forEach((btn, i) => {
    btn.textContent = (i + 1) <= rating ? '★' : '☆';
  });
  
  document.getElementById('submit-rating-btn').disabled = false;
}

async function submitRating() {
  try {
    if (currentComplaintRating.rating === 0) {
      showToast('⚠️ Please select a rating');
      return;
    }

    const comment = document.getElementById('rating-comment').value.trim();
    const result = await apiCall(`/complaints/rate/${currentComplaintRating.id}`, 'PUT', {
      rating: currentComplaintRating.rating,
      ratingComment: comment
    });

    showToast('✅ Thank you for your feedback!');
    closeModal('modal-rate');
    
    // Refresh user complaints
    setTimeout(() => renderUserComplaints(), 500);
  } catch (error) {
    showToast('❌ Failed to submit rating: ' + error.message);
  }
}

async function reopenComplaint() {
  if (!confirm('Are you sure? This will reopen the complaint for further action.')) return;

  try {
    await apiCall(`/complaints/reopen/${currentComplaintRating.id}`, 'PUT', {});
    showToast('✅ Complaint reopened for staff to continue work');
    closeModal('modal-rate');
    setTimeout(() => renderUserComplaints(), 500);
  } catch (error) {
    showToast('❌ Failed to reopen complaint: ' + error.message);
  }
}

// Mark complaint as resolved (staff)
async function markAsResolved(complaintId) {
  try {
    await apiCall(`/complaints/status/${complaintId}`, 'PUT', { status: 'Resolved' });
    showToast('✅ Task marked as resolved! Waiting for student confirmation...');
    setTimeout(() => {
      if (currentUser.role === 'staff') {
        renderStaffTasks();
      }
    }, 500);
  } catch (error) {
    showToast('❌ Failed to mark as resolved: ' + error.message);
  }
}

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
          <div style="position:relative">
            <input type="password" class="form-input" id="login-password" placeholder="••••••••" />
            <button type="button" onclick="togglePassword('login-password')" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;color:var(--text3)">
              <i id="icon-login-password" class="bi bi-eye-slash"></i>
            </button>
          </div>
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
      <div class="form-group" style="margin-bottom:16px">
        <label class="form-label">Select Your Role</label>
        <select class="form-select" id="reg-role">
          <option value="user">👤 Student / Staff (User)</option>
          <option value="staff">🔧 Maintenance Staff</option>
          <option value="admin">🛡️ Admin</option>
        </select>
      </div>
      <div class="form-group" style="margin-bottom:24px">
        <label class="form-label">Password</label>
        <div style="position:relative">
          <input type="password" class="form-input" id="reg-password" placeholder="••••••••" />
          <button type="button" onclick="togglePassword('reg-password')" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;color:var(--text3)">
            <i id="icon-reg-password" class="bi bi-eye-slash"></i>
          </button>
        </div>
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
        <div style="position:relative">
          <input type="password" class="form-input" id="login-password" placeholder="••••••••" />
          <button type="button" onclick="togglePassword('login-password')" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;color:var(--text3)">
            <i id="icon-login-password" class="bi bi-eye-slash"></i>
          </button>
        </div>
      </div>
      <button class="btn btn-primary" style="width:100%;margin-bottom:8px;cursor:pointer" onclick="handleLogin()">Login</button>
      <button class="btn btn-secondary" style="width:100%;margin-bottom:8px;cursor:pointer" onclick="switchToRegister()">Create Account</button>
      {/* <div style="text-align:center;font-size:11px;color:var(--text3);margin-top:16px">
        Demo: admin@e.com / admin123<br/>
        or staff@e.com / staff123
      </div> */ }
    </div>`;
}

async function handleRegister() {
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role')?.value || 'user';
  if (!name || !email || !password) {
    showToast('⚠️ All fields are required');
    return;
  }
  try {
    const response = await register(name, email, password, role);
    document.getElementById('login-overlay')?.remove();
    const userRole = response.role || 'user';
    switchRole(userRole === 'admin' ? 'admin' : userRole === 'staff' ? 'staff' : 'user');
  } catch (error) {
    console.log('Registration failed:', error);
  }
}

function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(`icon-${inputId}`);
  if (!input || !icon) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  icon.className = isHidden ? 'bi bi-eye' : 'bi bi-eye-slash';
}
