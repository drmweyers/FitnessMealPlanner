#!/bin/bash

echo "Setting up local S3 storage with MinIO..."

# Start MinIO
docker-compose -f docker-compose.minio.yml up -d

echo "MinIO started!"
echo ""
echo "Access MinIO Console at: http://localhost:9001"
echo "Login with:"
echo "  Username: minioadmin"
echo "  Password: minioadmin123"
echo ""
echo "Add these to your .env file:"
echo ""
echo "# S3 Configuration (MinIO Local)"
echo "S3_BUCKET_NAME=fitnessmealplanner-recipes"
echo "AWS_REGION=us-east-1"
echo "AWS_ACCESS_KEY_ID=minioadmin"
echo "AWS_SECRET_ACCESS_KEY=minioadmin123"
echo "AWS_ENDPOINT=http://localhost:9000"
echo "AWS_IS_PUBLIC_BUCKET=true"
echo ""
echo "After updating .env, restart your development server:"
echo "docker-compose --profile dev restart"