# BubbleShop — TalesRunner Item Shop

## Project Overview
E-commerce web app for selling TalesRunner game items. Pure client-side (HTML/CSS/JS) hosted on Firebase Hosting with Firestore as the database and Firebase Auth for admin authentication.

**Live site:** https://talesrunner-bubbleshop.web.app
**Firebase project:** telesrunner-afab6

## Tech Stack
- **Frontend:** Vanilla HTML/CSS/JS (no framework, no build step)
- **Database:** Cloud Firestore
- **Auth:** Firebase Authentication (email/password)
- **Hosting:** Firebase Hosting
- **No backend/server** — all logic is client-side, secured by Firestore rules

## Project Structure
```
├── index.html              # Storefront (customer-facing shop)
├── admin.html              # Admin panel
├── firebase.json           # Hosting config + cache headers
├── firestore.rules         # Firestore security rules
├── css/style.css           # All styles
├── js/
│   ├── firebase-config.js  # Firebase init (gitignored, use .example)
│   ├── shop-core.js        # Storefront: items, categories, UI
│   ├── shop-cart.js        # Storefront: cart, item modal
│   ├── shop-checkout.js    # Storefront: order submission (transaction)
│   ├── shop-history.js     # Storefront: order history lookup
│   ├── shop-reservation.js # Storefront: cart reservation system
│   ├── admin-core.js       # Admin: auth, login, init, event delegation
│   ├── admin-products.js   # Admin: product CRUD, stock, categories, pending approvals
│   ├── admin-orders.js     # Admin: order board, delivery, revenue
│   ├── admin-settings.js   # Admin: roles, shop settings, coupons
│   ├── modal-alert.js      # Shared: modal alerts, toasts, quota handling
│   └── no-devtools.js      # Anti-devtools (prod only)
└── pic/                    # Static images
```

## Admin Role System
Three roles with different permissions:
- **Owner** (`role: 'owner'`): Full access. Master UID hardcoded in Firestore rules. Can approve/reject all requests, manage admins, toggle shop.
- **Admin (internal)** (`role: 'admin'`): Can manage products, but changes to promo prices and product deletions require owner approval via `pending_actions`/`pending_deletes`.
- **External** (`role: 'external'`): Can only see shared products + own stock. Toggle active and adding products require owner approval. Cannot access settings tab.

## Key Firestore Collections
- `items` — Products (with `stockHistory` subcollection)
- `orders` — Customer orders (with `attachments` subcollection for slips)
- `admin_users` — Admin accounts and roles
- `pending_users` — Registration requests awaiting approval
- `pending_items` — New products awaiting owner approval
- `pending_deletes` — Delete requests awaiting owner approval
- `pending_actions` — Toggle/promo/category requests awaiting owner approval (deterministic doc IDs for dedup)
- `settings` — Shop state, PromptPay, etc.
- `coupons` — Discount coupons
- `reservations` — Cart reservations (TTL-based)
- `stats` — Revenue stats

## Approval System
Non-owner admins submit requests that go to `pending_*` collections. Owner sees these in the admin panel and can approve/reject. Deterministic doc IDs (e.g., `toggle_active_{itemId}`, `promo_{itemId}`, `cat_{name}`) prevent duplicate requests. `_approvingIds` Set prevents double-click on approve/reject buttons.

## Deployment
```bash
firebase deploy --only hosting    # Deploy site
firebase deploy --only firestore  # Deploy Firestore rules
```
Cache headers are set to `no-cache, no-store` in firebase.json — no version query strings needed on JS/CSS.

## Important Notes
- **Never commit `js/firebase-config.js`** — contains API keys. Use `firebase-config.js.example` as template.
- Firestore rules use `isAdmin()` function checking master UID OR `admin_users` collection.
- Deleting an admin from `admin_users` does NOT delete their Firebase Auth account (client SDK limitation). Firestore rules block their access instead.
- Product pagination: 20 items per page in admin panel.
- External admins see products in 2 groups: "shared with you" (interactive) and "not shared" (faded, non-interactive).
- Duplicate product names are blocked on add and on approval.
- Stock history records can be deleted per-admin by owner.
- Storefront hides quota details from customers — shows generic "ร้านปิดชั่วคราว" message.

## Language
UI is in Thai. Code comments are in Thai. User (project owner) communicates in Thai.
