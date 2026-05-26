// admin.js — Sends data to api/rooms.php and api/menu.php

const API = {
  rooms: '../api/rooms.php',
  menu:  '../api/menu.php',
};

// ── Utility ────────────────────────────────────────────────────────
function showAlert(containerId, msg, type = 'success') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">${type === 'success' ? '✅' : '⚠️'} ${msg}</div>`;
  setTimeout(() => { el.innerHTML = ''; }, 5000);
}

function fmt(n) {
  return '₦' + Number(n).toLocaleString('en-NG');
}

// ── Overview Stats ─────────────────────────────────────────────────
async function loadOverviewStats() {
  try {
    const [rRes, mRes] = await Promise.all([
      fetch(API.rooms + '?action=list'),
      fetch(API.menu  + '?action=list'),
    ]);
    const rData = await rRes.json();
    const mData = await mRes.json();

    const rooms = rData.rooms || [];
    const items = mData.items || [];

    document.getElementById('statRooms').textContent     = rooms.length;
    document.getElementById('statMenuItems').textContent = items.length;

    if (rooms.length) {
      const lowest = Math.min(...rooms.map(r => r.price));
      document.getElementById('statLowestRoom').textContent = fmt(lowest);
    }
  } catch (err) {
    console.error('Failed to load stats', err);
  }
}

