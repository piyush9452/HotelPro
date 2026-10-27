# HotelPro: Hotel Booking & Management System

HotelPro is a full-stack MERN application for a single hotel. Guests can search live availability, book rooms, pay online and manage their reservations. Staff get a protected admin dashboard for rooms, bookings, guests, reports and an audit log.

- **Frontend:** React 19 + Vite, Tailwind CSS 4, React Router 7, React Hook Form, Axios, Recharts, react-day-picker
- **Backend:** Node.js 20 + Express 4, MongoDB + Mongoose 8, Zod validation, JWT in HttpOnly cookies
- **Payments:** Razorpay (orders, signature verification, webhooks, refunds). A clearly labelled **development-only mock gateway** is used when no keys are configured.
- **Hosting:** website on Vercel, API on Render, database on MongoDB Atlas, images on Cloudinary

### Live deployment

| Part | URL | Host |
|---|---|---|
| Website | https://hotel-pro-two.vercel.app | Vercel (`client/`) |
| API | https://hotelpro-xla6.onrender.com/api | Render (`server/`) |
| Health check | https://hotelpro-xla6.onrender.com/api/health | should report `"database":"connected"` |

Admin dashboard: https://hotel-pro-two.vercel.app/admin (sign in with the seeded admin account; credentials are not stored in this repository).

