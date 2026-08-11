# Real-Time Ticket Reservation Engine

A real-time ticket reservation system built with **React, TypeScript, Node.js, Express, MySQL, Sequelize, Socket.IO, and Tailwind CSS**.

The application allows users to:

* View available seats
* Select multiple seats
* Temporarily hold seats for 60 seconds
* Confirm reservations
* Simulate asynchronous payment processing
* Handle payment success and failure
* Prevent concurrent users from reserving the same seat
* Handle duplicate confirmation requests using idempotency keys
* Receive real-time seat updates through Socket.IO
* Recover the latest server state after reconnection
* Apply server-side pricing and discounts

> **Note:** The AI-powered seat recommendation feature from the original assessment requirements has not been implemented in the current version.

---

# 1. Tech Stack

## Frontend

* React
* TypeScript
* Tailwind CSS
* Socket.IO Client
* Vite

## Backend

* Node.js
* TypeScript
* Express.js
* Sequelize ORM
* Socket.IO

## Database

* MySQL

---

# 2. Project Structure

```text
ticket-reservation/
│
├── README.md
│
├── backend/
│   │
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts
│   │   │
│   │   ├── controllers/
│   │   │   ├── reservation.controller.ts
│   │   │   └── seat.controller.ts
│   │   │
│   │   ├── models/
│   │   │   ├── Seat.ts
│   │   │   ├── Reservation.ts
│   │   │   ├── ReservationSeat.ts
│   │   │   ├── Payment.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── routes/
│   │   │   ├── reservation.routes.ts
│   │   │   └── seat.routes.ts
│   │   │
│   │   ├── services/
│   │   │   ├── reservation.service.ts
│   │   │   ├── payment.service.ts
│   │   │   ├── expiry.service.ts
│   │   │   └── socket.service.ts
│   │   │
│   │   ├── utils/
│   │   │   └── pricing.ts
│   │   │
│   │   └── server.ts
│   │
│   └── package.json
│
├── frontend/
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── SeatMap.tsx
│   │   │   ├── SeatCard.tsx
│   │   │   └── HoldCountdown.tsx
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── socket.ts
│   │   │
│   │   ├── types/
│   │   │   └── seat.ts
│   │   │
│   │   └── App.tsx
│   │
│   └── package.json
│
└── ...
```

---

# 3. Initial Event Data

The application contains five seats:

| Seat |  Price |
| ---- | -----: |
| A1   |   ₹500 |
| A2   |   ₹500 |
| A3   |   ₹500 |
| A4   | ₹1,000 |
| A5   | ₹1,000 |

## Seat Lifecycle

Normal reservation flow:

```text
AVAILABLE → HELD → BOOKED
```

When a hold expires:

```text
HELD → EXPIRED → AVAILABLE
```

When payment fails:

```text
HELD → PAYMENT_FAILED → AVAILABLE
```

The database remains the source of truth for the current seat state.

---

# 4. Prerequisites

Make sure the following are installed:

* Node.js 18+
* npm
* MySQL 8+
* MySQL Workbench (optional)

---

# 5. Database Setup

Create the MySQL database:

```sql
CREATE DATABASE ticket_reservation;
```

Configure the backend `.env` file:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=ticket_reservation
DB_USER=root
DB_PASSWORD=Nupur@123
```

The backend uses Sequelize to connect to MySQL.

---

# 6. Backend Setup

Open a terminal inside the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Start the backend development server:

```bash
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

API base URL:

```text
http://localhost:5000/api
```

---

# 7. Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the React development server:

```bash
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

---

# 8. API Endpoints

## Get Seats

```http
GET /api/seats
```

Returns the current seat state from the database.

---

## Hold Seats

```http
POST /api/reservations/hold
```

Example request:

```json
{
  "seatIds": [1, 2, 3],
  "clientId": "browser-1"
}
```

Example response:

```json
{
  "reservationId": 1,
  "status": "HOLDING",
  "seatIds": [1, 2, 3],
  "subtotal": 1500,
  "discount": 150,
  "total": 1350,
  "expiresAt": "2026-08-12T10:00:00.000Z"
}
```

The hold is valid for 60 seconds.

---

## Confirm Reservation

```http
POST /api/reservations/:id/confirm
```

The request uses an idempotency key:

```http
Idempotency-Key: unique-request-id
```

Example:

```http
POST /api/reservations/1/confirm
Idempotency-Key: test-key-123
```

The initial response is:

```json
{
  "duplicate": false,
  "reservationId": 1,
  "paymentId": 1,
  "status": "PAYMENT_PROCESSING",
  "total": 1350
}
```

Payment processing then happens asynchronously.

---

## Get Reservation

```http
GET /api/reservations/:id
```

Returns the latest reservation state from the backend.

Example:

```json
{
  "reservationId": 1,
  "status": "CONFIRMED",
  "subtotal": 1500,
  "discount": 150,
  "total": 1350,
  "expiresAt": null
}
```

---

# 9. Server-Side Pricing

The backend calculates the reservation price.

A **10% discount** is applied when a user selects 3 or more seats.

Example:

```text
A1 = ₹500
A2 = ₹500
A3 = ₹500

