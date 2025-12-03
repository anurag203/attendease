#!/bin/bash

echo "📊 === VIEWING DATABASE VIA API ==="
echo ""

# Get teacher token
TOKEN=$(curl -s -X POST https://attendease-backend-8oqg.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@mnit.ac.in","password":"123456"}' | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

echo "🔑 Logged in as teacher"
echo ""

echo "📚 COURSES:"
curl -s -X GET "https://attendease-backend-8oqg.onrender.com/api/courses" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

echo "🎯 ACTIVE SESSIONS:"
curl -s -X GET "https://attendease-backend-8oqg.onrender.com/api/sessions/active" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

# Get student token
STUDENT_TOKEN=$(curl -s -X POST https://attendease-backend-8oqg.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"2022uec1540@mnit.ac.in","password":"123456"}' | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

echo "🔑 Logged in as student"
echo ""

echo "📚 STUDENT'S COURSES:"
curl -s -X GET "https://attendease-backend-8oqg.onrender.com/api/courses" \
  -H "Authorization: Bearer $STUDENT_TOKEN" | python3 -m json.tool
echo ""

echo "✅ Done!"