> **Status:** the live site, accounts, bookings, cancellations, admin tools, reports and Cloudinary uploads are working. **Online payment is not enabled yet**: add Razorpay keys on Render (see [Payment gateway setup](#payment-gateway-setup-razorpay)). Until then, guests can create bookings but cannot pay, and unpaid bookings expire after 15 minutes.

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

The frontend and backend are independent apps with their own `package.json`.

```text
HotelPro/
├── client/                              React + Vite frontend (deployed to Vercel)
│   ├── public/favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/                  Button, FormControls, Modal + ConfirmDialog, Pagination, Badge,
│   │   │   │                            Feedback (spinner/skeleton/empty/error), Popover, RouteGuards, PageHero, Logo
│   │   │   ├── layout/                  Navbar (+ mobile menu), Footer, MainLayout, AdminLayout, AuthLayout
│   │   │   ├── rooms/                   RoomCard, RoomGallery (lightbox), RoomFilters, amenityIcons
│   │   │   ├── booking/                 SearchForm, DateRangePicker, GuestSelector, PriceSummary, PaymentPanel,
│   │   │   │                            BookingSummaryCard, CancelBookingDialog, Steps
│   │   │   └── dashboard/               KpiCard, Charts, DataTable, SearchInput, AdminPageHeader
│   │   ├── pages/
│   │   │   ├── Home, Rooms, RoomDetails, Booking, BookingDetails, MyBookings, Profile
│   │   │   ├── Login, Register, ForgotPassword, ResetPassword
│   │   │   ├── Contact, About, Privacy, Terms, LegalPage, NotFound
│   │   │   └── admin/                   Dashboard, AdminRooms, RoomEditor, AdminBookings, AdminBookingDetail,
│   │   │                                AdminUsers, AdminUserDetail, Reports, Messages, AuditLogs
│   │   ├── context/AuthContext.jsx      session state, login/register/logout
│   │   ├── hooks/                       useAsync, usePayment, useStayParams, useQueryFilters,
│   │   │                                useCountdown, useDebounce, useDocumentTitle
│   │   ├── services/                    api.js (Axios: cookies, CSRF, session expiry) + auth/room/booking/
│   │   │                                payment/admin/contact services
│   │   ├── utils/                       dates, format, constants, validation
│   │   ├── __tests__/                   Vitest + React Testing Library
│   │   ├── test/setup.js
│   │   ├── App.jsx                      routes (admin area lazy-loaded)
│   │   ├── main.jsx, index.css          entry point, Tailwind theme
│   ├── index.html, vite.config.js
│   ├── vercel.json                      SPA rewrite so deep links work
│   ├── .env.example
│   └── package.json
├── server/                              Express API (deployed to Render)
│   ├── config/                          env.js (loads + validates settings), db.js (MongoDB connection)
│   ├── controllers/                     auth, room, booking, payment, admin, contact
│   ├── middleware/                      auth + roles, csrf, validate (Zod), sanitize, rateLimit, upload, error
│   ├── models/                          User, Room, RoomInventory, Booking, Payment,
│   │                                    PasswordResetToken, AuditLog, ContactMessage
│   ├── routes/                          auth, room, booking, payment, admin, contact routes
│   ├── services/                        bookingService, inventoryService, stayService, paymentService,
│   │                                    paymentGateway (Razorpay + dev mock), emailService, uploadService, auditService
│   ├── validators/                      Zod schemas: common, auth, room, booking, misc
│   ├── utils/                           dates (hotel timezone), pricing, csv, http helpers, ApiError, logger
│   ├── scripts/seed.js                  room catalogue + admin account
│   ├── tests/                           Node test runner + Supertest + in-memory MongoDB
│   ├── uploads/                         local image storage (only when Cloudinary is not configured)
│   ├── app.js                           Express app (middleware + routes)
│   ├── index.js                         start-up, expiry sweeper, graceful shutdown
│   ├── .env.example
│   └── package.json
├── docs/HotelPro.postman_collection.json
├── render.yaml                          optional Render Blueprint for the API
├── .gitignore                           keeps .env files, node_modules, dist and uploads out of Git
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
cd client && npm test     # 20 UI tests
```

The **API tests** use Node's built-in test runner, Supertest and `mongodb-memory-server`, so no local database is needed. The first run downloads a MongoDB binary. They cover:
- registration, duplicate email, password hashing, login, logout, sessions, CSRF, NoSQL injection, password reset, rate limiting
- room CRUD with validation, admin authorisation, price snapshots, the inventory guard, upload type checks
- availability calculation, invalid dates, capacity, server-side pricing, overlapping and **concurrent** booking prevention, idempotency, expiry
- cancellation policy, refunds, ownership checks
- payment orders, signature verification, duplicate callbacks, failed checkouts, late payments, webhooks
- dashboard and report access, CSV export, user deactivation, audited status transitions, error handling, CORS and security headers

The **UI tests** (Vitest + React Testing Library) cover route guards, the login form, contact-form prefill for signed-in users, the guest selector rules, price summary, room card availability, pagination, the confirm dialog and helpers.

---

## Payment gateway setup (Razorpay)

1. Create a Razorpay account and switch to **Test Mode**.
2. *Settings → API Keys* → generate a key pair, then set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `server/.env` (local) and in Render → Environment (live).
3. *Settings → Webhooks* → add `https://<your-api>/api/payments/webhook` (live: `https://hotelpro-xla6.onrender.com/api/payments/webhook`) with the events `payment.captured`, `order.paid`, `payment.failed` and `refund.processed`. Choose a secret and set it as `RAZORPAY_WEBHOOK_SECRET`.
4. Restart the API. `GET /api/payments/config` should report `"provider": "razorpay"`, and checkout now opens Razorpay. Use Razorpay's test cards/UPI IDs.

**Mock gateway (development only).** When Razorpay keys are absent and `NODE_ENV` is not `production`, payments use a simulated gateway. The UI labels it prominently ("Development mode: mock payments — no real money is charged") and lets you simulate success or failure. Its results are HMAC-signed and pass through the same `/payments/verify` code as real payments. It is never available in production, and set `ENABLE_MOCK_PAYMENTS=false` to turn it off in development too.

---

## Deployment (Vercel + Render)

The live site uses this setup. Deploy the **API first**, then the **website**, then connect them.

### 1. MongoDB Atlas
1. Create a cluster and a database user.
2. **Network Access → Add IP Address → `0.0.0.0/0`.** Render's outgoing IP addresses change, so without this the API cannot connect.
3. Use a connection string that **includes the database name**, otherwise data goes into a database called `test`:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/hotelpro?retryWrites=true&w=majority`

### 2. API on Render (Web Service)

| Setting | Value |
|---|---|
| Repository / Branch | this repo / `main` |
| Language | Node |
| **Root Directory** | `server` |
| **Build Command** | `npm ci --omit=dev` |
| **Start Command** | `npm start` |
| Health Check Path (Advanced) | `/api/health` |
| Instance type | Free works for testing (sleeps after 15 min idle; the first request then takes ~50 s). Use a paid instance for a real site. |

Environment variables on Render:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | Atlas connection string (with `/hotelpro`) |
| `JWT_SECRET` | use Render's **Generate** button (the API refuses to start without a strong secret) |
| `JWT_EXPIRES_IN` | `1d` |
| `COOKIE_NAME` | `hotelpro_token` |
| `TRUST_PROXY` | `1` |
| `CLIENT_URL` | the exact Vercel URL, e.g. `https://hotel-pro-two.vercel.app` (**no trailing slash**; comma-separate extra domains) |
| `SERVER_PUBLIC_URL` | the Render URL, e.g. `https://hotelpro-xla6.onrender.com` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from Cloudinary → Settings → API Keys (needed because Render's disk is wiped on every deploy) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | required for online payment in production |
| `SMTP_*`, `EMAIL_FROM` | optional, for confirmation and password-reset emails |

Alternatively, **New → Blueprint** reads `render.yaml`, which pre-fills the settings above.

**Seeding.** Run `npm run seed` once against the production database, either from a Render **Shell** or locally with `MONGO_URI` pointing at Atlas. In production, `SEED_ADMIN_EMAIL` and a strong `SEED_ADMIN_PASSWORD` (12+ characters with upper and lower case and a digit) are required. The live database was seeded this way.

### 3. Website on Vercel

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| **Root Directory** | `client` |
| Build Command / Output | defaults (`npm run build` / `dist`) |
| **Environment variable** | `VITE_API_URL` = `https://<your-render-service>.onrender.com/api` (**must end with `/api`**) |

`VITE_API_URL` is written into the site **at build time**. After changing it, open **Deployments → ⋯ → Redeploy**; saving the variable alone has no effect. `client/vercel.json` rewrites every path to `index.html`, so links such as `/rooms/…` and `/admin` work when opened directly.

### 4. Connect and verify
1. On Render, set `CLIENT_URL` to the final Vercel URL and save (Render redeploys).
2. Check `https://<render>/api/health` shows `"database":"connected"` and `"env":"production"`.
3. Open the website. Rooms should load, and signing in should survive a page reload. That second check confirms the cross-site cookie works.
4. Sign in as admin at `/admin`, upload a room photo and confirm its URL starts with `https://res.cloudinary.com/`.
5. Check `https://<render>/api/payments/config` shows `"enabled": true, "provider": "razorpay"` once Razorpay keys are added.

### Deployment verification (live site)

All of the following were checked end to end in a real browser against https://hotel-pro-two.vercel.app:

| Area | Result |
|---|---|
| Home (featured rooms, categories), hero search → rooms with live availability | ✅ |
| Rooms filters, sorting, price limits; room details, gallery, price breakdown | ✅ |
| Booking while signed out → login → back to checkout | ✅ |
| Registration with validation; session survives reload (cross-site cookie) | ✅ |
| Pending booking with server price and 15-minute hold; My Bookings; cancellation | ✅ |
| Profile edit, logout, protected-route redirect, forgot password, wrong-password message | ✅ |
| About, Privacy, Terms, custom 404; mobile layout, mobile menu, filter drawer | ✅ |
| Admin: dashboard, booking search and detail, rooms and editor, Cloudinary upload and delete, user deactivation, all four reports + CSV, audit log, mobile admin menu | ✅ |
| Contact form for signed-in users | ✅ after the prefill fix in this release (fields were empty after a full page load) |
| Online payment | ⚠️ disabled until Razorpay keys are set on Render |

**Cross-site cookies.** The website and API are on different domains, so production cookies are `Secure; SameSite=None`, and CSRF protection uses a token header that only allowed origins can read. Browsers that block all third-party cookies (some Safari and privacy settings) will not keep users signed in. For the most robust setup, serve the API from a subdomain of the site's own domain (e.g. `api.yourhotel.com` with the site on `yourhotel.com`) and set `COOKIE_SAMESITE=lax`.

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
| CORS errors in the browser console ("No 'Access-Control-Allow-Origin' header") | `CLIENT_URL` on the API must match the browser origin exactly (scheme, host, port, no trailing slash). Render redeploys after you save. |
| Live site calls `…onrender.com/rooms` (no `/api`) and gets 404 | `VITE_API_URL` on Vercel is missing `/api`. Fix it, then **Redeploy**: the value is fixed at build time. |
| Data appears in a database called `test` | Add the database name to `MONGO_URI` (`…mongodb.net/hotelpro?…`). |
| Render deploy fails with "Could not connect to MongoDB" | Allow `0.0.0.0/0` in Atlas Network Access and check `MONGO_URI`. |
| First request to the live API takes ~50 s | Render's free instance sleeps when idle; use a paid instance or accept the cold start. |
| Admin password from `.env` doesn't work | Values are trimmed and an unquoted `#` starts a comment. Wrap passwords containing `#` in quotes, re-run the seed, and sign in with the value as the app reads it. |
| `contentscript.js` / `MaxListenersExceededWarning` in the console | Comes from a browser extension (e.g. a crypto wallet), not HotelPro; ignore it. |
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
