# Task Management System

A full-stack **Task Management System** built with **ASP.NET 9** (backend, N-layer architecture) and **ReactJS** (frontend, N-tier architecture).

---

## Project Structure

```
src/
├── backend/
│   ├── AppSolution.sln
│   ├── AppSolution.API/          # Presentation Layer - ASP.NET Web API
│   ├── AppSolution.Application/  # Application/Business Logic Layer
│   ├── AppSolution.Domain/       # Domain Layer - Entities, Interfaces
│   └── AppSolution.Infrastructure/ # Infrastructure/Data Access Layer
└── frontend/
    └── app-client/               # ReactJS (Vite + TypeScript + TailwindCSS)
```

---

## Backend Setup

### Prerequisites
- .NET 9 SDK
- SQL Server (or SQL Server LocalDB for development)

### Getting Started

```bash
cd src/backend

# Restore packages
dotnet restore AppSolution.sln

# Apply EF Core migrations
dotnet ef migrations add InitialCreate --project AppSolution.Infrastructure --startup-project AppSolution.API
dotnet ef database update --project AppSolution.Infrastructure --startup-project AppSolution.API

# Run the API
dotnet run --project AppSolution.API
```

The API will be available at:
- `https://localhost:7000`
- Swagger UI: `https://localhost:7000/swagger`

### Configuration (`appsettings.json`)
- **ConnectionStrings:DefaultConnection** — SQL Server connection string
- **JwtSettings:SecretKey** — JWT secret (change before production!)
- **Cors:AllowedOrigins** — Allowed frontend origins

---

## Frontend Setup

### Prerequisites
- Node.js 18+
- pnpm / npm / yarn

### Getting Started

```bash
cd src/frontend/app-client

# Install dependencies
pnpm install   # or npm install

# Start dev server
pnpm dev       # or npm run dev
```

The app runs at `http://localhost:3000`.

---

## Architecture Overview

### Backend (N-Layer)

| Layer | Project | Responsibility |
|-------|---------|----------------|
| Domain | `AppSolution.Domain` | Entities, interfaces, enums |
| Application | `AppSolution.Application` | Business logic, DTOs, services, validators, mapping |
| Infrastructure | `AppSolution.Infrastructure` | EF Core, repositories, JWT, unit of work |
| Presentation | `AppSolution.API` | Controllers, middleware, DI, Swagger |

### Frontend (N-Tier)

| Tier | Location | Responsibility |
|------|----------|----------------|
| Presentation | `pages/`, `components/` | UI pages and components |
| Business | `hooks/` | React Query hooks, state logic |
| Data Access | `services/` | API calls via Axios |
| State | `store/` | Zustand auth store |
| Types | `types/` | TypeScript interfaces/enums |

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh-token` | Refresh JWT |
| POST | `/api/auth/logout` | Logout (requires auth) |

### Tasks (all require JWT auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | Get all tasks |
| GET | `/api/tasks/{id}` | Get task by ID |
| GET | `/api/tasks/user/{userId}` | Get tasks by user |
| GET | `/api/tasks/overdue` | Get overdue tasks |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/{id}` | Update task |
| DELETE | `/api/tasks/{id}` | Delete task |

---

## Tech Stack

**Backend**: ASP.NET 9, Entity Framework Core 9, SQL Server, FluentValidation, AutoMapper, Serilog, BCrypt, JWT Bearer

**Frontend**: React 18, TypeScript, Vite, TailwindCSS, React Query v5, Zustand, React Hook Form, Zod, Axios, React Router v6
