# Tandril — Shopify Reviewer Testing Guide

Use these step-by-step instructions to test the core Tandril experience with a connected Shopify development store.

---

## Login

1. Go to **https://tandril-mvp.vercel.app/Login**
2. Sign in with the provided test credentials

---

## Part 1 — Connect Your Shopify Store

1. Go to **Platforms** in the left sidebar
2. Click **Connect Shopify**
3. Enter your development store name (e.g. `my-store` — without `.myshopify.com`)
4. You'll be taken to Shopify briefly to confirm the connection using your existing Shopify login
5. You'll be brought back to Tandril automatically — the store will show as **Connected**

> **Note:** No separate Shopify login prompt is shown if you're already logged into Shopify in your browser. This is expected behavior — Shopify confirms your existing session.

---

## Part 2 — Talk to Orion (AI Advisor)

Orion is Tandril's AI business assistant. With your store connected, Orion has live access to your inventory, orders, and product data.

**Navigate to:** AI Advisor (left sidebar)

### Suggested conversation flow:

**Message 1:**
> Show me my low stock products

Orion will pull live inventory data from your connected Shopify store and display a table of products with their current stock levels.

---

**Message 2** *(follow-up from Orion's response)*:
> Yes — alert me when any product drops below 5 units

Orion will confirm it can set that up and walk you through creating the alert workflow. This tests Orion's ability to take action based on conversation context.

---

**Message 3:**
> What's my best opportunity to grow sales this week?

Orion will analyze your store data and provide strategic recommendations tailored to your current inventory and sales patterns.

---

## Part 3 — Run an AI Command

Commands let you take bulk actions on your store using plain English.

**Navigate to:** Commands (left sidebar)

### Try these commands:

**Inventory query:**
> Find all products with less than 10 units in stock

1. Orion interprets the request and shows you a plan
2. Click **Execute** to run it
3. Results display in a table showing product name, variant, and current stock

**SEO update:**
> Update the SEO title for my top product

1. Orion identifies the product and proposes the update
2. Review the planned change
3. Click **Execute** to apply it to your Shopify store

---

## Part 4 — Set Up a Workflow

Workflows run automatically on a schedule or trigger.

**Navigate to:** Workflows (left sidebar)

1. Click **New Workflow**
2. Choose a trigger (e.g. "Daily at 9am" or "When stock drops below threshold")
3. Add an action (e.g. "Send me a summary email" or "Flag low stock products")
4. Save and enable the workflow

---

## Part 5 — Check Order Intelligence

**Navigate to:** Order Intelligence (left sidebar)

View synced orders from your connected Shopify store, including status, revenue totals, and customer information. Use the search and filter controls to find specific orders.

---

## Notes for Reviewers

- All Shopify data shown is live from your connected development store — nothing is mocked
- Orion uses Claude AI to understand natural language and take action on your store
- The OAuth connection uses your existing Shopify session — no extra passwords needed
- Commands are always shown for review before they execute — nothing runs without your approval

---

## Support

Questions during review: **hello@tandril.org**
