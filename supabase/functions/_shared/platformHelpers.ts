// Platform helpers for securely handling platform credentials
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decrypt, isEncrypted } from './encryption.ts';

export interface Platform {
  id: string;
  user_id: string;
  platform_type: string;
  shop_domain: string;
  shop_name?: string;
  access_token: string;
  access_scopes?: string[];
  is_active?: boolean;
  last_synced_at?: string;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

/**
 * Gets a platform by shop domain and automatically decrypts the access token
 */
export async function getPlatformWithDecryptedToken(
  supabase: SupabaseClient,
  userId: string,
  shopDomain: string
): Promise<Platform | null> {
  const { data: platform, error } = await supabase
    .from('platforms')
    .select('*')
    .eq('user_id', userId)
    .eq('shop_domain', shopDomain)
    .eq('is_active', true)
    .single();

  if (error || !platform) {
    return null;
  }

  // Decrypt the access token if it's encrypted
  if (platform.access_token && isEncrypted(platform.access_token)) {
    try {
      platform.access_token = await decrypt(platform.access_token);
    } catch (error) {
      console.error('[Platform] Failed to decrypt access token:', error);
      throw new Error('Failed to decrypt platform credentials');
    }
  }

  return platform as Platform;
}

/**
 * Gets all platforms for a user and decrypts their access tokens
 */
export async function getUserPlatformsWithDecryptedTokens(
  supabase: SupabaseClient,
  userId: string
): Promise<Platform[]> {
  const { data: platforms, error } = await supabase
    .from('platforms')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error || !platforms) {
    return [];
  }

  // Decrypt all access tokens
  for (const platform of platforms) {
    if (platform.access_token && isEncrypted(platform.access_token)) {
      try {
        platform.access_token = await decrypt(platform.access_token);
      } catch (error) {
        console.error(`[Platform] Failed to decrypt token for ${platform.shop_domain}:`, error);
        // Leave encrypted if decryption fails (backward compatibility)
      }
    }
  }

  return platforms as Platform[];
}

/**
 * Gets platforms by type and decrypts their access tokens
 */
export async function getPlatformsByTypeWithDecryptedTokens(
  supabase: SupabaseClient,
  userId: string,
  platformType: string
): Promise<Platform[]> {
  const { data: platforms, error } = await supabase
    .from('platforms')
    .select('*')
    .eq('user_id', userId)
    .eq('platform_type', platformType)
    .eq('is_active', true);

  if (error || !platforms) {
    return [];
  }

  // Decrypt all access tokens
  for (const platform of platforms) {
    if (platform.access_token && isEncrypted(platform.access_token)) {
      try {
        platform.access_token = await decrypt(platform.access_token);
      } catch (error) {
        console.error(`[Platform] Failed to decrypt token for ${platform.shop_domain}:`, error);
      }
    }
  }

  return platforms as Platform[];
}
