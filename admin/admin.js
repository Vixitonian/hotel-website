// admin.js — Full admin panel logic for Grandeur Hotel

const API = {
  rooms:  '../api/rooms.php',
  menu:   '../api/menu.php',
  bar:    '../api/bar.php',
  config: '../api/config.php',
};

// ── Utility ────────────────────────────────────────────────────────────────

function showAlert(containerId, msg, type = 'success') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">${type === 'success' ? '✅' : '⚠️'} ${msg}</div>`;
  if (type === 'success') setTimeout(() => { el.innerHTML = ''; }, 5000);
}

function fmt(n) {
  return '₦' + Number(n).toLocaleString('en-NG');
}

function makeAvailToggle(type, id, available) {
  const cls  = available ? 'available' : 'unavailable';
  const lbl  = available ? '✓ Available' : '✕ Unavailable';
  return `<button class="avail-toggle ${cls}" onclick="toggleAvailability('${type}','${id}',this)">${lbl}</button>`;
}

// ── Admin Modal ─────────────────────────────────────────────────────────────

function openAdminModal(title, bodyHTML, footerHTML) {
  document.getElementById('adminModalTitle').textContent = title;
  document.getElementById('adminModalBody').innerHTML    = bodyHTML;
  document.getElementById('adminModalFooter').innerHTML  = footerHTML;
  document.getElementById('adminModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAdminModal() {
  document.getElementById('adminModal').classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAdminModal();
});
document.getElementById('adminModal').addEventListener('click', e => {
  if (e.target === document.getElementById('adminModal')) closeAdminModal();
});

// ── Overview Stats ──────────────────────────────────────────────────────────

async function loadOverviewStats() {
  try {
    const [rRes, mRes, bRes] = await Promise.all([
      fetch(API.rooms + '?action=list'),
      fetch(API.menu  + '?action=list'),
      fetch(API.bar   + '?action=list'),
    ]);
    const rData = await rRes.json();
    const mData = await mRes.json();
    const bData = await bRes.json();

    const rooms = rData.rooms || [];
    const items = mData.items || [];
    const bars  = bData.items || [];

    document.getElementById('statRooms').textContent     = rooms.length;
    document.getElementById('statMenuItems').textContent = items.length;
    document.getElementById('statBarItems').textContent  = bars.length;

    if (rooms.length) {
      const lowest = Math.min(...rooms.map(r => r.discounted_price || r.price));
      document.getElementById('statLowestRoom').textContent = fmt(lowest);
    }
  } catch (err) {
    console.error('Failed to load stats', err);
  }
}

// ── ROOMS SECTION ───────────────────────────────────────────────────────────

let _roomCategories = [];
let _allRooms       = [];

async function loadRoomsSection() {
  await loadRoomsData();
  loadRoomCategoriesTable();
  loadRoomsTable();
}

async function loadRoomsData() {
  try {
    const res  = await fetch(API.rooms + '?action=list');
    const data = await res.json();
    _roomCategories = data.categories || [];
    _allRooms       = data.rooms      || [];
    populateCategorySelect('addRoomCategory', _roomCategories);
    populateCategoryFilter('roomCategoryFilter', _roomCategories);
  } catch { /* handled in table functions */ }
}