Subtotal = ₹1,500

Discount = 10% = ₹150

Final Total = ₹1,350
```

The frontend does not control the final price.

The backend calculates the price from the actual seat prices stored in the database.

Therefore, a client cannot manipulate the final amount by sending an incorrect total.

For example, even if a client attempts to send:

```json
{
  "seatIds": [1, 2, 3],
  "total": 1
}
```

the backend calculates:

```text
₹1,500 - ₹150 = ₹1,350
```

and uses the server-calculated amount.

---

# 10. Concurrency Handling

Concurrency is handled using **database transactions and row-level locks**.

When a user attempts to hold seats, the backend starts a Sequelize transaction.

The selected seat rows are locked using:

```ts
lock: transaction.LOCK.UPDATE
```

The seat IDs are also sorted before locking:

```ts
uniqueSeatIds.sort((a, b) => a - b);
```

This provides a consistent locking order for concurrent requests.

## Example

Two users attempt to reserve the same seats at approximately the same time:

```text
User A → A1, A2
User B → A1, A2
```

The database allows only one transaction to successfully acquire the required row locks and change the seats to `HELD`.

For example:

```text
User A
   ↓
Database transaction
   ↓
Locks A1, A2
   ↓
A1, A2 → HELD
   ↓
SUCCESS
```

The second request waits for the transaction and then sees that the seats are no longer available:

```text
User B
   ↓
A1, A2 are no longer AVAILABLE
   ↓
Request fails
```

Therefore, two users cannot successfully hold the same seat.

---

# 11. Server-Authoritative Expiry

The frontend countdown is only used for display.

The frontend does **not** determine whether a reservation has expired.

The backend stores the expiration time:

```text
expiresAt
```

The server runs an expiry worker periodically.

The worker checks reservations that are:

```text
HOLDING
```

and whose:

```text
expiresAt <= current server time
```

When a reservation expires:

```text
Reservation:
HOLDING → EXPIRED
```

and its seats are released:

```text
HELD → AVAILABLE
```

The seat state is updated inside a database transaction.

This means:

* Changing the browser clock does not bypass expiry.
* Freezing the browser does not extend the reservation.
* Closing the browser does not keep seats held.
* The server remains authoritative.

---

# 12. Expiry vs Confirmation Race

A reservation can potentially reach its expiration time while payment is processing.

The payment service handles this race using database transactions and row-level locks.

Before booking seats, the payment process:

1. Locks the reservation.
2. Checks the reservation status.
3. Locks the associated seats.
4. Checks the server-side expiration time.
5. Only books the seats if the hold is still valid.

If the reservation has already expired:

```text
Reservation → EXPIRED
Seats → AVAILABLE
Payment → FAILED
```

The seats are not booked.

If the reservation is still valid:

```text
Reservation → CONFIRMED
Seats → BOOKED
Payment → SUCCESS
```

Because these operations are performed inside a transaction, the system avoids an inconsistent state where the same seat could logically be both `BOOKED` and `AVAILABLE`.

---

# 13. Simulated Asynchronous Payment

No real payment provider is integrated.

When the user confirms a reservation:

```text
HOLDING
   ↓
PAYMENT_PROCESSING
```

The backend creates a payment record and starts a simulated payment process.

The payment completes randomly after approximately **2–5 seconds**.

## Payment Success

```text
PAYMENT_PROCESSING
        ↓
      SUCCESS
        ↓
Reservation → CONFIRMED
Seats → BOOKED
```

## Payment Failure

```text
PAYMENT_PROCESSING
        ↓
      FAILED
        ↓
Reservation → PAYMENT_FAILED
Seats → AVAILABLE
```

The payment process runs asynchronously, so the initial confirmation request does not wait for the simulated payment to finish.

---

# 14. Duplicate Confirmation Requests

The confirmation API supports an `Idempotency-Key`.

Example:

```http
Idempotency-Key: test-key-123
```

This is useful when the same request is received multiple times because of:

* Double-clicking the confirm button
* Network retries
* Client retries
* Duplicate HTTP requests

The backend can identify requests using the idempotency key and prevent duplicate processing.

Payment state also provides an additional safety check.

If a payment has already reached:

```text
SUCCESS
```

or:

```text
FAILED
```

the payment service does not process it again.

This prevents duplicate payment processing and duplicate booking operations.

---

# 15. Real-Time Seat Updates

Socket.IO is used to synchronize seat state between browser sessions.

The backend emits:

```text
seats:updated
```

when seat state changes.

For example:

```text
Browser A
    ↓
