import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Supabase Authentication Service
 * Handles all authentication operations including sign-up, sign-in, trial tracking
 */

// Calculate trial end date (14 days from sign-up)
const getTrialEndDate = () => {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 14);
  return endDate.toISOString();
};

// Calculate first month end date (30 days from sign-up)
const getFirstMonthEndDate = () => {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);
  return endDate.toISOString();
};

export const supabaseAuthService = {
  /**
   * Sign up with email and password
   */
  async signUp(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata.full_name || email.split('@')[0],
          trial_start: new Date().toISOString(),
          trial_end: getTrialEndDate(),
          first_month_end: getFirstMonthEndDate(),
          subscription_status: 'trial', // 'trial', 'first_month', 'active', 'expired'
          subscription_tier: 'trial', // 'trial', 'paid'
          onboarding_completed: false,
          ...metadata
        }
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign in with OAuth provider (Google, GitHub, etc.)
   */
  async signInWithProvider(provider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/Onboarding`
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign out
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get current user
   */
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) throw new Error('No user logged in');

    // Enhance user object with trial/subscription info
    return {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      createdAt: user.created_at,

      // Trial & Subscription info
      trial_start: user.user_metadata?.trial_start,
      trial_end: user.user_metadata?.trial_end,
      first_month_end: user.user_metadata?.first_month_end,
      subscription_status: this.getSubscriptionStatus(user),
      subscription_tier: user.user_metadata?.subscription_tier || 'trial',

      // Onboarding
      onboarding_completed: user.user_metadata?.onboarding_completed || false,

      // Admin
      isAdmin: user.user_metadata?.isAdmin || user.email === 'sarahliz0715@gmail.com',
      role: user.user_metadata?.role || (user.email === 'sarahliz0715@gmail.com' ? 'owner' : 'user'),

      // Other settings
      total_session_seconds: user.user_metadata?.total_session_seconds || 0,
      menu_order: user.user_metadata?.menu_order || [],
      user_mode: user.user_metadata?.user_mode || 'standard',
      shopify_beta_access: user.user_metadata?.shopify_beta_access || false,
      layout_reminder_dismissed: user.user_metadata?.layout_reminder_dismissed || false,
      vacation_mode_enabled: user.user_metadata?.vacation_mode_enabled || false,
      betaAccess: user.user_metadata?.betaAccess || false,
      subscription: user.user_metadata?.subscription || 'free'
    };
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  /**
   * Update user metadata
   */
  async updateMe(updates) {
    const { data, error } = await supabase.auth.updateUser({
      data: updates
    });

    if (error) throw error;
    return await this.me();
  },

  /**
   * Update user data (alias for updateMe)
   */
  async updateMyUserData(updates) {
    return await this.updateMe(updates);
  },

  /**
   * Reset password - send email
   */
  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) throw error;
  },

  /**
   * Update password (when user is logged in)
   */
  async updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
  },

  /**
   * Get subscription status based on dates
   */
  getSubscriptionStatus(user) {
    const now = new Date();
    const trialEnd = user.user_metadata?.trial_end ? new Date(user.user_metadata.trial_end) : null;
    const firstMonthEnd = user.user_metadata?.first_month_end ? new Date(user.user_metadata.first_month_end) : null;
    const tier = user.user_metadata?.subscription_tier;

    // If already paid, return active
    if (tier === 'paid') return 'active';

    // Check trial period
    if (trialEnd && now <= trialEnd) return 'trial';

    // Check first month period
    if (firstMonthEnd && now <= firstMonthEnd) return 'first_month';

    // Trial expired
    return 'expired';
  },

  /**
   * Check if user has access to a feature based on subscription
   */
  hasFeatureAccess(user, feature) {
    const status = this.getSubscriptionStatus(user);

    // Paid users have access to everything
    if (user.user_metadata?.subscription_tier === 'paid') return true;

    // Trial users have access to specific features
    const trialFeatures = ['workflows', 'commands', 'ads', 'aiAdvisor', 'intelligence'];

    if (status === 'trial' && trialFeatures.includes(feature)) return true;
    if (status === 'first_month' && trialFeatures.includes(feature)) return true;

    return false;
  },

  /**
   * Redirect to login page
   */
  redirectToLogin(redirectUrl) {
    window.location.href = `/Login?redirect=${encodeURIComponent(redirectUrl || '/Dashboard')}`;
  },

  /**
   * Login alias for signIn
   */
  async login(email, password) {
    return await this.signIn(email, password);
  },

  /**
   * Logout alias
   */
  async logout() {
    return await this.signOut();
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }
};