// ── Rooms Table ────────────────────────────────────────────────────
async function loadRoomsTable() {
  const wrap = document.getElementById('roomsTableWrap');
  wrap.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading…</p></div>';

  try {
    const res  = await fetch(API.rooms + '?action=list');
    const data = await res.json();
    const rooms = data.rooms || [];

    if (!rooms.length) {
      wrap.innerHTML = '<div class="empty-state" style="padding:40px;"><div class="icon">🛏️</div><p>No rooms yet. Add one above.</p></div>';
      return;
    }

    wrap.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Photo</th>
            <th>Name</th>
            <th>Type</th>
            <th>Capacity</th>
            <th>Size</th>
            <th>Bed</th>
            <th>Price / Night</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rooms.map(r => `
            <tr>
              <td>
                ${r.image
                  ? `<img src="../images/rooms/${r.image}" class="item-img" alt="${r.name}" />`
                  : `<div class="item-img" style="display:inline-flex;align-items:center;justify-content:center;background:var(--ivory-dk);font-size:1.2rem;">🛏️</div>`}
              </td>
              <td><strong>${r.name}</strong><br><small style="color:var(--muted);">${(r.description||'').substring(0,50)}…</small></td>
              <td>${r.type || '—'}</td>
              <td>${r.capacity || 2}</td>
              <td>${r.size || '—'}</td>
              <td>${r.bed || '—'}</td>
              <td>${fmt(r.price)}</td>
              <td>
                <span style="display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;
                  color:${r.available ? '#2d6a4a' : '#8b2b2b'};">
                  ${r.available ? '✅ Available' : '❌ Unavailable'}
                </span>
              </td>
              <td>
                <button class="btn btn-danger btn-sm" onclick="deleteRoom('${r.id}')">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch {
    wrap.innerHTML = '<div class="empty-state" style="padding:40px;"><div class="icon">⚠️</div><p>Failed to load rooms.</p></div>';
  }
}

async function deleteRoom(id) {
  if (!confirm('Delete this room? This cannot be undone.')) return;

  try {
    const res = await fetch(API.rooms, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.success) {
      showAlert('roomFormAlert', 'Room deleted successfully.');
      loadRoomsTable();
      loadOverviewStats();
    } else {
      showAlert('roomFormAlert', data.error || 'Delete failed.', 'error');
    }
  } catch {
    showAlert('roomFormAlert', 'Network error. Please try again.', 'error');
  }
}

// Add Room form submission
document.addEventListener('DOMContentLoaded', () => {
  const addRoomForm = document.getElementById('addRoomForm');
  if (addRoomForm) {
    addRoomForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = this.querySelector('button[type=submit]');
      btn.disabled = true;
      btn.textContent = 'Adding…';

      const fd = new FormData(this);
      fd.append('action', 'add');

      // Convert amenities to array
      const amenStr = fd.get('amenities') || '';
      fd.delete('amenities');
      amenStr.split(',').map(s => s.trim()).filter(Boolean).forEach(a => fd.append('amenities[]', a));

      try {
        const res  = await fetch(API.rooms, { method: 'POST', body: fd });
        const data = await res.json();

        if (data.success) {
          showAlert('roomFormAlert', `Room "${data.room.name}" added successfully!`);
          this.reset();
          loadRoomsTable();
          loadOverviewStats();
        } else {
          showAlert('roomFormAlert', data.error || 'Failed to add room.', 'error');
        }
      } catch {
        showAlert('roomFormAlert', 'Network error. Please try again.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Add Room';
      }
    });
  }

  // ── Menu Table ──────────────────────────────────────────────────
  const addMenuForm = document.getElementById('addMenuForm');
  if (addMenuForm) {
    addMenuForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = this.querySelector('button[type=submit]');
      btn.disabled = true;
      btn.textContent = 'Adding…';

      const fd = new FormData(this);
      fd.append('action', 'add');

      try {
        const res  = await fetch(API.menu, { method: 'POST', body: fd });
        const data = await res.json();

        if (data.success) {
          showAlert('menuFormAlert', `"${data.item.name}" added to menu!`);
          this.reset();
          loadMenuTable();
          loadOverviewStats();
        } else {
          showAlert('menuFormAlert', data.error || 'Failed to add item.', 'error');
        }
      } catch {
        showAlert('menuFormAlert', 'Network error. Please try again.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Add Item';
      }
    });
  }
});

async function loadMenuTable() {
  const wrap = document.getElementById('menuTableWrap');
  wrap.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading…</p></div>';

  try {
    const res  = await fetch(API.menu + '?action=list');
    const data = await res.json();
    const items = data.items || [];

    if (!items.length) {
      wrap.innerHTML = '<div class="empty-state" style="padding:40px;"><div class="icon">🍽️</div><p>No menu items yet.</p></div>';
      return;
    }

    wrap.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Photo</th>
            <th>Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(m => `
            <tr>
              <td>
                ${m.image
                  ? `<img src="../images/food/${m.image}" class="item-img" alt="${m.name}" />`
                  : `<div class="item-img" style="display:inline-flex;align-items:center;justify-content:center;background:var(--ivory-dk);font-size:1.2rem;">🍽️</div>`}
              </td>
              <td>
                <strong>${m.name}</strong><br>
                <small style="color:var(--muted);">${(m.description||'').substring(0,50)}${m.description?.length > 50 ? '…' : ''}</small>
              </td>
              <td><span class="menu-cat">${m.category}</span></td>
              <td>${fmt(m.price)}</td>
              <td>
                <span style="font-size:0.75rem;color:${m.available ? '#2d6a4a' : '#8b2b2b'};">
                  ${m.available ? '✅ Available' : '❌ Unavailable'}
                </span>
              </td>
              <td>
                <button class="btn btn-danger btn-sm" onclick="deleteMenuItem('${m.id}')">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch {
    wrap.innerHTML = '<div class="empty-state" style="padding:40px;"><div class="icon">⚠️</div><p>Failed to load menu.</p></div>';
  }
}

async function deleteMenuItem(id) {
  if (!confirm('Delete this menu item? This cannot be undone.')) return;

  try {
    const res = await fetch(API.menu, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.success) {
      showAlert('menuFormAlert', 'Menu item deleted successfully.');
      loadMenuTable();
      loadOverviewStats();
    } else {
      showAlert('menuFormAlert', data.error || 'Delete failed.', 'error');
    }
  } catch {
    showAlert('menuFormAlert', 'Network error. Please try again.', 'error');
  }
}
