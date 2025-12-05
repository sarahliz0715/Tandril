// Script to register mandatory GDPR webhooks with Shopify
// Run this with: node register-gdpr-webhooks.js

const SHOPIFY_API_KEY = 'YOUR_CLIENT_ID_HERE'; // Replace with your Tandril Beta app Client ID
const SHOPIFY_API_SECRET = 'YOUR_CLIENT_SECRET_HERE'; // Replace with your Tandril Beta app Client Secret
const SHOP_DOMAIN = 'omamahills.myshopify.com'; // Your test store
const ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN_HERE'; // Access token from your connected store

const WEBHOOK_BASE_URL = 'https://biksocozipayckfuzzul.supabase.co/functions/v1';

const webhooks = [
  {
    topic: 'customers/data_request',
    address: `${WEBHOOK_BASE_URL}/shopify-webhook-gdpr-data-request`,
    format: 'json'
  },
  {
    topic: 'customers/redact',
    address: `${WEBHOOK_BASE_URL}/shopify-webhook-gdpr-redact`,
    format: 'json'
  },
  {
    topic: 'shop/redact',
    address: `${WEBHOOK_BASE_URL}/shopify-webhook-shop-redact`,
    format: 'json'
  }
];

async function registerWebhook(webhook) {
  const url = `https://${SHOP_DOMAIN}/admin/api/2025-10/webhooks.json`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ACCESS_TOKEN
    },
    body: JSON.stringify({
      webhook: webhook
    })
  });

  const data = await response.json();

  if (response.ok) {
    console.log(`✅ Registered: ${webhook.topic}`);
    console.log(`   URL: ${webhook.address}`);
    console.log(`   ID: ${data.webhook.id}`);
  } else {
    console.error(`❌ Failed to register ${webhook.topic}:`, data);
  }

  return data;
}

async function main() {
  console.log('Registering GDPR compliance webhooks...\n');

  for (const webhook of webhooks) {
    await registerWebhook(webhook);
    console.log('');
  }

  console.log('Done!');
}

main().catch(console.error);
