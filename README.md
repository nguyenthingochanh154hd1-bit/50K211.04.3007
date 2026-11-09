# Hệ Thống Quản Lý Công Việc (Task Management System)

Dự án hoàn chỉnh được thiết kế theo:
- **Kiến trúc N-Tier** (3 tầng phân tán vật lý: Frontend ReactJS ↔ Backend ASP.NET 9/10 Web API ↔ Database SQL Server)
- **Kiến trúc N-Layer** (4 tầng logic backend: Domain ↔ Application ↔ Infrastructure ↔ API)

---

## 1. Sơ Đồ Kiến Trúc Hệ Thống

### 1.1. Tổng thể N-Tier Architecture (Physical Deployment)
```
[ Tier 1: Client / Presentation ]
         ReactJS + TypeScript + Vite + Tailwind CSS (Port 3000)
                     │
                     │ HTTP / RESTful API (JSON, JWT Bearer)
                     ▼
[ Tier 2: Application / Business Logic ]
         ASP.NET Core Web API (Port 5000 / 7001)
         ├── API Layer (Controllers, Middlewares, Swagger)
         ├── Application Layer (CQRS/Services, DTOs, FluentValidation)
         ├── Domain Layer (Entities, Business Rules, Interfaces)
         └── Infrastructure Layer (EF Core, Repositories, Unit of Work, JWT)
                     │
                     │ SQL Queries / TCP Port 1433
                     ▼
[ Tier 3: Data Tier ]
         Microsoft SQL Server (LocalDB / Express / Docker)
```

### 1.2. Backend N-Layer Architecture & Dependency Inversion
```
┌────────────────────────────────────────────────────────┐
│               AppSolution.API                          │
│  (Presentation Layer: Controllers, Middlewares)        │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
                ▼                        ▼
┌───────────────────────────┐  ┌─────────────────────────┐
│  AppSolution.Application  │  │ AppSolution.            │
│  (Services, DTOs, Mapping,│  │   Infrastructure        │
│   Validation Rules)       │  │ (EF Core, Unit of Work, │
└───────────────┬───────────┘  │  Repositories, JWT)     │
                │              └────────────┬────────────┘
                │                           │
                ▼                           ▼
┌────────────────────────────────────────────────────────┐
│               AppSolution.Domain                       │
│  (Core/Domain Layer: Entities, Enums, Interfaces)      │
│  *Không phụ thuộc bất kỳ project hay framework nào*    │
└────────────────────────────────────────────────────────┘
```

---

## 2. Cấu Trúc Thư Mục Source Code

