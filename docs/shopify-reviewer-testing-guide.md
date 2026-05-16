# Tandril — Shopify Reviewer Testing Guide

Use these step-by-step instructions to test the core Tandril experience with a connected Shopify development store.

## Login

Go to: https://www.tandril.org/Login

Sign in with the provided test credentials:
- Email: shopify-test@tandril.org
- Password: TandrilTest2026!

---

## Part 1 — Connect Your Shopify Store

1. Go to **Platforms** in the left sidebar
2. Click **Connect Shopify**
3. Enter your development store name (e.g. `my-store` — without `.myshopify.com`)
4. You'll be taken to Shopify briefly to confirm the connection using your existing Shopify login
5. You'll be brought back to Tandril automatically — the store will show as **Connected**
6. Tandril will automatically switch to **Live Mode** — you'll see a confirmation toast

> Note: No separate Shopify login prompt is shown if you're already logged into Shopify in your browser. This is expected behavior — Shopify confirms your existing session.

---

## Part 2 — Verify Data is Pulling In

Navigate to **Products** in the left sidebar and confirm:
- Product titles, prices, SKUs, and descriptions are displaying
- Inventory quantities are visible

Navigate to **Inventory** and confirm stock levels are showing from your connected store.

Navigate to **Dashboard** and confirm it's showing real metrics from your connected store.

---

## Part 3 — Talk to Orion (AI Advisor)

Orion is Tandril's AI business assistant. With your store connected, Orion has live access to your inventory and product data.

Navigate to **AI Advisor** in the left sidebar.

Suggested conversation:

**Message 1:**
> Show me my low stock products

Orion will pull live inventory data from your connected store and display a table of products with current stock levels.

**Message 2:**
> What's my best opportunity to grow sales this week?

Orion will analyze your store data and provide strategic recommendations based on your current inventory and sales patterns.

---

## Part 4 — Run an AI Command (Write Verification)

Commands let you take bulk actions on your store using plain English. All commands are shown for review before anything executes.

Navigate to **Commands** in the left sidebar.

**Step 1 — Price change:**
> Lower the price of [product name] by $1

- Orion will identify the product and show you the planned change
- Click **Execute** to apply it
- Navigate back to **Products** and confirm the price updated

**Step 2 — Restore the price:**
> Raise the price of [product name] by $1

- Execute and confirm the price is restored in Products

**Step 3 — Undo test:**
- After running a command, click the **Undo** button in the command result
- Confirm the change reverts in your Shopify store

> This demonstrates that no action in Tandril is permanent — everything can be reviewed before it runs and undone after.

---

## Part 5 — Set Up a Workflow

Navigate to **Workflows** in the left sidebar.

1. Click **New Workflow**
2. Choose a trigger (e.g. "When stock drops below threshold")
3. Add an action (e.g. "Flag low stock products")
4. Save and enable the workflow

---

## Notes for Reviewers

- All Shopify data shown is live from your connected development store — nothing is mocked
- Orion uses Claude AI to understand natural language and take action on your store
- The OAuth connection uses your existing Shopify session — no extra passwords needed
- Commands are always shown for review before they execute — nothing runs without your approval
- The Undo feature allows any command to be fully reverted in Shopify
