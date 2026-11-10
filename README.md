# College Management System (CMS) - Frontend

React + Vite frontend for the College Management System (CMS). The application provides portals and dashboards for Administrators, Teachers, and Students to manage courses, enrollments, attendance, marks, and finance operations.

> **Note**: The legacy backend is being removed and rebuilt using the **MERN stack** (Node.js, Express, MongoDB). During migration, frontend API requests target the new Express backend at `http://localhost:5000/api`.

---

## 🛠️ Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS / Modular CSS
- **State Management & Data Fetching**: TanStack React Query, Zustand, Axios, Fetch API
- **Routing**: React Router DOM (v6)

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or pnpm

### Setup & Run Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

The application runs locally by default at `http://localhost:5173`.

---

## ⚙️ Environment Configuration

Frontend environment variables are configured in `frontend/.env.development`:

```env
# Express backend URL (backend will be built with MERN)
VITE_API_BASE=http://localhost:5000/api
```

---

## 📚 API Route Documentation

A complete catalog of all backend endpoints required by the frontend application is available in [docs/api-routes.md](docs/api-routes.md).
