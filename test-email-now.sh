#!/bin/bash

# Login to get token
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"trainer.test@evofitmeals.com","password":"TestTrainer123!"}')

echo "Login response:"
echo "$LOGIN_RESPONSE"

# Extract token using grep and cut
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "ERROR: Failed to get token"
  exit 1
fi

echo ""
echo "Token obtained: ${TOKEN:0:50}..."
echo ""

# Test email to your address
TIMESTAMP=$(date +%s)
echo "Sending invitation to test.customer.$TIMESTAMP@example.com..."
INVITE_RESPONSE=$(curl -s -X POST http://localhost:4000/api/invitations/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"customerEmail\":\"test.customer.$TIMESTAMP@example.com\"}")

echo "Invitation response:"
echo "$INVITE_RESPONSE"

# Check if email was sent
if echo "$INVITE_RESPONSE" | grep -q '"emailSent":true'; then
  echo ""
  echo "✅ SUCCESS! Email was sent successfully!"
elif echo "$INVITE_RESPONSE" | grep -q '"emailSent":false'; then
  echo ""
  echo "❌ FAILED! Email was not sent."
fi
