# Docker Development Guide

This guide provides detailed instructions for developing the FitnessMealPlanner application using Docker.

## Prerequisites

1. **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
2. **Docker Compose** v2.0 or higher
3. **Git** for version control
4. **Code editor** (VS Code recommended)

## Initial Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd FitnessMealPlanner
```

### 2. Create Environment File
```bash
cp .env.example .env
```
Edit `.env` and update the JWT_SECRET with a secure random string.

### 3. Start Docker
Ensure Docker Desktop is running (Windows/Mac) or Docker daemon is started (Linux).

### 4. Launch Development Environment
```bash
docker-compose --profile dev up -d
```

This command will:
- Pull required Docker images
- Create a PostgreSQL database container
- Build the application container
- Set up the database schema
- Start the development server

## Development Workflow

### Starting Your Day

1. **Check Docker is running:**
   ```bash
   docker ps
   ```

2. **Start the development environment:**
   ```bash
   docker-compose --profile dev up -d
   ```

3. **Check logs to ensure healthy startup:**
   ```bash
   docker logs fitnessmealplanner-dev --tail 20
   ```

4. **Access the application:**
   - Frontend: http://localhost:4000
   - API Health Check: http://localhost:4000/api/health

### During Development

#### File Changes
- **Frontend changes** (React/TypeScript): Automatically hot-reloaded
- **Backend changes** (Node.js/Express): Automatically restarted
- **Database schema changes**: Run migrations (see Database section)

#### Viewing Logs
```bash
# Follow logs in real-time
docker logs fitnessmealplanner-dev -f

# View last 50 lines
docker logs fitnessmealplanner-dev --tail 50

# Search for errors
docker logs fitnessmealplanner-dev 2>&1 | grep -i error
```

#### Accessing Containers
```bash
# Access the app container shell
docker exec -it fitnessmealplanner-dev sh

# Access the PostgreSQL container
docker exec -it fitnessmealplanner-postgres-1 psql -U postgres -d fitmeal
```

### Ending Your Day

```bash
# Stop all containers
docker-compose --profile dev down

# Stop and remove volumes (full cleanup)
docker-compose --profile dev down -v
```

## Database Management

### Running Migrations
```bash
# Inside the container
docker exec -it fitnessmealplanner-dev npm run db:push

# Or from outside
docker exec -it fitnessmealplanner-dev sh -c "npm run db:push"
```

### Database Access
```bash
# Connect to PostgreSQL
docker exec -it fitnessmealplanner-postgres-1 psql -U postgres -d fitmeal

# Common PostgreSQL commands:
\dt              # List tables
\d table_name    # Describe table
\q               # Quit
```

### Backup and Restore
```bash
# Backup
docker exec fitnessmealplanner-postgres-1 pg_dump -U postgres fitmeal > backup.sql

# Restore
docker exec -i fitnessmealplanner-postgres-1 psql -U postgres fitmeal < backup.sql
```

## Common Issues and Solutions

### Issue: Vite Alias Import Errors
**Symptom:** `Failed to resolve import "@shared/schema"`

**Solution:** The vite.config.ts uses proper aliases. If you see this error:
1. Ensure all imports use `@shared/` instead of relative paths
2. Restart the container: `docker-compose --profile dev restart`

### Issue: Port Conflicts
**Symptom:** `bind: address already in use`

**Solution:**
```bash
# Find process using port 4000
# Windows
netstat -ano | findstr :4000
# Linux/Mac
lsof -i :4000

# Kill the process or change the port in docker-compose.yml
```

### Issue: Database Connection Failed
**Symptom:** `ECONNREFUSED` or `connection refused`

**Solution:**
1. Check PostgreSQL container is running: `docker ps | grep postgres`
2. Wait for health check: `docker ps` (should show "healthy")
3. Check logs: `docker logs fitnessmealplanner-postgres-1`

### Issue: npm install Failures
**Symptom:** Package installation errors

**Solution:**
```bash
# Rebuild the container
docker-compose --profile dev down
docker-compose --profile dev up -d --build
```

### Issue: File Permission Errors
**Symptom:** Cannot write to files or create directories

**Solution:**
- On Linux, ensure your user owns the files: `sudo chown -R $USER:$USER .`
- Rebuild containers after fixing permissions

## Performance Tips

1. **Use Docker Desktop's resource limits** to prevent excessive CPU/memory usage
2. **Enable BuildKit** for faster builds:
   ```bash
   export DOCKER_BUILDKIT=1
   docker-compose --profile dev build
   ```
3. **Prune unused Docker resources** periodically:
   ```bash
   docker system prune -a
   ```

## Testing

### Running Tests in Docker
```bash
# Run all tests
docker exec -it fitnessmealplanner-dev npm test

# Run specific test file
docker exec -it fitnessmealplanner-dev npm test -- auth.test.ts

# Run tests in watch mode
docker exec -it fitnessmealplanner-dev npm test -- --watch
```

### Testing PDF Export
1. Login to the application
2. Create or select a meal plan
3. Click "Export PDF" button
4. Check Docker logs for any errors: `docker logs fitnessmealplanner-dev -f`

## Production Build

### Building for Production
```bash
# Build production images
docker-compose --profile prod build

# Run production containers
docker-compose --profile prod up -d
```

### Production Environment
- Port: 5001
- No hot reloading
- Optimized builds
- Production database settings

## Useful Docker Commands

```bash
# List all containers
docker ps -a

# Remove all stopped containers
docker container prune

# View container resource usage
docker stats

# Copy files from container
docker cp fitnessmealplanner-dev:/app/some-file.txt .

# Save container logs
docker logs fitnessmealplanner-dev > dev-logs.txt 2>&1
```

## VS Code Integration

### Recommended Extensions
- Docker (by Microsoft)
- Remote - Containers (by Microsoft)

### Debugging in VS Code
1. Install the Docker extension
2. Right-click on `fitnessmealplanner-dev` container
3. Select "Attach Visual Studio Code"
4. Debug directly inside the container

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)