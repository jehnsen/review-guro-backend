# ReviewGuro Backend API

Interactive Civil Service Exam Reviewer API - A SaaS application where users take quizzes, get instant feedback, and use AI to explain answers.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis (Cache-Aside pattern)
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Zod
- **Security**: Helmet, CORS, bcrypt

## Project Structure

```
src/
├── config/           # Configuration files
│   ├── env.ts        # Environment variables with Zod validation
│   └── database.ts   # Prisma client singleton
├── controllers/      # HTTP request handlers
│   ├── auth.controller.ts
│   ├── question.controller.ts
│   └── practice.controller.ts
├── middlewares/      # Express middlewares
│   ├── auth.middleware.ts    # JWT authentication
│   └── error.middleware.ts   # Global error handler
├── repositories/     # Data access layer
│   ├── user.repository.ts
│   ├── question.repository.ts
│   └── progress.repository.ts
├── routes/           # API route definitions
│   ├── index.ts
│   ├── auth.routes.ts
│   ├── question.routes.ts
│   └── practice.routes.ts
├── services/         # Business logic layer
│   ├── auth.service.ts
│   ├── question.service.ts   # Implements Redis caching
│   ├── practice.service.ts
│   ├── cache.service.ts      # Redis client wrapper
│   └── ai.service.ts         # AI explanation generator (mock)
├── types/            # TypeScript type definitions
│   └── index.ts
├── utils/            # Utility functions
│   ├── errors.ts     # Custom error classes
│   ├── response.ts   # Standardized API responses
│   └── hash.ts       # Hashing utilities
├── app.ts            # Express app configuration
└── server.ts         # Server entry point
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Copy environment file and configure:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Generate Prisma client:
```bash
npm run prisma:generate
```

4. Run database migrations:
```bash
npm run prisma:migrate
```

5. Seed the database with sample questions:
```bash
npm run seed
```

6. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Create new account | No |
| POST | `/login` | Authenticate user | No |
| GET | `/me` | Get current user | Yes |

### Questions (`/api/questions`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get paginated questions | Yes |

**Query Parameters:**
- `category`: VERBAL_ABILITY, NUMERICAL_ABILITY, ANALYTICAL_ABILITY, GENERAL_INFORMATION, CLERICAL_ABILITY
- `difficulty`: EASY, MEDIUM, HARD
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

### Practice (`/api/practice`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/submit` | Submit an answer | Yes |
| POST | `/explain` | Get AI explanation | Yes |
| GET | `/stats` | Get user statistics | Yes |

## Redis Caching Strategy

The application implements the **Cache-Aside (Lazy Loading)** pattern:

```
┌─────────────┐     1. Check Cache     ┌─────────────┐
│   Client    │ ─────────────────────> │    Redis    │
│   Request   │                        │    Cache    │
└─────────────┘                        └─────────────┘
       │                                      │
       │                                      │
       │ 3. Cache Miss                  2. Cache Hit?
       │    Query DB                          │
       ▼                                      ▼
┌─────────────┐                        ┌─────────────┐
│  PostgreSQL │                        │   Return    │
│   Database  │                        │   Cached    │
└─────────────┘                        │   Data      │
       │                               └─────────────┘
       │ 4. Store in Cache
       │    (TTL: 1 hour)
       ▼
┌─────────────┐
│   Return    │
│   Fresh     │
│   Data      │
└─────────────┘
```

**Cache Keys:**
- Questions list: `questions:{filter_hash}`
- Single question: `question:{id}`
- AI explanations: `explanation:{question_id}`

## API Response Format

All endpoints return consistent JSON responses:

```typescript
// Success Response
{
  "success": true,
  "message": "Success message",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "cached": true,
    "cacheKey": "questions:abc123"
  }
}

// Error Response
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production/test) | No |
| `PORT` | Server port | No (default: 3000) |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | No |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Yes |
| `JWT_EXPIRES_IN` | JWT expiration (e.g., "7d") | No |
| `OPENAI_API_KEY` | OpenAI API key for AI features | No |
| `CACHE_TTL_QUESTIONS` | Questions cache TTL in seconds | No |
| `CACHE_TTL_EXPLANATIONS` | Explanations cache TTL in seconds | No |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run seed` | Seed database with sample data |
| `npm run typecheck` | Run TypeScript type checking |

## License

ISC