```
50K211.04.3007/
├── src/
│   ├── backend/
│   │   ├── AppSolution.sln
│   │   ├── Directory.Build.props
│   │   │
│   │   ├── AppSolution.Domain/                 # [Domain Layer]
│   │   │   ├── Common/
│   │   │   │   └── BaseEntity.cs               # Id (Guid), CreatedAt, UpdatedAt, IsDeleted
│   │   │   ├── Entities/
│   │   │   │   ├── TaskItem.cs                 # Entity TaskItem, TaskItemStatus, TaskPriority
│   │   │   │   └── User.cs                     # Entity User, RefreshToken, Hashes
│   │   │   └── Interfaces/
│   │   │       ├── IRepository.cs              # Generic Repository interface
│   │   │       ├── ITaskRepository.cs          # Task-specific queries
│   │   │       ├── IUserRepository.cs          # User authentication queries
│   │   │       └── IUnitOfWork.cs              # Unit of Work transaction interface
│   │   │
│   │   ├── AppSolution.Application/            # [Application / Business Logic Layer]
│   │   │   ├── Common/
│   │   │   │   ├── Result.cs                   # Standard Result<T> pattern
│   │   │   │   └── PagedResult.cs              # Phân trang (Paging)
│   │   │   ├── DTOs/
│   │   │   │   ├── TaskDto.cs                  # TaskDto, CreateTaskDto, UpdateTaskDto
│   │   │   │   └── UserDto.cs                  # UserDto, RegisterDto, LoginDto, AuthResponseDto
│   │   │   ├── Interfaces/
│   │   │   │   ├── ITaskService.cs
│   │   │   │   ├── IAuthService.cs
│   │   │   │   └── IJwtService.cs
│   │   │   ├── Mapping/
│   │   │   │   ├── TaskMappingProfile.cs       # AutoMapper Profile cho Task
│   │   │   │   └── UserMappingProfile.cs       # AutoMapper Profile cho User
│   │   │   ├── Services/
│   │   │   │   ├── TaskService.cs              # Quản lý nghiệp vụ công việc
│   │   │   │   └── AuthService.cs              # Đăng ký, đăng nhập, cấp refresh token
│   │   │   ├── Validators/
│   │   │   │   ├── CreateTaskValidator.cs      # FluentValidation cho Create Task
│   │   │   │   └── RegisterValidator.cs        # FluentValidation cho Register
│   │   │   └── DependencyInjection.cs          # Đăng ký DI cho Application layer
│   │   │
│   │   ├── AppSolution.Infrastructure/         # [Infrastructure / Data Access Layer]
│   │   │   ├── Data/
│   │   │   │   ├── AppDbContext.cs             # EF Core DbContext + Soft Delete Global Query Filter
│   │   │   │   └── Configurations/             # Fluent API Entity Configurations
│   │   │   │       ├── TaskConfiguration.cs
│   │   │   │       └── UserConfiguration.cs
│   │   │   ├── Repositories/
│   │   │   │   ├── Repository.cs               # Base Repository implementation
│   │   │   │   ├── TaskRepository.cs
│   │   │   │   └── UserRepository.cs
│   │   │   ├── UnitOfWork/
│   │   │   │   └── UnitOfWork.cs               # Transaction handling
│   │   │   ├── Services/
│   │   │   │   └── JwtService.cs               # JWT Access & Refresh Token generation
│   │   │   └── DependencyInjection.cs          # Đăng ký DbContext, JWT Bearer, Repositories
│   │   │
│   │   └── AppSolution.API/                    # [Presentation Layer - Web API]
│   │       ├── Controllers/
│   │       │   ├── BaseController.cs           # Common response handling
│   │       │   ├── AuthController.cs           # /api/auth (register, login, refresh)
│   │       │   └── TasksController.cs          # /api/tasks (CRUD, filter, overdue)
│   │       ├── Middleware/
│   │       │   ├── ExceptionMiddleware.cs      # Bắt lỗi toàn cục (Global Exception Handler)
│   │       │   └── ValidationMiddleware.cs     # Bắt lỗi FluentValidation trả về 400
│   │       ├── Properties/
│   │       │   └── launchSettings.json         # Cấu hình cổng chạy (5000 / 7001)
│   │       ├── Program.cs                      # Cấu hình Pipeline, Swagger, CORS, Serilog
│   │       └── appsettings.json                # Database ConnectionString & JWT settings
│   │
│   └── frontend/
│       └── app-client/                         # [Presentation Tier - ReactJS Client]
│           ├── index.html
│           ├── vite.config.ts                  # Proxy /api tới http://localhost:5000
│           ├── tailwind.config.js
│           ├── package.json
│           └── src/
│               ├── types/                      # TypeScript definitions
│               │   └── index.ts
│               ├── services/                   # Axios API services
│               │   ├── apiClient.ts            # Axios instance + JWT interceptor tự động refresh
│               │   ├── authService.ts
│               │   └── taskService.ts
│               ├── store/                      # Zustand state store
│               │   └── authStore.ts
│               ├── hooks/                      # TanStack React Query hooks
│               │   ├── useAuth.ts
│               │   └── useTasks.ts
│               ├── components/
│               │   ├── auth/ProtectedRoute.tsx # Bảo vệ các route yêu cầu đăng nhập
│               │   ├── layout/                 # Navbar, MainLayout
│               │   └── tasks/                  # TaskCard, TaskForm
│               ├── pages/
│               │   ├── LoginPage.tsx
│               │   ├── RegisterPage.tsx
│               │   └── TasksPage.tsx
│               ├── App.tsx
│               └── main.tsx
```

---

## 3. Hướng Dẫn Chạy Dự Án

### 3.1. Chạy Backend (ASP.NET)
1. Di chuyển vào thư mục backend:
   ```bash
   cd src/backend
   ```
2. Cập nhật cấu hình Database trong `AppSolution.API/appsettings.json` (mặc định dùng SQL Server LocalDB):
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=AppSolutionDb;Trusted_Connection=True;MultipleActiveResultSets=true"
   }
   ```
3. Tạo và cập nhật migration cơ sở dữ liệu:
   ```bash
   dotnet ef migrations add InitialCreate --project AppSolution.Infrastructure --startup-project AppSolution.API
   dotnet ef database update --project AppSolution.Infrastructure --startup-project AppSolution.API
   ```
4. Khởi chạy Web API:
   ```bash
   dotnet run --project AppSolution.API
   ```
   - Swagger UI: `http://localhost:5000/swagger` hoặc `https://localhost:7001/swagger`

### 3.2. Chạy Frontend (ReactJS)
1. Di chuyển vào thư mục frontend:
   ```bash
   cd src/frontend/app-client
   ```
2. Cài đặt thư viện:
   ```bash
   npm install
   ```
3. Chạy môi trường Development:
   ```bash
   npm run dev
   ```
   - Truy cập giao diện tại: `http://localhost:3000`

---

## 4. Công Nghệ Đã Sử Dụng
- **Backend**: ASP.NET Core 9 (.NET 9 SDK), Entity Framework Core 9 (SQL Server), JWT Bearer Authentication, FluentValidation, AutoMapper 13, Serilog, BCrypt.Net.
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack React Query v5, Zustand, Axios, React Router DOM v6, React Hook Form, Zod.
