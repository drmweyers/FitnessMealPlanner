#!/bin/bash

# Test the customer invitation flow

echo "1. Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"trainer.test@evofitmeals.com","password":"TestTrainer123!"}')

echo "Login response: $LOGIN_RESPONSE"

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "ERROR: Failed to get auth token"
  exit 1
fi

echo "Token obtained: ${TOKEN:0:20}..."

echo ""
echo "2. Testing invitation send..."
INVITATION_RESPONSE=$(curl -s -X POST http://localhost:3000/api/customers/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"email":"test@example.com"}')

echo "Invitation response: $INVITATION_RESPONSE"
