# Privacy Law Compliance - Implementation Guide

This document describes the implementation of mandatory Shopify compliance webhooks for GDPR and other privacy laws.

## Overview

All apps listed on the Shopify App Store must implement three mandatory compliance webhooks:

1. **customers/data_request** - Handle customer data access requests
2. **customers/redact** - Handle customer data deletion requests
3. **shop/redact** - Handle shop data deletion after app uninstall

## Implementation

### Edge Functions

Three Supabase Edge Functions have been created to handle these webhooks:

- `supabase/functions/customers-data-request/index.ts`
- `supabase/functions/customers-redact/index.ts`
- `supabase/functions/shop-redact/index.ts`

### Security

All webhooks implement HMAC-SHA256 signature verification:
- Validates the `X-Shopify-Hmac-Sha256` header
- Returns `401 Unauthorized` for invalid signatures
- Uses the `SHOPIFY_API_SECRET` environment variable for verification

### Database Tracking

A `compliance_requests` table tracks all webhook requests for audit purposes:

```sql
- request_type: Type of request (customers/data_request, customers/redact, shop/redact)
- shop_id: Shopify shop ID
- shop_domain: Shop domain
- customer_id: Customer ID (if applicable)
- customer_email: Customer email (if applicable)
- status: pending, in_progress, completed, error
- received_at: When the request was received
- completed_at: When the action was completed
```

## Deployment

### 1. Deploy Edge Functions

```bash
supabase functions deploy customers-data-request
supabase functions deploy customers-redact
supabase functions deploy shop-redact
```

### 2. Run Database Migration

Run the SQL migration in Supabase SQL Editor:
```
supabase/migrations/002_create_compliance_requests.sql
```

### 3. Configure Environment Variables

Ensure these are set in Supabase Edge Functions secrets:
- `SHOPIFY_API_SECRET` - Your Shopify app's client secret
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

### 4. Register Webhooks in Shopify

In your Shopify Partner Dashboard:
1. Go to your app > Configuration > Webhooks
2. Add the three mandatory webhooks with these URLs:
   - `https://YOUR_PROJECT_REF.supabase.co/functions/v1/customers-data-request`
   - `https://YOUR_PROJECT_REF.supabase.co/functions/v1/customers-redact`
   - `https://YOUR_PROJECT_REF.supabase.co/functions/v1/shop-redact`

## Webhook Details

### customers/data_request

**When triggered:** Customer requests to view their data through the store owner

**Payload:**
```json
{
  "shop_id": 954889,
  "shop_domain": "my-store.myshopify.com",
  "orders_requested": [299938, 280263],
  "customer": {
    "id": 191167,
    "email": "john@example.com",
    "phone": "555-625-1199"
  },
  "data_request": {
    "id": 9999
  }
}
```

**Required action:** Provide customer data to the store owner within 30 days

**Current implementation:**
- Logs the request to `compliance_requests` table
- Returns 200 acknowledgment
- TODO: Implement data retrieval and delivery logic

### customers/redact

**When triggered:** Store owner requests customer data deletion

**Payload:**
```json
{
  "shop_id": 954889,
  "shop_domain": "my-store.myshopify.com",
  "customer": {
    "id": 191167,
    "email": "john@example.com",
    "phone": "555-625-1199"
  },
  "orders_to_redact": [299938, 280263]
}
```

**Required action:** Delete or anonymize customer data within 30 days

**Current implementation:**
- Logs the request to `compliance_requests` table
- Returns 200 acknowledgment
- TODO: Implement data deletion logic based on your data schema

**Note:** Sent 10 days after deletion request if customer has no recent orders, otherwise withheld until 6 months after last order.

### shop/redact

**When triggered:** 48 hours after store owner uninstalls the app

**Payload:**
```json
{
  "shop_id": 954889,
  "shop_domain": "my-store.myshopify.com"
}
```

**Required action:** Delete all shop data

**Current implementation:**
- Logs the request to `compliance_requests` table
- Deletes data from these tables:
  - `platforms` - Shop connection and access tokens
  - `ai_commands` - Command history
  - `saved_commands` - Saved command templates
  - `ai_workflows` - Automated workflows
  - `workflow_runs` - Workflow execution history
- Updates compliance request status to 'completed'

## Customization Required

### For customers/data_request:

You need to implement logic to:
1. Query all customer-related data from your database
2. Compile the data in a readable format
3. Send it to the store owner (via email or admin dashboard)
4. Update the compliance request status to 'completed'

Example locations to check:
- Any tables storing customer information
- Order-related data tables
- Analytics or tracking data
- Log files

### For customers/redact:

You need to implement logic to:
1. Identify all customer data in your system
2. Delete or anonymize the data appropriately
3. Handle the orders_to_redact array
4. Consider data retention requirements (don't delete if legally required to keep)
5. Update the compliance request status to 'completed'

**Example deletion code (uncomment and adapt in `customers-redact/index.ts`):**

```typescript
if (payload.customer?.id) {
  await supabaseClient
    .from('ai_commands')
    .delete()
    .eq('customer_id', payload.customer.id);
}
```

## Testing

### Manual Testing with Shopify CLI

You can test webhooks using the Shopify CLI:

```bash
# Test customers/data_request
shopify webhook trigger --topic=customers/data_request \
  --delivery-method=http \
  --address=https://YOUR_PROJECT_REF.supabase.co/functions/v1/customers-data-request

# Test customers/redact
shopify webhook trigger --topic=customers/redact \
  --delivery-method=http \
  --address=https://YOUR_PROJECT_REF.supabase.co/functions/v1/customers-redact

# Test shop/redact
shopify webhook trigger --topic=shop/redact \
  --delivery-method=http \
  --address=https://YOUR_PROJECT_REF.supabase.co/functions/v1/shop-redact
```

### Monitor Logs

View Edge Function logs in Supabase:
1. Go to Edge Functions in your Supabase dashboard
2. Select the function
3. Click "Logs" to see real-time webhook processing

## Compliance Checklist

Before submitting your app to the Shopify App Store:

- [x] Three compliance webhooks are implemented
- [x] HMAC signature verification is working
- [x] Webhooks return 200 status code on success
- [x] Webhooks return 401 for invalid HMAC
- [x] Webhooks handle POST requests with JSON body
- [ ] Data retrieval logic is implemented (customers/data_request)
- [ ] Data deletion logic is implemented (customers/redact)
- [x] Shop data deletion is implemented (shop/redact)
- [ ] Compliance requests are tracked in database
- [ ] 30-day completion timeframe is monitored
- [ ] Webhooks are registered in Shopify Partner Dashboard

## Legal Considerations

⚠️ **Important:** This implementation provides the technical infrastructure for compliance, but you should:

1. Consult with legal counsel about your specific obligations
2. Understand which data you must retain vs. can delete
3. Implement appropriate data retention policies
4. Document your compliance procedures
5. Ensure you can complete requests within 30 days
6. Consider GDPR, CCPA, and other privacy laws

## Support

If you need help with compliance webhooks:
1. Check Supabase Edge Function logs for errors
2. Verify HMAC signature verification is working
3. Ensure all environment variables are set correctly
4. Test webhooks using Shopify CLI before going live
5. Review Shopify's compliance documentation: https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance

## References

- [Shopify Privacy Law Compliance](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance)
- [Shopify Webhooks Guide](https://shopify.dev/docs/apps/build/webhooks)
- [Shopify App Requirements](https://shopify.dev/docs/apps/launch/app-requirements-checklist)
