// menu.js — Fetches /api/menu.php?action=list and renders food cards

async function loadMenu() {
  try {
    const res = await fetch('api/menu.php?action=list');
    const data = await res.json();
    return data.items || [];
  } catch {
    document.getElementById('menuGrid').innerHTML =
      '<div class="empty-state" style="grid-column:1/-1;"><div class="icon">⚠️</div><p>Could not load menu. Please try again later.</p></div>';
    return [];
  }
}

function buildMenuCard(m) {
  const img = m.image
    ? `<img src="images/food/${m.image}" alt="${m.name}" loading="lazy" />`
    : `<div class="placeholder-img">🍽️</div>`;

  return `
    <div class="menu-card" data-category="${m.category || ''}">
      <div class="menu-card-img">${img}</div>
      <div class="menu-card-body">
        <h4>${m.name}</h4>
        <p>${m.description || ''}</p>
        <div class="menu-card-footer">
          <span class="menu-price">₦${Number(m.price).toLocaleString()}</span>
          <span class="menu-cat">${m.category || 'Main'}</span>
        </div>
      </div>
    </div>`;
}

function renderMenu(items) {
  const grid = document.getElementById('menuGrid');
  if (!items.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="icon">🍽️</div><p>No menu items found.</p></div>';
    return;
  }
  grid.innerHTML = items.map(m => buildMenuCard(m)).join('');
}
