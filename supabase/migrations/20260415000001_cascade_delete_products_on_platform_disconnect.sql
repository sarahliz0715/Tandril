-- When a platform connection is deleted, immediately remove all synced product
-- data for that user + platform type.  There is no reason to retain a seller's
-- listing data (titles, prices, inventory, images) after they disconnect.
-- This covers every code path that removes a platform row: the Disconnect button,
-- force-cleanup, and any future server-side deletions.

CREATE OR REPLACE FUNCTION delete_products_on_platform_disconnect()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM products
  WHERE user_id = OLD.user_id
    AND platform_type = OLD.platform_type;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop first so re-running the migration is safe
DROP TRIGGER IF EXISTS trg_delete_products_on_platform_disconnect ON platforms;

CREATE TRIGGER trg_delete_products_on_platform_disconnect
  BEFORE DELETE ON platforms
  FOR EACH ROW
  EXECUTE FUNCTION delete_products_on_platform_disconnect();
