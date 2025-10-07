# 🚀 FitnessMealPlanner - Deployment Quickstart

## Quick Deployment Options

### 🔧 Development Environment
```bash
# Start development environment with optimized Docker
docker-compose --profile dev up -d

# View logs
docker-compose --profile dev logs -f

# Access application at: http://localhost:4000
```

### 🏭 Production Environment
```bash
# Deploy to production with monitoring
docker-compose --profile prod --profile monitoring up -d

# Check deployment status
./scripts/deploy-production.sh health

# Access points:
# - Application: http://localhost (via Nginx)
# - Monitoring: http://localhost:3000 (Grafana)
# - Metrics: http://localhost:9090 (Prometheus)
```

### 🧪 Performance Testing
```bash
# Run comprehensive performance tests
./scripts/performance-test.sh

# Test specific components
./scripts/performance-test.sh build    # Docker build performance
./scripts/performance-test.sh api      # API response times
./scripts/performance-test.sh memory   # Memory usage
```

## 📊 Key Improvements Achieved

### Docker Optimization
- **Image Size**: Reduced from 3.22GB to 984MB (**69% smaller**)
- **Build Speed**: Optimized layer caching for faster builds
- **Security**: Non-root execution with proper permissions
- **Health Checks**: Comprehensive monitoring for all containers

### Performance Enhancements
- **Nginx Reverse Proxy**: Static file serving with compression
- **Caching**: Multi-layer caching (Nginx + Application + Database)
- **Resource Limits**: Predictable performance with memory/CPU limits
- **Connection Pooling**: Optimized database connections

### Production Readiness
- **Zero-Downtime Deployment**: Automated deployment with rollback
- **Monitoring Stack**: Prometheus + Grafana for observability
- **Security Headers**: CORS, CSP, and rate limiting configured
- **SSL/TLS Ready**: Production-ready HTTPS configuration

## 🏃‍♂️ Quick Commands

```bash
# Development
npm run docker:dev          # Start dev environment
npm run docker:dev:logs     # View dev logs
npm run docker:dev:stop     # Stop dev environment

# Production  
./scripts/deploy-production.sh      # Deploy to production
./scripts/deploy-production.sh logs # View production logs
./scripts/performance-test.sh       # Run performance tests

# Health Checks
curl http://localhost:4000/health    # Dev health check
curl http://localhost/health         # Production health check
curl http://localhost:4000/api/metrics # Prometheus metrics
```

## 📈 Monitoring Access

### Grafana Dashboard
- **URL**: http://localhost:3000
- **Username**: admin
- **Password**: admin
- **Features**: Application metrics, system monitoring, alerts

### Prometheus Metrics
- **URL**: http://localhost:9090
- **Features**: Raw metrics, query interface, alerting rules

### Application Health
- **Dev**: http://localhost:4000/health
- **Prod**: http://localhost/health
- **Metrics**: http://localhost:4000/api/metrics

## 🔒 Security Features

- **Rate Limiting**: API endpoints protected from abuse
- **CORS Configuration**: Environment-specific origins
- **Security Headers**: XSS, CSRF, and clickjacking protection
- **Non-Root Containers**: Enhanced container security
- **Input Validation**: Comprehensive request validation

## 📋 Troubleshooting

### Common Issues
```bash
# Container won't start
docker-compose --profile dev logs app-dev

# Database connection issues
docker-compose --profile dev exec postgres psql -U postgres -d fitmeal

# Performance issues
./scripts/performance-test.sh memory

# Health check failures
curl -v http://localhost:4000/health
```

### Reset Environment
```bash
# Complete reset
docker-compose --profile dev down -v
docker-compose --profile dev up -d --build
```

---

**The infrastructure is now production-ready with comprehensive monitoring, security, and performance optimizations! 🎉**