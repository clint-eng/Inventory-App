# Pest Control Inventory Manager

A lightweight single-page app to manage inventory for pest control products.

## Features

- Role-based sign-in for **Administrator** and **Technician** users.
- Home screen with quick navigation to **Dashboard**, **Inventory Counts**, **Inventory Requests**, and **Setup Menu**.
- Dashboard with lists for approved products, technicians, locations, products in locations, current orders, trucks, and warehouses.
- Service subsection with quick links to **Inventory**, **Order**, **Tasks**, **Products**, and **Scanner**.
- Setup Menu for core master data: **warehouses, trucks, company, technicians (with email), suppliers, and products** (administrator access), including optional product pictures.
- Administrative page includes a Reports tab with Summary, Inventory, and Orders report outputs.
- Add products with category, quantity, unit, minimum threshold, and expiration date.
- Track each technician with an individual truck inventory keeper profile including email.
- Transfer stock from office inventory to a technician truck.
- Show total inventory on hand per truck and itemized truck inventory details.
- Persist inventory, setup data, technician inventory, and technician request data in browser `localStorage`.
- Visual product status for in stock, low stock, or expired items.
- Optional filter to show only low stock products.
- Technician DD subset section for ordering low-stock items from the main office.
- Build, edit, and copy a request summary for the main office.

## Run locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.
