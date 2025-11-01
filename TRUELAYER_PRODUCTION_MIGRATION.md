# TrueLayer Production Migration Checklist

## Step 1: TrueLayer Production Application Setup
1. Go to: https://console.truelayer.com
2. Create new application or use existing production app
3. Configure redirect URIs:
   - https://api.finhome360.com/api/banking/callback (primary)
   - https://finhome.samuel-1e5.workers.dev/api/banking/callback (temporary backup)
4. Note down credentials:
   - Production Client ID: [FILL_THIS_IN]
   - Production Client Secret: [FILL_THIS_IN]

## Step 2: Update wrangler.toml
Replace sandbox credentials with production:
- TRUELAYER_CLIENT_ID = "YOUR_PRODUCTION_CLIENT_ID"
- TRUELAYER_CLIENT_SECRET = "YOUR_PRODUCTION_CLIENT_SECRET"

## Step 3: Deploy to Production
- Deploy API with updated configuration
- Test banking connection with real bank
- Verify all flows work correctly

## Important Notes:
- ✅ API URLs already updated to production endpoints
- ⚠️  Production requires real bank credentials (no mock accounts)
- 🔒 All data will be real banking data (be careful in testing)
- 📋 Users will see real banks instead of mock banks

## Testing Strategy:
1. Test with your own bank account first
2. Verify connection, transaction import, and disconnection
3. Test with team members' accounts before full release
4. Monitor for any issues in production logs

## Rollback Plan:
If issues occur, can quickly revert to sandbox by:
1. Reverting API URLs back to sandbox
2. Reverting credentials to sandbox
3. Redeploying API