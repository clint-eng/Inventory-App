# Pest Control Inventory Manager

A lightweight **multi-page** app to manage inventory for pest control products with role-based access.

## Access levels

- **Administrator** (`admin123`) → redirected to `admin.html`
  - Inventory management
  - Setup product catalog (with optional product picture)
  - Administrative reports (summary, inventory, orders)
- **Technician** (`tech123`) → redirected to `technician.html`
  - Approved products
  - Order requests
  - Tasks and scanner placeholder

## Run locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.
