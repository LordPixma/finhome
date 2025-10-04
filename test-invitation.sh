#!/bin/bash

# Test Member Invitation API
# This tests the actual deployed API endpoint to see if emails are being sent

API_BASE="https://api.finhome360.com"

echo "Testing member invitation..."
echo "=========================="

# First, let's try to get current user info to see if API is working
echo "1. Testing API connectivity..."
curl -X GET "$API_BASE/api/auth/me" \
  -H "Content-Type: application/json" \
  -v 2>&1 | head -20

echo -e "\n\n2. This would be the invitation request (needs auth token):"
echo "POST $API_BASE/api/tenant-members"
echo "Headers: Authorization: Bearer <token>"
echo "Body: {"
echo '  "name": "Test User",'
echo '  "email": "test@example.com",'
echo '  "role": "member"'
echo "}"

echo -e "\n\nTo properly test:"
echo "1. Login to https://app.finhome360.com"
echo "2. Go to Settings -> Family Members"  
echo "3. Add a new member with a real email address"
echo "4. Check the browser Network tab for the API request"
echo "5. Check if the email is received"

echo -e "\n\nAlternatively, check Cloudflare Workers logs:"
echo "cd apps/api && npx wrangler tail --format=pretty"