#!/bin/bash

echo "🔧 Running Render database migration..."
echo ""

RESPONSE=$(curl -s -X POST https://attendease-backend-8oqg.onrender.com/api/admin/migrate-proximity-token)

echo "Response:"
echo "$RESPONSE" | jq '.'

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')

if [ "$SUCCESS" = "true" ]; then
  echo ""
  echo "✅ Migration completed successfully!"
  echo "You can now start sessions in the app!"
else
  echo ""
  echo "❌ Migration failed. Check the error above."
fi
