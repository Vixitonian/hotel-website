// menu.js — Fetches api/menu.php and renders menu cards

async function loadMenu() {
  try {
    const res  = await fetch('api/menu.php?action=list');
    const data = await res.json();
    return { categories: data.categories || [], items: data.items || [] };
  } catch {
    const grid = document.getElementById('menuGrid');
    if (grid) grid.innerHTML =
      '<div class="empty-state" style="grid-column:1/-1;"><div class="icon">⚠️</div><p>Could not load menu. Please try again later.</p></div>';
    return { categories: [], items: [] };
  }
}

function buildMenuCard(m, categories) {
  const cat = (categories || []).find(c => c.id === m.category_id);
  const img = m.image
    ? `<img src="images/food/${m.image}" alt="${m.name}" loading="lazy" />`
    : `<img src="images/avanna_placeholder.jpg" alt="Avanna Hotel" loading="lazy" />`;
  return `
    <div class="menu-card">
      <div class="menu-card-img">${img}</div>
      <div class="menu-card-body">
        <h4>${m.name}</h4>
        <p>${m.description || ''}</p>
        <div class="menu-card-footer">
          <span class="menu-price">₦${Number(m.price).toLocaleString()}</span>
          <span class="menu-cat">${cat ? cat.name : ''}</span>
        </div>
      </div>
    </div>`;
}

function renderMenu(items, categories) {
  const grid = document.getElementById('menuGrid');
  if (!grid) return;
  if (!items.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="icon">🍽️</div><p>No menu items found.</p></div>';
    return;
  }
  grid.innerHTML = items.filter(i => i.available !== false).map(m => buildMenuCard(m, categories)).join('');
}
