# HotelPro: Hotel Booking & Management System

HotelPro is a full-stack MERN application for a single hotel. Guests can search live availability, book rooms, pay online and manage their reservations. Staff get a protected admin dashboard for rooms, bookings, guests, reports and an audit log.

- **Frontend:** React 19 + Vite, Tailwind CSS 4, React Router 7, React Hook Form, Axios, Recharts, react-day-picker
- **Backend:** Node.js 20 + Express 4, MongoDB + Mongoose 8, Zod validation, JWT in HttpOnly cookies
- **Payments:** Razorpay (orders, signature verification, webhooks, refunds). A clearly labelled **development-only mock gateway** is used when no keys are configured.

---

## Contents

1. [Features](#features)
2. [Folder structure](#folder-structure)
3. [Prerequisites](#prerequisites)
4. [Getting started](#getting-started)
5. [Environment variables](#environment-variables)
6. [MongoDB configuration](#mongodb-configuration)
7. [Seeding the admin account and rooms](#seeding-the-admin-account-and-rooms)
8. [How booking, inventory and payments work](#how-booking-inventory-and-payments-work)
9. [API reference](#api-reference)
10. [Testing](#testing)
11. [Payment gateway setup (Razorpay)](#payment-gateway-setup-razorpay)
12. [Deployment (Vercel + Render)](#deployment-vercel--render)
13. [Security notes](#security-notes)
14. [Troubleshooting](#troubleshooting)
15. [Known limitations](#known-limitations)

---

## Features

### Guests
- Home page with hero search (dates, adults, children, rooms), featured rooms, categories, amenities, testimonials and calls to action
- Rooms listing with live availability for chosen dates, filters (category, price, capacity, amenities), sorting, pagination and shareable URLs
- Room details: gallery with lightbox, capacity, bed configuration, amenities, policies, availability check and server-calculated price breakdown
- Booking checkout: guest details form, 15-minute inventory hold with countdown, online payment, confirmation with booking reference
- My Bookings (upcoming / past / cancelled), booking details, printable confirmation, cancellation that previews the refund
- Registration, login, logout, password visibility toggle and strength meter, forgot/reset password, profile editing, password change
- Contact form, About, Privacy Policy, Terms, custom 404 page
- Responsive from 360px phones to large desktops; keyboard-accessible dialogs, menus and date picker; semantic HTML; skip link

### Administrators
- Dashboard: KPIs (bookings by status, units occupied and available tonight, verified revenue net of refunds), 30-day revenue and booking trends, 7-night occupancy forecast, recent bookings. Every chart has a table view.
- Rooms: create, edit, activate/deactivate, delete (only if never booked), pricing, amenities, inventory, image upload (Cloudinary or local) and image URLs, per-room booking history
- Bookings: search by reference, guest name, email or phone; filter by status, payment status and date range; full detail view; check-in, check-out, no-show, and cancel with refund. Every change is audited.
- Users: search and filter, booking history and spend, activate/deactivate (ends their sessions immediately)
- Reports: revenue (verified payments only), bookings, occupancy and cancellations, with CSV export
- Contact messages inbox and audit log viewer

---

## Folder structure

```text
HotelPro/
├── client/                         React + Vite frontend
│   ├── public/                     favicon
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/             Button, form controls, Modal/ConfirmDialog, Pagination, Badges, route guards…
│   │   │   ├── layout/             Navbar, Footer, MainLayout, AdminLayout, AuthLayout
│   │   │   ├── rooms/              RoomCard, RoomGallery, RoomFilters, amenity icons
│   │   │   ├── booking/            SearchForm, DateRangePicker, GuestSelector, PriceSummary, PaymentPanel…
│   │   │   └── dashboard/          KPI cards, charts, data table, admin header
│   │   ├── pages/                  Home, Rooms, RoomDetails, Booking, BookingDetails, MyBookings, Profile, auth pages…
│   │   │   └── admin/              Dashboard, AdminRooms, RoomEditor, AdminBookings, AdminUsers, Reports, Messages, AuditLogs
│   │   ├── context/AuthContext.jsx
│   │   ├── hooks/                  useAsync, usePayment, useStayParams, useQueryFilters…
│   │   ├── services/               Axios client (CSRF + session handling) and one module per API area
│   │   ├── utils/                  date helpers, formatting, constants, validation rules
│   │   ├── __tests__/              Vitest + React Testing Library
│   │   ├── App.jsx, main.jsx, index.css
│   ├── .env.example
│   ├── vercel.json                 SPA rewrite for Vercel
│   └── package.json
├── server/                         Express API
│   ├── config/                     env loading/validation, MongoDB connection
│   ├── controllers/                auth, rooms, bookings, payments, admin, contact
│   ├── middleware/                 auth/roles, CSRF, validation, sanitising, rate limits, uploads, errors
│   ├── models/                     User, Room, RoomInventory, Booking, Payment, PasswordResetToken, AuditLog, ContactMessage
│   ├── routes/                     REST routes under /api
│   ├── services/                   booking rules, inventory ledger, payments + gateway abstraction, email, uploads, audit
│   ├── validators/                 Zod schemas
│   ├── utils/                      dates (timezone-aware), pricing, CSV, HTTP helpers, logger
│   ├── scripts/seed.js             rooms + admin seeding
│   ├── tests/                      Node test runner + Supertest + in-memory MongoDB
│   ├── uploads/                    local image storage (development fallback)
│   ├── app.js, index.js
│   ├── .env.example
│   └── package.json
├── docs/HotelPro.postman_collection.json
├── render.yaml                     Render blueprint for the API
├── .gitignore
└── README.md
```

---

## Prerequisites

- **Node.js 20 or newer** (`node -v`)
- **MongoDB 6+**: local install, Docker, or a free MongoDB Atlas cluster
- npm 9+ and Git

---

## Getting started

```bash
git clone <your-repo-url> HotelPro
cd HotelPro

# 1. Configure environment files
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit server/.env and set JWT_SECRET to a long random value:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Run the app in **two terminals**:

**Terminal 1: backend** (http://localhost:8001)

```bash
cd HotelPro/server
npm install
npm run seed      # first time only: rooms + admin account (prints the admin password)
npm run dev
```

**Terminal 2: frontend** (http://localhost:5173)

```bash
cd HotelPro/client
npm install
npm run dev
```

Open http://localhost:5173. Health check: http://localhost:8001/api/health

### npm scripts

| Location | Script | What it does |
|---|---|---|
| server | `npm run dev` | Start the API with auto-restart (`node --watch`) |
| server | `npm start` | Start the API (production) |
| server | `npm run seed` | Upsert the room catalogue and ensure an admin account exists |
| server | `npm run seed -- --rooms-only` | Seed rooms only |
| server | `npm test` | Run the API test suite (in-memory MongoDB) |
| client | `npm run dev` | Vite dev server on port 5173 |
| client | `npm run build` / `npm run preview` | Production build / preview it locally |
| client | `npm test` | Vitest + React Testing Library |

---

## Environment variables

### `client/.env`

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8001/api` | Base URL of the API, including `/api` |

### `server/.env`

Required:

| Variable | Example | Notes |
|---|---|---|
| `PORT` | `8001` | |
| `NODE_ENV` | `development` | `production` enables secure cookies, hides error details, disables the mock gateway and enforces config checks |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin(s); comma-separate multiple. Also used to build password-reset links. |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/hotelpro` | |
| `JWT_SECRET` | 64+ random chars | **Must** be set in production (the server refuses to start otherwise) |
| `JWT_EXPIRES_IN` | `1d` | Also sets the cookie lifetime (`s`, `m`, `h`, `d`) |
| `COOKIE_NAME` | `hotelpro_token` | |

Optional (all have safe development defaults):

| Group | Variables |
|---|---|
| Cookies / proxy | `COOKIE_SAMESITE` (`lax` dev, `none` prod), `COOKIE_SECURE` (`false` dev, `true` prod), `TRUST_PROXY` (number of proxies, `1` on Render), `SERVER_PUBLIC_URL` (public API URL used for locally stored image URLs) |
| Seed admin | `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PHONE` |
| Hotel policy | `HOTEL_NAME`, `HOTEL_TIMEZONE` (`Asia/Kolkata`), `HOTEL_CURRENCY` (`INR`), `TAX_RATE` (`0.12`), `SERVICE_FEE_RATE` (`0.03`), `CHECK_IN_HOUR` (`14`), `FREE_CANCELLATION_HOURS` (`48`), `PENDING_BOOKING_TTL_MINUTES` (`15`), `MAX_NIGHTS` (`30`), `MAX_ROOMS_PER_BOOKING` (`5`), `BOOKING_WINDOW_DAYS` (`365`) |
| Password reset | `RESET_TOKEN_TTL_MINUTES` (`30`) |
| Email (Nodemailer) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `ADMIN_NOTIFY_EMAIL` (receives contact-form notifications) |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER` |
| Razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `ENABLE_MOCK_PAYMENTS` (dev only; default `true`) |

Without SMTP, emails, including password-reset links, are **printed to the server console** in development. Without Cloudinary, uploads are stored in `server/uploads/` and served from `/uploads`.

`.env` files are git-ignored; only the `.env.example` files are committed. Never reuse example values in production.

---

## MongoDB configuration

**Local install (macOS, Homebrew)**

```bash
brew tap mongodb/brew && brew install mongodb-community@7.0
brew services start mongodb-community@7.0
# MONGO_URI=mongodb://127.0.0.1:27017/hotelpro
```

**Docker**

```bash
docker run -d --name hotelpro-mongo -p 27017:27017 mongo:7
```

**MongoDB Atlas**
1. Create a free cluster, then a database user with a strong password.
2. Under *Network Access*, allow your IP (or `0.0.0.0/0` for Render).
3. Copy the connection string into `MONGO_URI`, e.g.
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/hotelpro?retryWrites=true&w=majority`

Indexes are created automatically on start-up. A standalone server is enough: the inventory strategy below does not need replica-set transactions.

---

## Seeding the admin account and rooms

```bash
cd server
npm run seed
```

- Upserts 8 room types (5 categories, 49 bookable units) with photos. Re-running is safe.
- Ensures the admin account given by `SEED_ADMIN_EMAIL` (default `admin@hotelpro.local` in development) exists with the `admin` role.
- If `SEED_ADMIN_PASSWORD` is empty in development, a random password is generated and **printed once**. Set `SEED_ADMIN_PASSWORD` to choose your own; re-running the seed then updates it.
- In production both `SEED_ADMIN_EMAIL` and a strong `SEED_ADMIN_PASSWORD` (12+ characters, mixed case and a digit) are required. No credentials are hard-coded.

Sign in at http://localhost:5173/login with the admin account to reach `/admin`. There is no way to become an admin through the API: the role is never read from requests.

---

## How booking, inventory and payments work

**Dates and timezone.** Stay dates are calendar dates (`YYYY-MM-DD`) stored as midnight UTC. "Today" and check-in times are evaluated in `HOTEL_TIMEZONE`, so every guest sees the same rules as the front desk.

**Rules enforced on the server**
- Check-out must be after check-in; check-in cannot be in the past (it can be today); at most `MAX_NIGHTS` nights and `BOOKING_WINDOW_DAYS` ahead.
- Capacity per room type: `adults ≤ maxAdults × rooms`, `children ≤ maxChildren × rooms`, and at least one adult per room.
- Prices are calculated only on the server: `nightly rate × nights × rooms`, plus tax and service fee. The full breakdown is snapshotted on the booking, so later price changes never alter existing bookings. Client-sent prices, statuses or user ids are ignored.

**Inventory without overbooking.** Each room type has `inventory` identical units. The `RoomInventory` collection keeps one document per room type per night with a `booked` counter. Reserving a stay runs, night by night, an atomic conditional update:
`updateOne({ room, date, booked: { $lte: inventory - units } }, { $inc: { booked: units } })`.
If any night is full, the nights already taken are released and the request returns `409 NOT_AVAILABLE`. Concurrent requests therefore cannot push any night past capacity, even without transactions. This is covered by a test that fires 8 simultaneous requests at 2 units. Cancellations and expiries release the same nights.

**Pending bookings and expiry policy.** A new booking is `pending` and holds its rooms for `PENDING_BOOKING_TTL_MINUTES` (15 by default). A background sweeper (every minute, and once on start-up) marks unpaid holds as `expired` and returns the rooms. If a payment for an expired booking still arrives:
- if the rooms are free, it is honoured and the booking is confirmed;
- otherwise the payment is **refunded in full** automatically and the guest is told why.

**Duplicate submissions.** The checkout sends an idempotency key per stay selection; repeating it returns the original booking instead of creating a second one.

**Payment flow**
1. `POST /payments/create-order` creates (or reuses) a gateway order for the booking total.
2. The guest pays in Razorpay Checkout (or the mock gateway in development).
3. `POST /payments/verify` checks the HMAC-SHA256 signature on the server. Only then are the payment `captured` and the booking `confirmed`/`paid`.
4. `POST /payments/webhook` (Razorpay) confirms independently, which covers a closed browser tab.

Confirmation is idempotent: the client callback, retries and webhooks can all arrive and the booking is confirmed exactly once. Failed and cancelled checkouts are recorded and can be retried until the hold expires. No card data ever reaches the server.

**Cancellation policy**
- Unpaid bookings: free.
- Paid, at least `FREE_CANCELLATION_HOURS` (48) before check-in time: full refund.
- Paid, later than that: one night (including its share of taxes and fees) is retained and the rest refunded.
- Guests cannot cancel online after check-in time. Hotel (admin) cancellations are always fully refunded.

Refunds go through the gateway's refund API. If that fails, the booking is flagged `refund_pending` for staff follow-up.

**Booking statuses:** `pending → confirmed → checked_in → checked_out`, plus `cancelled`, `expired` and `no_show`. Admin transitions are restricted to real-world moves and each one is written to the audit log.

---

## API reference

All endpoints are under `/api`. Responses use one envelope:

```json
{ "success": true, "data": { }, "message": "optional", "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
{ "success": false, "error": { "message": "Human readable", "code": "MACHINE_CODE", "details": [{ "field": "email", "message": "…" }] } }
```

**CSRF.** State-changing requests (POST/PATCH/DELETE) must send an `X-CSRF-Token` header. Get it from `GET /api/csrf-token`, which also sets a matching HttpOnly cookie. The web client handles this automatically; the Postman collection does too.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/health` | public | API and database status |
| GET | `/csrf-token` | public | CSRF token |
| POST | `/auth/register` | public | Register (name, email, phone, password) and sign in |
| POST | `/auth/login` | public | Sign in (rate limited) |
| POST | `/auth/logout` | public | Clear the session cookie |
| GET | `/auth/me` | user | Current user (401 if not signed in) |
| GET | `/auth/session` | public | Current user or `null` (used by the SPA at start-up) |
| PATCH | `/auth/me` | user | Update name / phone |
| POST | `/auth/change-password` | user | Change password (revokes other sessions) |
| POST | `/auth/forgot-password` | public | Email a reset link (rate limited, same response for unknown emails) |
| POST | `/auth/reset-password` | public | Reset with token (rate limited, single use) |
| GET | `/rooms` | public | List/search rooms; with dates includes availability and quotes |
| GET | `/rooms/meta` | public | Categories, amenities, price range, policies |
| GET | `/rooms/availability` | public | Availability and quote for all rooms or one `roomId` |
| GET | `/rooms/:id` | public | Room details (active rooms only) |
| POST | `/rooms` | admin | Create room |
| PATCH | `/rooms/:id` | admin | Update room |
| DELETE | `/rooms/:id` | admin | Deactivate (`?permanent=true` deletes if never booked) |
| POST | `/rooms/:id/images` | admin | Upload images (multipart `images`) |
| DELETE | `/rooms/:id/images/:imageId` | admin | Remove an image |
| POST | `/bookings` | user | Create a pending booking |
| GET | `/bookings/my` | user | Own bookings (`status=upcoming|past|cancelled|…`) |
| GET | `/bookings/:id` | owner/admin | Booking details, payments, cancellation preview |
| POST | `/bookings/:id/cancel` | owner/admin | Cancel per policy |
| GET | `/payments/config` | public | Active payment provider |
| POST | `/payments/create-order` | owner | Create or reuse a gateway order |
| POST | `/payments/verify` | owner | Verify signature and confirm the booking |
| POST | `/payments/failure` | owner | Record a failed or cancelled checkout |
| POST | `/payments/mock/checkout` | owner, **dev only** | Simulated gateway result |
| POST | `/payments/webhook` | Razorpay (HMAC) | Gateway events |
| GET | `/admin/dashboard` | admin | KPIs, trends, forecast |
| GET | `/admin/reports` | admin | `type=revenue|bookings|occupancy|cancellations`, `from`, `to`, `format=csv` |
| GET | `/admin/bookings` | admin | Search and filter all bookings |
| GET | `/admin/bookings/:id` | admin | Booking with payments and audit trail |
| PATCH | `/admin/bookings/:id/status` | admin | `checked_in`, `checked_out`, `no_show`, `cancelled` |
| GET | `/admin/users` | admin | Search users |
| GET | `/admin/users/:id` | admin | User with booking history |
| PATCH | `/admin/users/:id/status` | admin | Activate / deactivate |
| GET | `/admin/rooms` | admin | All rooms including inactive |
| GET | `/admin/rooms/:id` | admin | Room (including inactive) |
| GET | `/admin/rooms/:id/bookings` | admin | Room booking history |
| GET | `/admin/audit-logs` | admin | Audit log |
| GET / PATCH | `/admin/messages`, `/admin/messages/:id` | admin | Contact enquiries |
| POST | `/contact` | public | Send an enquiry (rate limited) |

Import **`docs/HotelPro.postman_collection.json`** into Postman for ready-made requests. Its pre-request script fetches the CSRF token, and requests chain `roomId`, `bookingId` and `orderId` automatically.

---

## Testing

```bash
cd server && npm test     # 79 API tests
cd client && npm test     # 19 UI tests
```

The **API tests** use Node's built-in test runner, Supertest and `mongodb-memory-server`, so no local database is needed. The first run downloads a MongoDB binary. They cover:
- registration, duplicate email, password hashing, login, logout, sessions, CSRF, NoSQL injection, password reset, rate limiting
- room CRUD with validation, admin authorisation, price snapshots, the inventory guard, upload type checks
- availability calculation, invalid dates, capacity, server-side pricing, overlapping and **concurrent** booking prevention, idempotency, expiry
- cancellation policy, refunds, ownership checks
- payment orders, signature verification, duplicate callbacks, failed checkouts, late payments, webhooks
- dashboard and report access, CSV export, user deactivation, audited status transitions, error handling, CORS and security headers

The **UI tests** (Vitest + React Testing Library) cover route guards, the login form, the guest selector rules, price summary, room card availability, pagination, the confirm dialog and helpers.

---

## Payment gateway setup (Razorpay)

1. Create a Razorpay account and switch to **Test Mode**.
2. *Settings → API Keys* → generate a key pair, then set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `server/.env`.
3. *Settings → Webhooks* → add `https://<your-api>/api/payments/webhook` with the events `payment.captured`, `order.paid`, `payment.failed` and `refund.processed`. Choose a secret and set it as `RAZORPAY_WEBHOOK_SECRET`.
4. Restart the API. `GET /api/payments/config` should report `"provider": "razorpay"`, and checkout now opens Razorpay. Use Razorpay's test cards/UPI IDs.

**Mock gateway (development only).** When Razorpay keys are absent and `NODE_ENV` is not `production`, payments use a simulated gateway. The UI labels it prominently ("Development mode: mock payments — no real money is charged") and lets you simulate success or failure. Its results are HMAC-signed and pass through the same `/payments/verify` code as real payments. It is never available in production, and set `ENABLE_MOCK_PAYMENTS=false` to turn it off in development too.

---

## Deployment (Vercel + Render)

### Backend on Render
1. Push the repo to GitHub.
2. In Render choose **New → Blueprint** and select the repo; `render.yaml` defines the `hotelpro-api` service (root `server/`, health check `/api/health`). Or create a Web Service manually with root directory `server`, build `npm ci --omit=dev`, start `npm start`.
3. Set the environment variables: `MONGO_URI` (Atlas), `CLIENT_URL` (your Vercel URL, e.g. `https://hotelpro.vercel.app`), `SERVER_PUBLIC_URL` (the Render URL), `JWT_SECRET` (auto-generated by the blueprint), plus the optional Razorpay, Cloudinary and SMTP values. `NODE_ENV=production` and `TRUST_PROXY=1` are set by the blueprint.
4. Once deployed, open a **Shell** on the service and run `SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… npm run seed` (or set them as env vars first).
5. Use Cloudinary in production: Render's disk is ephemeral, so local uploads would be lost on redeploy.

### Frontend on Vercel
1. **Add New → Project**, import the repo and set **Root Directory** to `client` (framework preset: Vite).
2. Add the environment variable `VITE_API_URL=https://<your-render-service>.onrender.com/api`.
3. Deploy. `client/vercel.json` rewrites all routes to `index.html` so deep links work.

**Cross-site cookies.** Because the site and API are on different domains, production cookies are `Secure; SameSite=None`. CSRF protection uses a token header that only allowed origins can read. Make sure `CLIENT_URL` exactly matches the Vercel origin (no trailing slash). Some browsers block third-party cookies entirely; for the most robust setup, serve the API from a subdomain of your site (e.g. `api.hotelpro.com` with the site on `hotelpro.com`) and set `COOKIE_SAMESITE=lax`.

---

## Security notes

- Passwords are hashed with bcrypt (12 rounds); hashes, token versions and reset tokens are never returned by the API.
- Sessions are HS256 JWTs in HttpOnly cookies. A per-user `tokenVersion` revokes every session on password change or reset, and deactivated users are rejected on their next request.
- Roles come only from the database. Admin APIs check `role === 'admin'` on every request, and non-owners get `404` for other users' bookings.
- Double-submit CSRF tokens; CORS allow-list; Helmet headers; `x-powered-by` disabled.
- Zod validation on every input, plus stripping of `$` and dotted keys (NoSQL injection) and escaped regex search.
- Rate limits: login (10 per 15 min), registration, password reset (5 per 15 min), contact, payments, and a global API limit.
- Uploads: JPEG/PNG/WebP only, 5 MB each, checked by magic bytes as well as MIME type, with random filenames.
- Reset tokens are random 256-bit values stored as SHA-256 hashes with a TTL index and are single use.
- Stack traces are hidden in production; the server refuses to start in production with a missing or weak `JWT_SECRET`.
- Admin actions (rooms, bookings, users, messages) are written to the audit log without secrets.
- CSV exports neutralise spreadsheet formula injection.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Could not connect to MongoDB` on start-up | Make sure MongoDB is running (`brew services list`, `docker ps`) and `MONGO_URI` is correct. For Atlas, allow your IP and URL-encode special characters in the password. |
| `Port 8001 is already in use` / Vite says port 5173 in use | Stop the other process (`lsof -i :8001`, then `kill <pid>`) or change `PORT` (and `VITE_API_URL`). |
| Frontend shows "Cannot reach the server" | Is the API running? Does `VITE_API_URL` include `/api`? Restart Vite after editing `.env`. |
| CORS errors in the browser console | `CLIENT_URL` must match the browser origin exactly (scheme, host, port, no trailing slash). |
| "Invalid or missing CSRF token" | Refresh the page. In API tools, call `GET /api/csrf-token` first and send the value as `X-CSRF-Token` with cookies enabled. |
| Logged out immediately in production | Cookies need HTTPS (`COOKIE_SECURE=true`) and `SameSite=None` across domains. Check the browser isn't blocking third-party cookies (see Deployment). Behind a proxy, set `TRUST_PROXY=1`. |
| Forgot the admin password | Set `SEED_ADMIN_PASSWORD` in `server/.env` and run `npm run seed` again. |
| Password reset email never arrives | Without SMTP the link is printed in the API console. With SMTP, check the credentials and spam folder. |
| "Online payments are not configured" | In production you must set Razorpay keys; the mock gateway is disabled there. |
| A booking stays "Awaiting payment" | It will expire after the hold period and release its rooms; the guest can pay from *My bookings* until then. |
| `mongodb-memory-server` download fails in tests | Ensure internet access on first run, or set `MONGOMS_SYSTEM_BINARY=$(which mongod)` to use a local `mongod`. |
| Images uploaded on Render disappear | Configure Cloudinary; Render's filesystem is ephemeral. |

---

## Known limitations

- Inventory is managed per **room type** (N identical units), not per physical room number. Assigning a specific room happens at check-in.
- Room-type inventory changes cannot drop below units already booked on future nights. Early check-out keeps the remaining nights held.
- Refunds that the gateway does not process instantly are marked `refund_pending` until the `refund.processed` webhook arrives. There is no admin button to retry a failed refund; it must be completed in the Razorpay dashboard.
- Single currency and a single hotel property.
- Testimonials, hotel facilities and contact details on the marketing pages are site content in the code (`client/src/pages/Home.jsx`, `client/src/utils/constants.js`); rooms, prices, availability and all booking and admin data come from the database.
