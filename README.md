# Grandeur Hotel Website

A complete, production-ready hotel website with a PHP back-end, JSON data storage, and a polished admin dashboard.

---

## Tech Stack

- **Front-end**: Plain HTML, CSS (custom design system), vanilla JavaScript
- **Back-end**: PHP 8.0+ (REST-like API endpoints)
- **Storage**: JSON flat files (`data/rooms.json`, `data/menu.json`)
- **Server**: Apache (with `.htaccess`) or any PHP-capable server

---

## Project Structure

```
hotel-website/
├── index.html              ← Home page
├── rooms.html              ← Rooms listing
├── about.html              ← About Us
├── contact.html            ← Contact & Reservations
├── menu.html               ← Restaurant menu (not in main nav)
├── css/style.css           ← All styles
├── js/
│   ├── rooms.js            ← Fetches & renders rooms
│   └── menu.js             ← Fetches & renders menu items
├── api/
│   ├── rooms.php           ← GET / POST / DELETE rooms
│   └── menu.php            ← GET / POST / DELETE menu items
├── admin/
│   ├── index.html          ← Admin login
│   ├── dashboard.html      ← Admin dashboard
│   ├── admin.js            ← Admin CRUD logic
│   └── .htaccess           ← Optional HTTP Basic Auth
├── data/
│   ├── rooms.json          ← Room records (auto-created)
│   └── menu.json           ← Menu records (auto-created)
└── images/
    ├── rooms/              ← Uploaded room photos
    └── food/               ← Uploaded food photos
```

---

## Quick Start

### Requirements
- PHP 8.0 or later
- Apache (or Nginx with equivalent config)
- `mod_rewrite` enabled (Apache)

### 1. Deploy
Upload the entire `hotel-website/` folder to your web server's public root (e.g. `/var/www/html/hotel-website`).

### 2. Set file permissions
```bash
chmod 755 data/
chmod 644 data/rooms.json data/menu.json
chmod 755 images/rooms/ images/food/
```

### 3. Access the site
- **Public site**: `http://yourdomain.com/hotel-website/`
- **Admin panel**: `http://yourdomain.com/hotel-website/admin/`
  - Default password: `grandeur2025`

---

## API Reference

### Rooms — `api/rooms.php`

| Method | Params | Description |
|--------|--------|-------------|
| `GET`  | `?action=list` | Return all rooms |
| `POST` | FormData with `action=add` | Add a new room |
| `POST` | JSON/FormData with `action=update` | Update a room |
| `DELETE` | JSON body `{ "id": "room_xxx" }` | Delete a room |

**Room fields**: `name`, `type`, `price`, `capacity`, `size`, `bed`, `description`, `amenities[]`, `image` (file upload)

### Menu — `api/menu.php`

| Method | Params | Description |
|--------|--------|-------------|
| `GET`  | `?action=list` | Return all menu items |
| `GET`  | `?action=list&category=Main` | Filter by category |
| `POST` | FormData with `action=add` | Add a new item |
| `DELETE` | JSON body `{ "id": "item_xxx" }` | Delete an item |

**Menu categories**: `Breakfast`, `Starters`, `Main`, `Dessert`, `Drinks`

---

## Admin Panel

1. Go to `/admin/` and enter the password (`grandeur2025`)
2. From the **Dashboard** you can:
   - View counts for rooms and menu items
   - Add rooms with photo uploads
   - Add menu items with photo uploads
   - Delete any room or menu item
3. Authentication uses `sessionStorage` (client-side). For production, implement server-side sessions.

### Enabling HTTP Basic Auth (optional extra layer)
1. Generate a password file:
   ```bash
   htpasswd -c admin/.htpasswd admin
   ```
2. Uncomment the auth lines in `admin/.htaccess`

---

## Customisation

### Branding
- Hotel name: search & replace `Grandeur` across HTML files
- Colours: edit the `:root` variables at the top of `css/style.css`
- Fonts: change the Google Fonts import in `css/style.css`

### Adding images
- Place room photos in `images/rooms/` and upload via the admin panel
- Place food photos in `images/food/` and upload via the admin panel
- Accepted formats: JPEG, PNG, WebP (max 10 MB)

### Currency
- Currently uses ₦ (Nigerian Naira). Search `₦` and `toLocaleString('en-NG')` to change.

---

## Security Notes

- The admin login is **client-side only** by default — suitable for low-risk or private deployments.
- For production, replace `sessionStorage` auth with a PHP session and hashed password check.
- The `.htaccess` blocks direct access to `.json` data files.
- Image uploads are validated by MIME type server-side.
- Consider adding CSRF protection for the POST endpoints in production.

---

## License

MIT — free to use and modify for your own hotel or hospitality project.
# hotel-website
