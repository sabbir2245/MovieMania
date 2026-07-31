# 🎬 MovieMania

MovieMania is a full-stack movie SaaS application built with the **PERN stack (PostgreSQL, Express, React, Node.js)**. Users can explore trending and top-rated movies, search and filter by genre, year, and rating, view rich details, watch trailers, leave reviews, and manage watchlists. The platform also ships an **AI chatbot**, a **premium membership** with real payments, **transactional emails**, and **media uploads**.

---

## ✨ Features

- 🔥 See trending and top-rated movies
- 🧭 Search & filter by genre, rating, year, and cast
- 📝 Rate and review movies
- 🔐 User authentication (sign up, log in, roles)
- 📋 Watchlist creation and management
- 🏆 Movie awards and nominations
- 🎥 YouTube trailer embedding on detail pages
- 🤖 **AI Chatbot** — rule-based assistant that answers questions about any movie (ratings, budgets, box office, release dates, runtime, comparisons, and "which movies are better rated than X")
- 🗝️ **Premium membership** with a real **Stripe** checkout (test mode) or bKash sandbox
- 🖼️ **Poster uploads** to Supabase Storage (editor role)
- 📧 **Transactional emails** via Resend (e.g. welcome email on sign-up)
- 🔔 Real-time notifications via Socket.IO

---

## 🧩 Integrations / Services

| Service | What it's used for |
|---------|--------------------|
| **Supabase Postgres** | Relational database (movies, users, reviews, watchlists) |
| **Supabase Storage** | Storing uploaded movie poster images |
| **Resend** | Transactional emails (welcome email on sign-up) |
| **Stripe** | Premium one-time payments (real gateway, test mode) |
| **bKash** | Optional payment gateway (sandbox / mock mode) |
| **YouTube** | Embedding movie trailer videos in the UI |
| **Socket.IO** | Real-time notifications |

---

## ⚙️ Tech Stack

| Layer        | Technology |
|--------------|------------|
| **Frontend** | React 19, React Router, Tailwind CSS, Swiper, Socket.IO-client |
| **Backend**  | Node.js, Express.js, JWT auth |
| **Database** | PostgreSQL (via Supabase) |
| **Storage**  | Supabase Storage (posters) |
| **Payments** | Stripe (primary), bKash (optional) |
| **Email**    | Resend |
| **Realtime** | Socket.IO |

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/sabbir2245/MovieMania.git
cd MovieMania

npm install
cd front
npm install
cd ..
npm start
```

> The launcher starts the backend on `:3000` and the frontend on `:5001`.

### 2. Environment Variables

Copy the required secrets into `.env` (root) and `front/.env`. Key variables:

- `PORT`, `NODE_ENV`, `FRONTEND_URL`, `BASE_URL`
- `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` (Postgres)
- `JWT_SECRET`
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_USD`
- `B_KASH_APP_KEY`, `B_KASH_APP_SECRET`, `B_KASH_MOCK`
- `SOCKET_CORS_ORIGIN`

> ⚠️ `.env` files are git-ignored. Never commit real secrets.

### 3. Run Tests

```bash
npm test
```

---

## 📺 Demo Video

https://drive.google.com/file/d/1Rk48rD0Z7rgrxw6IDjN8zS92inveuLul/view?usp=sharing

---

## 🖼️ Screenshots

![](screenshots/Screenshot%202025-07-25%20192331.png)
![](screenshots/Screenshot%202025-07-25%20192343.png)
![](screenshots/Screenshot%202025-07-25%20192526.png)
![](screenshots/Screenshot%202025-07-25%20192550.png)
![](screenshots/Screenshot%202025-07-25%20192600.png)
![](screenshots/Screenshot%202025-07-25%20192620.png)
![](screenshots/Screenshot%202025-07-25%20192648.png)
![](screenshots/Screenshot%202025-07-25%20192704.png)
![](screenshots/Screenshot%202025-07-25%20192720.png)
![](screenshots/Screenshot%202025-07-25%20192730.png)
![](screenshots/Screenshot%202025-07-25%20192739.png)
![](screenshots/Screenshot%202025-07-25%20192744.png)
![](screenshots/Screenshot%202025-07-31%20220420.png)
![](screenshots/Screenshot%202025-07-31%20220437.png)

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.
