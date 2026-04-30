-- Add print-on-demand platforms to platform_types

INSERT INTO platform_types (type_id, name, category, description, logo_url, is_active, requires_oauth)
VALUES
  (
    'printful',
    'Printful',
    'print_on_demand',
    'Connect your Printful store to sync print-on-demand products and orders',
    'https://www.printful.com/static/images/layout/printful-logo.png',
    true,
    false
  ),
  (
    'teepublic',
    'TeePublic',
    'print_on_demand',
    'Connect your TeePublic shop to track your print-on-demand designs and sales',
    'https://www.teepublic.com/assets/tp-logo.png',
    true,
    false
  ),
  (
    'redbubble',
    'Redbubble',
    'print_on_demand',
    'Connect your Redbubble shop to track your print-on-demand artwork and earnings',
    'https://ih1.redbubble.net/image/rb-logo.png',
    true,
    false
  )
ON CONFLICT (type_id) DO UPDATE SET
  is_active = true,
  updated_at = NOW();
