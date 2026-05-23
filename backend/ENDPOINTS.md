# API Endpoints

Base URL: `http://localhost:8000`

- Auth
  - POST `/api/auth/login` (form): `username`, `password` → `{ access_token, token_type }`

- Users (Bearer token required)
  - POST `/api/users/` → body `{ username, password, role? }` → created user
  - GET `/api/users/` → list users
  - DELETE `/api/users/{user_id}` → `{ status: "deleted" }`

- Canteens (Bearer token required)
  - POST `/api/canteens/` → `{ name }`
  - GET `/api/canteens/`
  - DELETE `/api/canteens/{canteen_id}`

- Stock (Bearer token required)
  - POST `/api/stock/` → `{ item_name, canteen_id, price, quantity }`
  - GET `/api/stock?canteen_id=1` → list
  - PATCH `/api/stock/{item_id}` → partial: `{ item_name?, price?, quantity? }`
  - DELETE `/api/stock/{item_id}`

- Sales (Bearer token required)
  - POST `/api/sales/` → `{ canteen_id, item_id, quantity_sold }` (decrements stock)
  - GET `/api/sales?canteen_id=1`
  - GET `/api/sales/analytics/daily?canteen_id=1`
  - GET `/api/sales/analytics/monthly?canteen_id=1`
  - GET `/api/sales/analytics/weekly-heatmap?canteen_id=1`

- Parking (Bearer token required)
  - GET `/api/parking/`
  - POST `/api/parking/` → `{ total_slots, available_slots, revenue }`
  - PATCH `/api/parking/{parking_id}` → `{ total_slots?, available_slots?, revenue? }`

## Curl Examples

Login:
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"
```

List stock for canteen 1:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/stock?canteen_id=1"
```

Create a sale:
```bash
curl -X POST http://localhost:8000/api/sales \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"canteen_id":1, "item_id": 1, "quantity_sold": 2}'
```
