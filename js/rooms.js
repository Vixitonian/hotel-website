// rooms.js — Fetches /api/rooms.php?action=list and renders room cards

async function loadRooms() {
  try {
    const res = await fetch('api/rooms.php?action=list');
    const data = await res.json();
    return data.rooms || [];
  } catch {
    document.getElementById('roomsGrid').innerHTML =
      '<div class="empty-state" style="grid-column:1/-1;"><div class="icon">⚠️</div><p>Could not load rooms. Please try again later.</p></div>';
    return [];
  }
}

function buildRoomCard(r) {
  const img = r.image
    ? `<img src="images/rooms/${r.image}" alt="${r.name}" loading="lazy" />`
    : `<div class="placeholder-img">🛏️</div>`;

  const amenities = (r.amenities || []).slice(0, 3).map(a => `<span>${a}</span>`).join('');

  return `
    <div class="room-card" data-type="${r.type || ''}">
      <div class="room-card-img">
        ${img}
        <span class="room-badge">${r.type || 'Room'}</span>
      </div>
      <div class="room-card-body">
        <h3>${r.name}</h3>
        <div class="room-meta">
          <span>👤 ${r.capacity || 2} Guests</span>
          <span>📐 ${r.size || '—'}</span>
          <span>🛏️ ${r.bed || 'King'}</span>
        </div>
        <p class="room-desc">${r.description || ''}</p>
        ${amenities ? `<div class="room-meta" style="flex-wrap:wrap;gap:8px;margin-bottom:0;">${amenities}</div>` : ''}
        <div class="room-card-footer" style="margin-top:16px;">
          <div class="room-price">
            <span class="amount">₦${Number(r.price).toLocaleString()}</span>
            <span class="per">per night</span>
          </div>
          <a href="contact.html?room=${encodeURIComponent(r.name)}" class="btn btn-primary btn-sm">Book Now</a>
        </div>
      </div>
    </div>`;
}

function renderRooms(rooms) {
  const grid = document.getElementById('roomsGrid');
  if (!rooms.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="icon">🛏️</div><p>No rooms found.</p></div>';
    return;
  }
  grid.innerHTML = rooms.map(r => buildRoomCard(r)).join('');
}