Holds A1
    ↓
Database
    ↓
A1 → HELD
    ↓
Socket.IO
    ↓
seats:updated
    ↓
Browser B
    ↓
Fetches latest seats
    ↓
A1 displays as HELD
```

The same mechanism is used when seats become:

```text
HELD → BOOKED
```

or:

```text
HELD → AVAILABLE
```

This allows multiple browser windows to see changes without manually refreshing the page.

---

# 16. Reservation Status Updates

The backend emits:

```text
reservation:updated
```

when the reservation state changes.

The event contains the reservation ID.

Example:

```json
{
  "reservationId": 12
}
```

The frontend then requests the latest reservation from:

```http
GET /api/reservations/12
```

This allows the frontend to obtain the authoritative status from the backend.

For example:

```text
PAYMENT_PROCESSING
        ↓
Payment completes
        ↓
Backend updates database
        ↓
reservation:updated
        ↓
Frontend requests reservation
        ↓
CONFIRMED
```

The frontend then updates its UI accordingly.

---

# 17. Reconnection Handling

Socket.IO automatically attempts to reconnect when the connection is interrupted.

However, the frontend does not assume that its previous state is still correct after reconnecting.

When the socket reconnects:

```text
Socket disconnected
        ↓
Seat changes occur on server
        ↓
Socket reconnects
        ↓
Frontend requests latest seats
        ↓
Frontend receives current server state
```

The application uses a fresh API request after reconnection instead of attempting to reconstruct every event that may have occurred while disconnected.

This ensures that the frontend eventually matches the current authoritative state stored by the server.

---

# 18. Frontend State vs Server State

The application follows an important principle:

> **The backend and database are authoritative.**

The frontend is responsible for:

* Displaying seats
* Displaying the countdown
* Allowing the user to select seats
* Sending hold requests
* Sending confirmation requests
* Displaying payment status
* Listening for real-time updates

The frontend is **not trusted** for:

* Seat availability
* Reservation expiry
* Final pricing
* Payment completion
* Booking state

All important business rules are validated by the backend.

---

# 19. Real-Time Events

The application currently uses the following Socket.IO events.

## `seats:updated`

Emitted when one or more seats change state.

Example:

```json
{
  "seatIds": [1, 2, 3]
}
```

The frontend responds by fetching the latest seat data.

---

## `reservation:updated`

Emitted when a reservation changes state.

Example:

```json
{
  "reservationId": 12
}
```

The frontend then fetches the latest reservation state.

---

# 20. Testing Scenarios

## Test 1 — Normal Hold

1. Open the application.
2. Select A1, A2 and A3.
3. Click **Hold Seats**.
4. Verify that the seats become `HELD`.
5. Verify the 60-second countdown.

Expected:

```text
A1 → HELD
A2 → HELD
A3 → HELD
```

---

## Test 2 — Concurrent Reservation

Open the application in two browser windows.

Both users attempt to hold the same seat.

Expected:

```text
Browser 1 → SUCCESS
Browser 2 → FAILED
```

Only one browser should successfully hold the seat.

---

## Test 3 — Hold Expiry

1. Hold one or more seats.
2. Wait for the 60-second hold to expire.
3. The backend expiry worker detects the expired reservation.
4. The seats are released.

Expected:

```text
Reservation:
HOLDING → EXPIRED

Seats:
HELD → AVAILABLE
```

The other browser should receive the updated seat state through Socket.IO.

---

## Test 4 — Payment Success

1. Hold seats.
2. Click **Confirm Reservation**.
3. The frontend displays:

```text
Payment Processing...
```

4. Wait for the simulated payment to complete.
5. The backend updates the reservation to `CONFIRMED`.
6. The seats become `BOOKED`.

Expected:

```text
Reservation:
PAYMENT_PROCESSING → CONFIRMED

Seats:
HELD → BOOKED
```

---

## Test 5 — Payment Failure

1. Hold seats.
2. Click **Confirm Reservation**.
3. Wait for the simulated payment.

Expected:

```text
Reservation:
PAYMENT_PROCESSING → PAYMENT_FAILED