function populateCategorySelect(selectId, categories, selectedId = '') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Select category…</option>' +
    categories.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.name}</option>`).join('');
}

function populateCategoryFilter(selectId, categories) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">All Categories</option>' +
    categories.map(c => `<option value="${c.id}" ${c.id === current ? 'selected' : ''}>${c.name}</option>`).join('');
}

function loadRoomCategoriesTable() {
  const wrap = document.getElementById('roomCategoriesWrap');
  if (!_roomCategories.length) {
    wrap.innerHTML = '<div class="empty-state" style="padding:32px;"><div class="icon">📂</div><p>No categories yet.</p></div>';
    return;
  }
  wrap.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Name</th><th>Description</th><th>Rooms</th><th>Order</th><th>Actions</th></tr></thead>
      <tbody>
        ${_roomCategories.map(cat => {
          const count = _allRooms.filter(r => r.category_id === cat.id).length;
          return `<tr>
            <td><strong>${cat.name}</strong></td>
            <td style="color:var(--muted);font-size:0.83rem;">${cat.description || '—'}</td>
            <td>${count}</td>
            <td>${cat.order || '—'}</td>
            <td style="display:flex;gap:6px;">
              <button class="btn btn-outline btn-sm" onclick="editCategory('rooms','${cat.id}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteCategory('rooms','${cat.id}','${cat.name}')">Delete</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function loadRoomsTable() {
  const wrap     = document.getElementById('roomsTableWrap');
  const filterEl = document.getElementById('roomCategoryFilter');
  const catFilter = filterEl ? filterEl.value : '';
  const rooms = catFilter ? _allRooms.filter(r => r.category_id === catFilter) : _allRooms;

  if (!rooms.length) {
    wrap.innerHTML = '<div class="empty-state" style="padding:40px;"><div class="icon">🛏️</div><p>No rooms found.</p></div>';
    return;
  }
  wrap.innerHTML = `
    <table class="admin-table">
      <thead><tr>
        <th>Room #</th><th>Name</th><th>Category</th>
        <th>Price</th><th>Discounted</th>
        <th>Availability</th><th>Actions</th>
      </tr></thead>
      <tbody>
        ${rooms.map(r => {
          const cat = _roomCategories.find(c => c.id === r.category_id);
          return `<tr id="row-room-${r.id}">
            <td><strong>${r.number}</strong></td>
            <td>${r.name || '—'}</td>
            <td>${cat ? cat.name : r.category_id}</td>
            <td>${fmt(r.price)}</td>
            <td>${r.discounted_price ? fmt(r.discounted_price) : '—'}</td>
            <td>${makeAvailToggle('room', r.id, r.available)}</td>
            <td style="display:flex;gap:6px;">
              <button class="btn btn-outline btn-sm" onclick="editRoom('${r.id}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteRoom('${r.id}')">Delete</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function filterRoomsTable() { loadRoomsTable(); }

// Add room
document.addEventListener('DOMContentLoaded', () => {
  const addRoomForm = document.getElementById('addRoomForm');
  if (addRoomForm) {
    addRoomForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = this.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Adding…';
      const fd = new FormData(this);
      fd.append('action', 'add');
      const amenStr = fd.get('amenities') || '';
      fd.delete('amenities');
      amenStr.split(',').map(s => s.trim()).filter(Boolean).forEach(a => fd.append('amenities[]', a));
      try {
        const res  = await fetch(API.rooms, { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
          showAlert('roomFormAlert', `Room ${data.room.number} added successfully!`);
          this.reset();
          await loadRoomsData();
          loadRoomsTable();
          loadRoomCategoriesTable();
          loadOverviewStats();
        } else {
          showAlert('roomFormAlert', data.error || 'Failed to add room.', 'error');
        }
      } catch { showAlert('roomFormAlert', 'Network error.', 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Add Room'; }
    });
  }

  // Add menu item
  const addMenuForm = document.getElementById('addMenuForm');
  if (addMenuForm) {
    addMenuForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = this.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Adding…';
      const fd = new FormData(this);
      fd.append('action', 'add');
      try {
        const res  = await fetch(API.menu, { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
          showAlert('menuFormAlert', `"${data.item.name}" added!`);
          this.reset();
          await loadMenuData();
          loadMenuTable();
          loadOverviewStats();
        } else {
          showAlert('menuFormAlert', data.error || 'Failed to add item.', 'error');
        }
      } catch { showAlert('menuFormAlert', 'Network error.', 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Add Item'; }
    });
  }

  // Add bar item
  const addBarForm = document.getElementById('addBarForm');
  if (addBarForm) {
    addBarForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = this.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Adding…';
      const fd = new FormData(this);
      fd.append('action', 'add');
      try {
        const res  = await fetch(API.bar, { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
          showAlert('barFormAlert', `"${data.item.name}" added!`);
          this.reset();
          await loadBarData();
          loadBarTable();
          loadOverviewStats();
        } else {
          showAlert('barFormAlert', data.error || 'Failed to add item.', 'error');
        }
      } catch { showAlert('barFormAlert', 'Network error.', 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Add Item'; }
    });
  }

  // Password form
  const pwForm = document.getElementById('passwordForm');
  if (pwForm) {
    pwForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = this.querySelector('button[type=submit]');
      const current  = this.querySelector('[name=current_password]').value;
      const newPass  = this.querySelector('[name=new_password]').value;
      const confirm  = this.querySelector('[name=confirm_password]').value;
      if (newPass !== confirm) { showAlert('settingsAlert', 'New passwords do not match.', 'error'); return; }
      btn.disabled = true; btn.textContent = 'Updating…';
      try {
        const res  = await fetch(API.config, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_password', current_password: current, new_password: newPass }),
        });
        const data = await res.json();
        if (data.success) {
          showAlert('settingsAlert', 'Password updated. You will be logged out.');
          setTimeout(() => { sessionStorage.removeItem('admin_auth'); window.location.href = 'index.html'; }, 2000);
        } else {
          showAlert('settingsAlert', data.error || 'Failed to update password.', 'error');
        }
      } catch { showAlert('settingsAlert', 'Network error.', 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Update Password'; }
    });
  }
});

// Edit room modal
function editRoom(id) {
  const r = _allRooms.find(x => x.id === id);
  if (!r) return;
  const catOptions = _roomCategories.map(c =>
    `<option value="${c.id}" ${c.id === r.category_id ? 'selected' : ''}>${c.name}</option>`
  ).join('');
  const bodyHTML = `
    <form id="editRoomForm" class="admin-form" enctype="multipart/form-data">
      <input type="hidden" name="id" value="${r.id}" />
      <input type="hidden" name="action" value="update" />
      <div class="form-row">
        <div class="form-group"><label>Room Number *</label>
          <input type="text" name="number" value="${r.number || ''}" required /></div>
        <div class="form-group"><label>Room Name</label>
          <input type="text" name="name" value="${r.name || ''}" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Category *</label>
          <select name="category_id" required><option value="">Select…</option>${catOptions}</select></div>
        <div class="form-group"><label>Price (₦) *</label>
          <input type="number" name="price" value="${r.price}" min="0" required /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Discounted Price (₦)</label>
          <input type="number" name="discounted_price" value="${r.discounted_price || ''}" min="0" /></div>
        <div class="form-group"><label>Capacity</label>
          <input type="number" name="capacity" value="${r.capacity || 2}" min="1" max="10" /></div>
      </div>
      <div class="form-group"><label>Description</label>
        <textarea name="description">${r.description || ''}</textarea></div>
      <div class="form-group"><label>Amenities (comma-separated)</label>
        <input type="text" name="amenities" value="${(r.amenities || []).join(', ')}" /></div>
      <div class="form-group"><label>New Photo (leave blank to keep existing)</label>
        <input type="file" name="image" accept="image/jpeg,image/png,image/webp" /></div>
    </form>`;
  const footerHTML = `
    <button class="btn btn-outline btn-sm" onclick="closeAdminModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="submitEditRoom()">Save Changes</button>`;
  openAdminModal(`Edit Room ${r.number}`, bodyHTML, footerHTML);
}

async function submitEditRoom() {
  const form = document.getElementById('editRoomForm');
  if (!form) return;
  const btn = document.querySelector('#adminModalFooter .btn-primary');
  btn.disabled = true; btn.textContent = 'Saving…';
  const fd = new FormData(form);
  const amenStr = fd.get('amenities') || '';
  fd.delete('amenities');
  amenStr.split(',').map(s => s.trim()).filter(Boolean).forEach(a => fd.append('amenities[]', a));
  try {
    const res  = await fetch(API.rooms, { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      closeAdminModal();
      await loadRoomsData();
      loadRoomsTable();
      loadOverviewStats();
    } else {
      alert(data.error || 'Save failed.');
    }
  } catch { alert('Network error.'); }
  finally { btn.disabled = false; btn.textContent = 'Save Changes'; }
}

async function deleteRoom(id) {
  if (!confirm('Delete this room? This cannot be undone.')) return;
  try {
    const res  = await fetch(API.rooms, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (data.success) {
      showAlert('roomFormAlert', 'Room deleted.');
      await loadRoomsData();
      loadRoomsTable();
      loadRoomCategoriesTable();
      loadOverviewStats();
    } else {
      showAlert('roomFormAlert', data.error || 'Delete failed.', 'error');
    }
  } catch { showAlert('roomFormAlert', 'Network error.', 'error'); }
}

// ── MENU SECTION ────────────────────────────────────────────────────────────

let _menuCategories = [];
let _allMenuItems   = [];

async function loadMenuSection() {
  await loadMenuData();
  loadMenuCategoriesTable();
  loadMenuTable();
}

async function loadMenuData() {
  try {
    const res  = await fetch(API.menu + '?action=list');
    const data = await res.json();
    _menuCategories = data.categories || [];
    _allMenuItems   = data.items      || [];
    populateCategorySelect('addMenuCategory', _menuCategories);
    populateCategoryFilter('menuCategoryFilter', _menuCategories);
  } catch {}
}

function loadMenuCategoriesTable() {
  const wrap = document.getElementById('menuCategoriesWrap');
  if (!_menuCategories.length) {
    wrap.innerHTML = '<div class="empty-state" style="padding:32px;"><div class="icon">📂</div><p>No categories yet.</p></div>';
    return;
  }
  wrap.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Name</th><th>Items</th><th>Order</th><th>Actions</th></tr></thead>
      <tbody>
        ${_menuCategories.map(cat => {
          const count = _allMenuItems.filter(i => i.category_id === cat.id).length;
          return `<tr>
            <td><strong>${cat.name}</strong></td>
            <td>${count}</td>
            <td>${cat.order || '—'}</td>
            <td style="display:flex;gap:6px;">
              <button class="btn btn-outline btn-sm" onclick="editCategory('menu','${cat.id}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteCategory('menu','${cat.id}','${cat.name}')">Delete</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function loadMenuTable() {
  const wrap      = document.getElementById('menuTableWrap');
  const filterEl  = document.getElementById('menuCategoryFilter');
  const catFilter = filterEl ? filterEl.value : '';
  const items = catFilter ? _allMenuItems.filter(i => i.category_id === catFilter) : _allMenuItems;
  if (!items.length) {
    wrap.innerHTML = '<div class="empty-state" style="padding:40px;"><div class="icon">🍽️</div><p>No items found.</p></div>';
    return;
  }
  wrap.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Availability</th><th>Actions</th></tr></thead>
      <tbody>
        ${items.map(m => {
          const cat = _menuCategories.find(c => c.id === m.category_id);
          return `<tr id="row-menu-${m.id}">
            <td><strong>${m.name}</strong><br><small style="color:var(--muted);">${(m.description||'').substring(0,50)}${m.description?.length > 50 ? '…' : ''}</small></td>
            <td>${cat ? cat.name : m.category_id}</td>
            <td>${fmt(m.price)}</td>
            <td>${makeAvailToggle('menuitem', m.id, m.available)}</td>
            <td style="display:flex;gap:6px;">
              <button class="btn btn-outline btn-sm" onclick="editMenuItem('${m.id}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteMenuItem('${m.id}')">Delete</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function filterMenuTable() { loadMenuTable(); }

function editMenuItem(id) {
  const m = _allMenuItems.find(x => x.id === id);
  if (!m) return;
  const catOptions = _menuCategories.map(c =>
    `<option value="${c.id}" ${c.id === m.category_id ? 'selected' : ''}>${c.name}</option>`
  ).join('');
  const bodyHTML = `
    <form id="editMenuForm" class="admin-form" enctype="multipart/form-data">
      <input type="hidden" name="id" value="${m.id}" />
      <input type="hidden" name="action" value="update" />
      <div class="form-row">
        <div class="form-group"><label>Item Name *</label>
          <input type="text" name="name" value="${m.name}" required /></div>
        <div class="form-group"><label>Category *</label>
          <select name="category_id" required><option value="">Select…</option>${catOptions}</select></div>
      </div>
      <div class="form-group"><label>Price (₦) *</label>
        <input type="number" name="price" value="${m.price}" min="0" required /></div>
      <div class="form-group"><label>Description</label>
        <textarea name="description">${m.description || ''}</textarea></div>
      <div class="form-group"><label>New Photo (leave blank to keep)</label>
        <input type="file" name="image" accept="image/jpeg,image/png,image/webp" /></div>
    </form>`;
  const footerHTML = `
    <button class="btn btn-outline btn-sm" onclick="closeAdminModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="submitEditMenu()">Save Changes</button>`;
  openAdminModal(`Edit: ${m.name}`, bodyHTML, footerHTML);
}

async function submitEditMenu() {
  const form = document.getElementById('editMenuForm');
  if (!form) return;
  const btn = document.querySelector('#adminModalFooter .btn-primary');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const res  = await fetch(API.menu, { method: 'POST', body: new FormData(form) });
    const data = await res.json();
    if (data.success) {
      closeAdminModal();
      await loadMenuData();
      loadMenuTable();
    } else { alert(data.error || 'Save failed.'); }
  } catch { alert('Network error.'); }
  finally { btn.disabled = false; btn.textContent = 'Save Changes'; }
}

async function deleteMenuItem(id) {
  if (!confirm('Delete this menu item?')) return;
  try {
    const res  = await fetch(API.menu, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (data.success) {
      await loadMenuData();
      loadMenuTable();
      loadMenuCategoriesTable();
      loadOverviewStats();
    } else { showAlert('menuFormAlert', data.error || 'Delete failed.', 'error'); }
  } catch { showAlert('menuFormAlert', 'Network error.', 'error'); }
}

// ── BAR SECTION ─────────────────────────────────────────────────────────────

let _barCategories = [];
let _allBarItems   = [];

async function loadBarSection() {
  await loadBarData();
  loadBarCategoriesTable();
  loadBarTable();
}

async function loadBarData() {
  try {
    const res  = await fetch(API.bar + '?action=list');
    const data = await res.json();
    _barCategories = data.categories || [];
    _allBarItems   = data.items      || [];
    populateCategorySelect('addBarCategory', _barCategories);
    populateCategoryFilter('barCategoryFilter', _barCategories);
  } catch {}
}

function loadBarCategoriesTable() {
  const wrap = document.getElementById('barCategoriesWrap');
  if (!_barCategories.length) {
    wrap.innerHTML = '<div class="empty-state" style="padding:32px;"><div class="icon">📂</div><p>No categories yet.</p></div>';
    return;
  }
  wrap.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Name</th><th>Items</th><th>Order</th><th>Actions</th></tr></thead>
      <tbody>
        ${_barCategories.map(cat => {
          const count = _allBarItems.filter(i => i.category_id === cat.id).length;
          return `<tr>
            <td><strong>${cat.name}</strong></td>
            <td>${count}</td>
            <td>${cat.order || '—'}</td>
            <td style="display:flex;gap:6px;">
              <button class="btn btn-outline btn-sm" onclick="editCategory('bar','${cat.id}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteCategory('bar','${cat.id}','${cat.name}')">Delete</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function loadBarTable() {
  const wrap      = document.getElementById('barTableWrap');
  const filterEl  = document.getElementById('barCategoryFilter');
  const catFilter = filterEl ? filterEl.value : '';
  const items = catFilter ? _allBarItems.filter(i => i.category_id === catFilter) : _allBarItems;
  if (!items.length) {
    wrap.innerHTML = '<div class="empty-state" style="padding:40px;"><div class="icon">🍸</div><p>No bar items found.</p></div>';
    return;
  }
  wrap.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Availability</th><th>Actions</th></tr></thead>
      <tbody>
        ${items.map(m => {
          const cat = _barCategories.find(c => c.id === m.category_id);
          return `<tr id="row-bar-${m.id}">
            <td><strong>${m.name}</strong><br><small style="color:var(--muted);">${(m.description||'').substring(0,50)}${m.description?.length > 50 ? '…' : ''}</small></td>
            <td>${cat ? cat.name : m.category_id}</td>
            <td>${fmt(m.price)}</td>
            <td>${makeAvailToggle('baritem', m.id, m.available)}</td>
            <td style="display:flex;gap:6px;">
              <button class="btn btn-outline btn-sm" onclick="editBarItem('${m.id}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteBarItem('${m.id}')">Delete</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function filterBarTable() { loadBarTable(); }

function editBarItem(id) {
  const m = _allBarItems.find(x => x.id === id);
  if (!m) return;
  const catOptions = _barCategories.map(c =>
    `<option value="${c.id}" ${c.id === m.category_id ? 'selected' : ''}>${c.name}</option>`
  ).join('');
  const bodyHTML = `
    <form id="editBarForm" class="admin-form">
      <input type="hidden" name="id" value="${m.id}" />
      <input type="hidden" name="action" value="update" />
      <div class="form-row">
        <div class="form-group"><label>Item Name *</label>
          <input type="text" name="name" value="${m.name}" required /></div>
        <div class="form-group"><label>Category *</label>
          <select name="category_id" required><option value="">Select…</option>${catOptions}</select></div>
      </div>
      <div class="form-group"><label>Price (₦) *</label>
        <input type="number" name="price" value="${m.price}" min="0" required /></div>
      <div class="form-group"><label>Description</label>
        <textarea name="description">${m.description || ''}</textarea></div>
    </form>`;
  const footerHTML = `
    <button class="btn btn-outline btn-sm" onclick="closeAdminModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="submitEditBar()">Save Changes</button>`;
  openAdminModal(`Edit: ${m.name}`, bodyHTML, footerHTML);
}

async function submitEditBar() {
  const form = document.getElementById('editBarForm');
  if (!form) return;
  const btn = document.querySelector('#adminModalFooter .btn-primary');
  btn.disabled = true; btn.textContent = 'Saving…';
  const fd = new FormData(form);
  try {
    const res  = await fetch(API.bar, { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      closeAdminModal();
      await loadBarData();
      loadBarTable();
    } else { alert(data.error || 'Save failed.'); }
  } catch { alert('Network error.'); }
  finally { btn.disabled = false; btn.textContent = 'Save Changes'; }
}

async function deleteBarItem(id) {
  if (!confirm('Delete this bar item?')) return;
  try {
    const res  = await fetch(API.bar, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (data.success) {
      await loadBarData();
      loadBarTable();
      loadBarCategoriesTable();
      loadOverviewStats();
    } else { showAlert('barFormAlert', data.error || 'Delete failed.', 'error'); }
  } catch { showAlert('barFormAlert', 'Network error.', 'error'); }
}

// ── AVAILABILITY TOGGLE ─────────────────────────────────────────────────────

async function toggleAvailability(type, id, btn) {
  const apiMap = { room: API.rooms, menuitem: API.menu, baritem: API.bar };
  const api = apiMap[type];
  if (!api) return;

  const isAvailable = btn.classList.contains('available');
  btn.disabled = true;

  try {
    const res  = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_availability', id }),
    });
    const data = await res.json();
    if (data.success) {
      const nowAvail = data.available;
      btn.className  = `avail-toggle ${nowAvail ? 'available' : 'unavailable'}`;
      btn.textContent = nowAvail ? '✓ Available' : '✕ Unavailable';

      // Update in-memory data
      if (type === 'room') {
        const r = _allRooms.find(x => x.id === id);
        if (r) r.available = nowAvail;
      } else if (type === 'menuitem') {
        const m = _allMenuItems.find(x => x.id === id);
        if (m) m.available = nowAvail;
      } else if (type === 'baritem') {
        const b = _allBarItems.find(x => x.id === id);
        if (b) b.available = nowAvail;
      }
    } else {
      alert(data.error || 'Toggle failed.');
    }
  } catch { alert('Network error.'); }
  finally { btn.disabled = false; }
}

// ── CATEGORY CRUD ───────────────────────────────────────────────────────────

function openCategoryModal(dataType) {
  const bodyHTML = `
    <form id="addCategoryForm" class="admin-form">
      <input type="hidden" name="action" value="add_category" />
      <div class="form-group"><label>Category Name *</label>
        <input type="text" name="name" placeholder="e.g. Executive Suite" required autofocus /></div>
      ${dataType === 'rooms' ? `
      <div class="form-group"><label>Description</label>
        <textarea name="description" placeholder="Brief description of this room category…"></textarea></div>` : ''}
    </form>`;
  const footerHTML = `
    <button class="btn btn-outline btn-sm" onclick="closeAdminModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="submitAddCategory('${dataType}')">Add Category</button>`;
  openAdminModal('Add Category', bodyHTML, footerHTML);
}

async function submitAddCategory(dataType) {
  const form = document.getElementById('addCategoryForm');
  if (!form) return;
  const btn = document.querySelector('#adminModalFooter .btn-primary');
  btn.disabled = true; btn.textContent = 'Adding…';
  const apiMap = { rooms: API.rooms, menu: API.menu, bar: API.bar };
  const fd = new FormData(form);
  try {
    const res  = await fetch(apiMap[dataType], { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      closeAdminModal();
      if (dataType === 'rooms') { await loadRoomsData(); loadRoomCategoriesTable(); }
      if (dataType === 'menu')  { await loadMenuData();  loadMenuCategoriesTable(); }
      if (dataType === 'bar')   { await loadBarData();   loadBarCategoriesTable(); }
    } else { alert(data.error || 'Failed to add category.'); }
  } catch { alert('Network error.'); }
  finally { btn.disabled = false; btn.textContent = 'Add Category'; }
}

function editCategory(dataType, catId) {
  const catMap = { rooms: _roomCategories, menu: _menuCategories, bar: _barCategories };
  const cat = (catMap[dataType] || []).find(c => c.id === catId);
  if (!cat) return;
  const bodyHTML = `
    <form id="editCategoryForm" class="admin-form">
      <input type="hidden" name="action" value="update_category" />
      <input type="hidden" name="id" value="${cat.id}" />
      <div class="form-group"><label>Category Name *</label>
        <input type="text" name="name" value="${cat.name}" required /></div>
      ${dataType === 'rooms' ? `
      <div class="form-group"><label>Description</label>
        <textarea name="description">${cat.description || ''}</textarea></div>` : ''}
      <div class="form-group"><label>Sort Order</label>
        <input type="number" name="order" value="${cat.order || ''}" /></div>
    </form>`;
  const footerHTML = `
    <button class="btn btn-outline btn-sm" onclick="closeAdminModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="submitEditCategory('${dataType}')">Save</button>`;
  openAdminModal(`Edit Category: ${cat.name}`, bodyHTML, footerHTML);
}

async function submitEditCategory(dataType) {
  const form = document.getElementById('editCategoryForm');
  if (!form) return;
  const btn = document.querySelector('#adminModalFooter .btn-primary');
  btn.disabled = true; btn.textContent = 'Saving…';
  const apiMap = { rooms: API.rooms, menu: API.menu, bar: API.bar };
  const fd = new FormData(form);
  try {
    const res  = await fetch(apiMap[dataType], { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      closeAdminModal();
      if (dataType === 'rooms') { await loadRoomsData(); loadRoomCategoriesTable(); loadRoomsTable(); }
      if (dataType === 'menu')  { await loadMenuData();  loadMenuCategoriesTable(); loadMenuTable(); }
      if (dataType === 'bar')   { await loadBarData();   loadBarCategoriesTable();  loadBarTable(); }
    } else { alert(data.error || 'Save failed.'); }
  } catch { alert('Network error.'); }
  finally { btn.disabled = false; btn.textContent = 'Save'; }
}

async function deleteCategory(dataType, catId, catName) {
  if (!confirm(`Delete category "${catName}"? This will fail if rooms/items are still assigned to it.`)) return;
  const apiMap = { rooms: API.rooms, menu: API.menu, bar: API.bar };
  try {
    const res  = await fetch(apiMap[dataType], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_category', id: catId }),
    });
    const data = await res.json();
    if (data.success) {
      if (dataType === 'rooms') { await loadRoomsData(); loadRoomCategoriesTable(); }
      if (dataType === 'menu')  { await loadMenuData();  loadMenuCategoriesTable(); }
      if (dataType === 'bar')   { await loadBarData();   loadBarCategoriesTable(); }
    } else { alert(data.error || 'Delete failed.'); }
  } catch { alert('Network error.'); }
}
