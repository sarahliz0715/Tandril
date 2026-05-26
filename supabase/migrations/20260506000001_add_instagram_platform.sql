-- Add Instagram as a platform type
INSERT INTO platform_types (type_id, name, category, description, logo_url, is_active, requires_oauth)
VALUES (
    'instagram',
    'Instagram Shopping',
    'social',
    'Connect your Instagram Business account to manage your Instagram Shop catalog, sync product prices and inventory, and track sales directly from Tandril.',
    'https://www.instagram.com/favicon.ico',
    true,
    true
)
ON CONFLICT (type_id) DO NOTHING;
