# Life Insurance Recommendation MVP

A full-stack application that provides personalized life insurance recommendations based on user profile data.

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS
- **Backend**: Node.js with Express, TypeScript
- **Database**: PostgreSQL
- **Containerization**: Docker & Docker Compose
- **Deployment**: AWS ECS / Elastic Beanstalk ready

## Features

- ✅ User profile form with validation
- ✅ Rules-based recommendation engine
- ✅ PostgreSQL data persistence
- ✅ Responsive UI design
- ✅ RESTful API
- ✅ Docker containerization
- ✅ Input validation and error handling
- ✅ CORS protection
- ✅ Environment variable configuration

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (for local development without Docker)
- AWS CLI (for deployment)

## Quick Start

### Using Docker (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/yourusername/life-insurance-recommendation.git
cd life-insurance-recommendation
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Start all services:
```bash
docker-compose up --build
```

4. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- PostgreSQL: localhost:5432

### Manual Setup

#### Backend Setup

```bash
cd backend
npm install
npm run build
npm run dev
```

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

#### Database Setup

```sql
CREATE DATABASE life_insurance_db;
```

Then run migrations:
```bash
cd backend
npm run migrate
```

## API Documentation

### POST /api/recommendation

Request body:
```json
{
  "age": 35,
  "income": 75000,
  "dependents": 2,
  "riskTolerance": "medium"
}
```

Response:
```json
{
  "recommendation": {
    "type": "Term Life",
    "coverage": 750000,
    "term": 20,
    "monthlyPremium": 45
  },
  "explanation": "Based on your age and income, we recommend a 20-year term life policy...",
  "factors": {
    "incomeMultiplier": 10,
    "dependentsFactor": 1.5,
    "riskAdjustment": 1.0
  }
}
```

## Deployment

### AWS ECS Deployment

1. Build and push Docker images to ECR:
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [your-ecr-uri]

# Build and push frontend
docker build -t life-insurance-frontend ./frontend
docker tag life-insurance-frontend:latest [your-ecr-uri]/life-insurance-frontend:latest
docker push [your-ecr-uri]/life-insurance-frontend:latest

# Build and push backend
docker build -t life-insurance-backend ./backend
docker tag life-insurance-backend:latest [your-ecr-uri]/life-insurance-backend:latest
docker push [your-ecr-uri]/life-insurance-backend:latest
```

2. Create ECS Task Definitions for frontend and backend services

3. Create an ECS cluster and deploy services

4. Set up Application Load Balancer for routing

### AWS Elastic Beanstalk Deployment (Alternative)

1. Install EB CLI:
```bash
pip install awsebcli
```

2. Initialize Elastic Beanstalk:
```bash
eb init -p docker life-insurance-app
```

3. Create environment and deploy:
```bash
eb create life-insurance-env
eb deploy
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=life_insurance_db
DATABASE_URL=postgresql://postgres:postgres123@db:5432/life_insurance_db

# Backend
NODE_ENV=production
PORT=5000
CORS_ORIGIN=http://localhost:3000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Security Considerations

- Input validation on both frontend and backend
- Parameterized SQL queries to prevent injection
- CORS configuration for API protection
- Environment variables for sensitive data
- Rate limiting ready (can be enabled)
- HTTPS recommended for production

## Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Architecture Decisions

1. **Next.js App Router**: Using the latest Next.js 14 app directory structure for better performance and SEO
2. **TypeScript**: Full type safety across the stack
3. **PostgreSQL**: Reliable relational database for structured data
4. **Docker Compose**: Simplified local development with all services
5. **Rules Engine**: Extensible design pattern for easy ML integration later

## License

MIT License