Seats:
HELD → AVAILABLE
```

---

## Test 6 — Duplicate Confirmation

Send the same confirmation request multiple times using the same:

```http
Idempotency-Key
```

Expected:

```text
Only one confirmation/payment operation is processed.
```

---

## Test 7 — Real-Time Updates

Open two browser windows.

### Browser 1

Hold a seat.

### Browser 2

The seat should change to:

```text
HELD
```

without refreshing.

When payment succeeds:

```text
HELD → BOOKED
```

should also be reflected in the other browser.

---

## Test 8 — Reconnection

1. Open two browser windows.
2. Disconnect one browser from the network.
3. Perform seat changes from the other browser.
4. Reconnect the disconnected browser.
5. Verify that the frontend fetches the latest server state.

Expected:

```text
Disconnected Browser
        ↓
Reconnect
        ↓
Fetch current seats
        ↓
UI matches server
```

---

# 21. Architecture Overview

The application follows a layered architecture:

```text
                    React Frontend
                          │
             ┌────────────┴────────────┐
             │                         │
          REST API                 Socket.IO
             │                         │
             └────────────┬────────────┘
                          │
                          ▼
                  Express Backend
                          │
                          ▼
                    Service Layer
                          │
             ┌────────────┼────────────┐
             │            │            │
       Reservation      Payment      Expiry
         Service        Service       Worker
             │            │            │
             └────────────┼────────────┘
                          │
                          ▼
                      Sequelize
                          │
                          ▼
                         MySQL
```

---

# 22. Backend Responsibilities

The backend is responsible for all business-critical operations.

### Reservation Service

Handles:

* Seat availability validation
* Concurrent seat holding
* Reservation creation
* Server-side pricing
* 60-second expiration time

### Payment Service

Handles:

* Simulated asynchronous payment
* Payment success/failure
* Payment vs expiry race
* Seat booking
* Payment state consistency

### Expiry Service

Handles:

* Detecting expired reservations
* Releasing expired seats
* Updating reservation status
* Notifying connected clients

### Socket Service

Handles:

* Real-time seat updates
* Real-time reservation updates

---

# 23. Database Responsibilities

MySQL stores persistent application state.

Main entities include:

```text
Seat
Reservation
ReservationSeat
Payment
```

Relationships:

```text
Reservation
     │
     ├── ReservationSeat
     │       │
     │       └── Seat
     │
     └── Payment
```

Database transactions are used when multiple related records need to change atomically.

---

# 24. Key Design Decisions

## Database Transactions

Transactions are used to ensure that related database operations succeed or fail together.

For example, confirming a reservation involves updating:

* Payment
* Reservation
* Seats

These operations are performed inside a transaction.

---

## Row-Level Locking

Seat rows are locked during reservation operations.

This prevents two concurrent requests from successfully reserving the same seat.

---

## Server-Side Expiry

The server determines whether a reservation has expired.

The frontend countdown is only a visual representation.

---

## Server-Side Pricing

The backend calculates:

```text
Subtotal
Discount
Final Total
```

using prices stored in the database.

The client cannot control the final reservation amount.

---

## Idempotency

Confirmation requests use an idempotency key.

Payment records also protect against processing an already completed payment.

---

## Socket.IO

Socket.IO provides real-time notifications when seats or reservations change.

---

## Reconnection Recovery

After reconnecting, the frontend requests fresh data from the backend.

This prevents stale client-side state from becoming the source of truth.

---

# 25. Important System Invariant

The most important rule in the application is:

> **The database/server is the single source of truth for seat and reservation state.**

The frontend may display a temporary state, but every important operation is validated by the backend.

For example:

```text
Frontend says:
"A1 is available"

        ↓

Backend checks database

        ↓

If A1 is actually HELD:

Request is rejected
```

This protects the system from stale frontend state and concurrent users.

---

# 26. Final State Flow

```text
                    AVAILABLE
                         │
                       HOLD
                         │
                         ▼
                       HELD
                    /    │    \
                   /     │     \
             Expiry   Confirm   Payment
                │        │
                │        ▼
                │   PAYMENT_PROCESSING
                │       /      \
                │      /        \
                │ SUCCESS       FAILED
                │    │             │
                │    ▼             ▼
                │  BOOKED       AVAILABLE
                │
                ▼
             EXPIRED
                │
                ▼
            AVAILABLE
```

The system ensures that every state transition is validated by the backend and persisted consistently in MySQL.

---

# 27. Assessment Scope

The current implementation focuses on the core engineering requirements:

* Concurrent seat reservation
* Database consistency
* Server-authoritative expiry
* Expiry vs confirmation race handling
* Simulated asynchronous payment
* Duplicate confirmation handling
* Real-time Socket.IO updates
* Reconnection recovery
* Server-side pricing
* React + TypeScript frontend
* Node.js + TypeScript backend
* MySQL persistence

The AI-powered recommendation feature specified in the original assessment has **not been implemented in the current version**.
