# Freshseeker

A polished job application tracker built with Next.js, Node.js, Express, and MongoDB.

## Features

- Save job links with title, company, and notes
- Mark jobs as applied or move them back to pending
- Filter by All, Pending, and Applied
- Clean dashboard UI with a bold, modern visual style
- Run with MongoDB persistence or a built-in in-memory fallback for quick demos

## Structure

- `src/` - Next.js frontend
- `backend/` - Express + MongoDB API

## Setup

1. Install dependencies in the `frontend` and `backend` folders.
2. Copy `.env.example` to `.env.local` inside `frontend`.
3. Optionally add `MONGO_URI` to `backend/.env` for persistence.
4. Run the frontend and backend together from `frontend` with the `dev:full` script.

## Scripts

- `npm run dev` - Start the Next.js app from `frontend`
- `npm run build` - Build the Next.js app from `frontend`
- `npm run lint` - Lint the Next.js app from `frontend`
- `npm run dev:full` - Start frontend and backend together from `frontend`
- `npm run dev --prefix ../backend` - Start the API server from `frontend`
