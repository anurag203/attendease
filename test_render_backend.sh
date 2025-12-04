#!/bin/bash

# Test Render Backend

echo "Testing Render backend..."
echo ""

# Test login
echo "1. Testing login..."
TOKEN=$(curl -s https://attendease-backend-8oqg.onrender.com/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@mnit.ac.in","password":"teacher123"}' \
  | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "Response:"
  curl -s https://attendease-backend-8oqg.onrender.com/api/auth/login \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"teacher@mnit.ac.in","password":"teacher123"}'
  echo ""
  exit 1
fi

echo "✅ Login successful"
echo "Token: ${TOKEN:0:30}..."
echo ""

# Get courses
echo "2. Getting courses..."
COURSE_ID=$(curl -s https://attendease-backend-8oqg.onrender.com/api/courses \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.data[0].id')

echo "Course ID: $COURSE_ID"
echo ""

# Try to start session
echo "3. Testing session start (without teacher_bluetooth_address)..."
RESPONSE=$(curl -s https://attendease-backend-8oqg.onrender.com/api/sessions/start \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"course_id\":$COURSE_ID,\"duration_minutes\":2}")

echo "Response:"
echo "$RESPONSE" | jq '.'

# Check if it has proximity_token
TOKEN_VALUE=$(echo "$RESPONSE" | jq -r '.data.proximity_token')
if [ "$TOKEN_VALUE" != "null" ] && [ -n "$TOKEN_VALUE" ]; then
  echo ""
  echo "✅ Session started successfully!"
  echo "Proximity Token: $TOKEN_VALUE"
else
  echo ""
  echo "❌ Session start failed or no proximity_token"
fi
