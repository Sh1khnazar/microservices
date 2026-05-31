# UyTop Microservices

NestJS 11 + RabbitMQ + PostgreSQL 16 asosidagi ijara tizimi.

## Arxitektura

```
                  ┌─────────────────────────────────────────────────────┐
  HTTP client ──► │  api-gateway :3000  (JWT guard, ValidationPipe)     │
                  └────────┬──────────┬──────────────┬──────────────────┘
                           │ RMQ      │ RMQ          │ RMQ
                  ┌────────┴──┐  ┌────┴──────┐  ┌────┴────────┐
                  │user-svc   │  │property-  │  │booking-svc  │
                  │:3001/health│  │svc        │  │:3003/health │
                  │user_db    │  │:3002/health│  │booking_db   │
                  └───────────┘  │property_db│  └─────────────┘
                                 └───────────┘
```

**Servislar:**

| Servis            | Vazifa                     | Queue            | Health port |
|-------------------|----------------------------|------------------|-------------|
| `api-gateway`     | HTTP kirish, JWT, routing  | —                | 3000        |
| `user-service`    | Foydalanuvchilar, bcrypt, JWT sign | `user_queue` | 3001 |
| `property-service`| Ko'chmas mulk, egalik      | `property_queue` | 3002        |
| `booking-service` | Bron, izchillik, overlap   | `booking_queue`  | 3003        |

## Tez ishga tushirish

```bash
# 1. Root .env yaratish
cp .env .env.local
# JWT_SECRET ni o'zgartiring!

# 2. Butun tizimni ko'tarish
docker compose up --build

# 3. Migratsiyalar (ixtiyoriy — synchronize=false bilan avto-migrate yo'q)
docker compose exec user-service node dist/database/datasource.js migration:run
docker compose exec property-service node dist/database/datasource.js migration:run
docker compose exec booking-service node dist/database/datasource.js migration:run
```

Tizim tayyor: `http://localhost:3000`

## Lokal ishlab chiqish

Har servisda o'z `.env` fayli bor:

```bash
# user-service
cd user-service && cp .env.example .env   # .env ni to'ldiring
pnpm install && pnpm start:dev
```

**Kerakli env o'zgaruvchilar:**

| O'zgaruvchi       | Servis(lar)                          | Misol                                          |
|-------------------|--------------------------------------|------------------------------------------------|
| `RABBITMQ_URL`    | Hammasi                              | `amqp://admin:secret@localhost:5672`           |
| `DATABASE_URL`    | user, property, booking              | `postgresql://postgres:secret@localhost:5433/user_db` |
| `JWT_SECRET`      | user-service, api-gateway            | kuchli tasodifiy satr                          |
| `HEALTH_PORT`     | user, property, booking (ixtiyoriy)  | `3001` / `3002` / `3003`                       |

## API endpointlar

### Auth
| Metod | Endpoint       | Auth | Tavsif              |
|-------|---------------|------|---------------------|
| POST  | `/auth/login` | —    | Email+parol → JWT   |

### Users
| Metod  | Endpoint      | Auth | Tavsif           |
|--------|--------------|------|------------------|
| POST   | `/users`     | —    | Ro'yxatdan o'tish |
| GET    | `/users`     | —    | Ro'yxat           |
| GET    | `/users/:id` | —    | Bitta             |
| PUT    | `/users/:id` | —    | Yangilash         |
| DELETE | `/users/:id` | —    | O'chirish         |

### Properties
| Metod  | Endpoint           | Auth         | Tavsif                         |
|--------|-------------------|--------------|--------------------------------|
| POST   | `/properties`     | JWT required | Yaratish (ownerId tokendan)    |
| GET    | `/properties`     | —            | Ro'yxat                        |
| GET    | `/properties/:id` | —            | Bitta                          |
| PUT    | `/properties/:id` | JWT + owner  | Faqat egasi yangilaydi         |
| DELETE | `/properties/:id` | JWT + owner  | Faqat egasi o'chiradi          |

### Bookings
| Metod | Endpoint                | Auth         | Tavsif                        |
|-------|------------------------|--------------|-------------------------------|
| POST  | `/bookings`            | JWT required | Bron (userId tokendan)        |
| GET   | `/bookings`            | —            | Ro'yxat                       |
| GET   | `/bookings/:id`        | —            | Bitta                         |
| PATCH | `/bookings/:id/cancel` | JWT required | Bekor qilish                  |

## Migratsiyalar

```bash
# Yangi migration yaratish
cd user-service && pnpm migration:generate src/database/migrations/MigrationName

# Migratsiyani ishga tushirish
pnpm migration:run

# Orqaga qaytarish
pnpm migration:revert
```

## Testlar

```bash
# booking-service unit testlar
cd booking-service && pnpm test

# Coverage
pnpm test:cov
```

## Ma'lum cheklovlar

- **Saga / Outbox yo'q:** `booking-service` property-serviceга `setAvailability` yuboradi. Muvaffaqiyatsiz bo'lsa compensating action (FAILED/CONFIRMED qaytarish) qo'llanadi, lekin to'liq Saga pattern yo'q.
- **Race condition himoyasi:** Tranzaksiya ichida `SELECT ... FOR UPDATE` (pessimistic lock) ishlatiladi. DB darajasida `tsrange EXCLUDE` constraint keyingi migratsiya sifatida qo'shilishi tavsiya etiladi.
- **Booking cancel:** Hozirda token egasi tekshirilmaydi — autorizatsiya faqat autentifikatsiya darajasida.
