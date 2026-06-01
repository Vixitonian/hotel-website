// rooms.js — Fetches api/rooms.php and renders room category cards + room cards

async function loadRooms() {
  try {
    const res  = await fetch('api/rooms.php?action=list');
    const data = await res.json();
    return { categories: data.categories || [], rooms: data.rooms || [] };
  } catch {
    const grid = document.getElementById('roomsGrid');
    if (grid) grid.innerHTML =
      '<div class="empty-state" style="grid-column:1/-1;"><div class="icon">⚠️</div><p>Could not load rooms. Please try again later.</p></div>';
    return { categories: [], rooms: [] };
  }
}

function buildRoomCard(r, categories) {
  const cat     = (categories || []).find(c => c.id === r.category_id);
  const hasDisc = r.discounted_price && r.discounted_price < r.price;
  const imgSrc  = (r.images && r.images.length)
    ? `<img src="images/rooms/${r.images[0]}" alt="Room ${r.number}" loading="lazy" />`
    : `<div class="placeholder-img">🛏️</div>`;
  const priceHTML = hasDisc
    ? `<span class="price-original">₦${Number(r.price).toLocaleString()}</span>
       <span class="price-discounted">₦${Number(r.discounted_price).toLocaleString()}<span class="per">/ night</span></span>`
    : `<span class="price-discounted">₦${Number(r.price).toLocaleString()}<span class="per">/ night</span></span>`;
  const availHTML = r.available
    ? '<span class="avail-badge available">✓ Available</span>'
    : '<span class="avail-badge unavailable">✕ Unavailable</span>';
  return `
    <div class="room-card">
      <div class="room-card-img">${imgSrc}<span class="room-badge">${cat ? cat.name : ''}</span></div>
      <div class="room-card-body">
        <span class="room-number-badge">Room ${r.number}</span>
        <h3>${r.name || (cat ? cat.name : 'Room')}</h3>
        <div class="room-meta" style="margin-bottom:8px;">${availHTML}</div>
        <p class="room-desc">${(r.description || '').substring(0, 100)}…</p>
        <div class="room-card-footer" style="margin-top:16px;">
          <div class="room-price">${priceHTML}</div>
          <a href="contact.html" class="btn btn-primary btn-sm">Enquire</a>
        </div>
      </div>
    </div>`;
}

function renderRooms(rooms, categories) {
  const grid = document.getElementById('roomsGrid');
  if (!grid) return;
  if (!rooms.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="icon">🛏️</div><p>No rooms found.</p></div>';
    return;
  }
  grid.innerHTML = rooms.map(r => buildRoomCard(r, categories)).join('');
}
