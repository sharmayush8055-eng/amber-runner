# Amber Runner 🦖

An original MERN-stack endless runner: a dino trapped in amber, dodging obstacles across a day/night
desert as it slowly breaks free. Built as a portfolio-ready full-stack project — custom canvas game
engine on the frontend, JWT-authenticated REST API and MongoDB persistence on the backend.

## Why this is more than a Chrome-dino clone

- **Original mechanics**: built-in double jump, duck-under pterodactyls, rolling boulders, a
  coin-fed shield gauge, and a combo multiplier that rewards chaining coins without getting hit.
- **Day/night cycle**: the sky, obstacles and ground shift palette on a timer, and difficulty ramps
  as you survive longer — no static single-speed loop.
- **Everything hand-drawn on `<canvas>`**: no sprite sheets or external art assets, just procedural
  vector shapes, so the whole game ships in a few KB of code.
- **Real accounts and a live leaderboard**: register, log in, and your best runs are persisted to
  MongoDB and ranked against everyone else who's played.
- **Guest-friendly**: you can play instantly without an account; scores are kept locally until you
  decide to sign up.

## Tech stack

| Layer     | Tech                                                                 |
|-----------|-----------------------------------------------------------------------|
| Frontend  | React 18, Vite, React Router, Tailwind CSS, Axios, HTML5 Canvas       |
| Backend   | Node.js, Express, JWT auth, bcrypt password hashing, express-rate-limit |
| Database  | MongoDB (Mongoose ODM)                                               |

## Project structure

```
dino-game-mern/
├── backend/
│   ├── config/db.js          # Mongo connection
│   ├── models/                # User, Score schemas
│   ├── middleware/            # JWT auth guard, error handler
│   ├── routes/                # /api/auth, /api/scores
│   └── server.js
└── frontend/
    ├── src/
    │   ├── components/Game/DinoGame.jsx   # canvas game engine
    │   ├── components/Auth/               # login / register forms
    │   ├── components/Leaderboard/        # live leaderboard
    │   ├── context/AuthContext.jsx        # JWT session state
    │   └── api/api.js                     # axios client
    └── index.html
```

## Local setup

### Prerequisites
- Node.js 18+
- A MongoDB connection string — either a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
  or a local `mongod` instance.

### 1. Backend

```bash
cd backend
cp .env.example .env
# edit .env: set MONGO_URI and a long random JWT_SECRET
npm install
npm run dev        # starts on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev             # starts on http://localhost:5173
```

Open `http://localhost:5173` — you can play immediately as a guest, or register to save runs to
the leaderboard.

## API reference

| Method | Route                    | Auth | Description                          |
|--------|---------------------------|------|---------------------------------------|
| POST   | `/api/auth/register`      | —    | Create an account, returns JWT        |
| POST   | `/api/auth/login`         | —    | Log in, returns JWT                   |
| GET    | `/api/auth/me`            | ✅    | Current user profile                  |
| POST   | `/api/scores`             | ✅    | Submit a completed run                |
| GET    | `/api/scores/leaderboard` | —    | Top N users by best score             |
| GET    | `/api/scores/me`          | ✅    | Your last 20 runs                     |
| GET    | `/api/health`             | —    | Health check                          |

## Deployment

This app deploys as two independent services plus a managed database — a realistic setup worth
describing on a CV.

### Database — MongoDB Atlas
1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Add a database user and allow network access from anywhere (`0.0.0.0/0`) for simplicity, or
   restrict it to your backend host's IP once deployed.
3. Copy the connection string for `MONGO_URI`.

### Backend — Render (or Railway / Fly.io)
1. Push this repo to GitHub.
2. On [render.com](https://render.com), create a **Web Service** pointing at the `backend/` folder.
   - Build command: `npm install`
   - Start command: `npm start`
3. Add environment variables from `.env.example` (`MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`,
   `CLIENT_URL` — set this to your deployed frontend URL once you have it).
4. Deploy. Note the resulting URL, e.g. `https://amber-runner-api.onrender.com`.

### Frontend — Vercel (or Netlify)
1. On [vercel.com](https://vercel.com), import the repo and set the root directory to `frontend/`.
2. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
3. Add environment variable `VITE_API_URL=https://amber-runner-api.onrender.com/api`.
4. Deploy, then update the backend's `CLIENT_URL` env var to this frontend's URL and redeploy the
   backend so CORS allows it.

### Verifying the deployment
- `GET https://<backend-url>/api/health` should return `{"status":"ok", ...}`.
- Registering a user, playing a run, and checking the leaderboard end-to-end confirms the full
  stack is wired correctly.

## Ideas for extending it further

- WebSocket-based live leaderboard updates instead of polling.
- Daily/weekly leaderboard resets.
- Additional power-ups (magnet, slow-motion) and a shop using accumulated coins.
- Replay storage so a run can be watched back.

## License

MIT — use this freely as a portfolio project or a starting point for your own game.
