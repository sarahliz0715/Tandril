#!/usr/bin/env node

/**
 * Script to create a dedicated test account for Shopify app reviewers
 *
 * This creates an account with:
 * - Beta mode enabled (full feature access)
 * - Onboarding marked as completed
 * - No 2FA requirements
 * - Ready for Shopify review team testing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestAccount() {
  const testEmail = 'shopify-test@tandril.org';
  const testPassword = 'TandrilTest2026!'; // Simple but secure

  console.log('🔧 Creating Shopify test account...\n');

  try {
    // Check if account already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(u => u.email === testEmail);

    if (existing) {
      console.log('⚠️  Test account already exists!');
      console.log('📧 Email:', testEmail);
      console.log('🔐 Password:', testPassword);
      console.log('\nUpdating metadata to ensure beta access...\n');

      // Update the existing user's metadata
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        existing.id,
        {
          user_metadata: {
            full_name: 'Shopify Test Account',
            user_mode: 'beta',
            betaAccess: true,
            shopify_beta_access: true,
            onboarding_completed: true,
            subscription_status: 'active',
            subscription_tier: 'professional', // Give full access
            subscription: 'professional',
            trial_start: new Date().toISOString(),
            trial_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year trial
            first_month_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            isAdmin: false,
            role: 'user',
            layout_reminder_dismissed: true,
            vacation_mode_enabled: false
          }
        }
      );

      if (updateError) {
        console.error('❌ Error updating user:', updateError.message);
      } else {
        console.log('✅ Test account metadata updated successfully!');
      }
    } else {
      // Create new test account
      const { data: newUser, error: signupError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: 'Shopify Test Account',
          user_mode: 'beta',
          betaAccess: true,
          shopify_beta_access: true,
          onboarding_completed: true,
          subscription_status: 'active',
          subscription_tier: 'professional', // Give full access to all features
          subscription: 'professional',
          trial_start: new Date().toISOString(),
          trial_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year trial
          first_month_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          isAdmin: false,
          role: 'user',
          layout_reminder_dismissed: true,
          vacation_mode_enabled: false
        }
      });

      if (signupError) {
        console.error('❌ Error creating user:', signupError.message);
        process.exit(1);
      }

      console.log('✅ Test account created successfully!');
    }

    console.log('\n📋 Test Account Details for Shopify Submission:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Username/Email:', testEmail);
    console.log('Password:', testPassword);
    console.log('Account Description:', 'Full access test account with beta features enabled and professional tier subscription. Use this account to test all Tandril features including AI commands, platform integrations, inventory management, and purchase order system.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ Account Features:');
    console.log('   • Beta mode enabled (all features visible)');
    console.log('   • Professional tier subscription');
    console.log('   • Onboarding completed');
    console.log('   • No 2FA required');
    console.log('   • Email pre-confirmed');
    console.log('   • 1 year trial period\n');

    console.log('📝 Next Steps:');
    console.log('   1. Log in to https://www.tandril.org/Login');
    console.log('   2. Use the credentials above');
    console.log('   3. Generate demo data from the dashboard if needed');
    console.log('   4. Connect a Shopify development store to test integrations\n');

    console.log('💡 For Shopify App Submission:');
    console.log('   Copy the information from "Test Account Details" section above');
    console.log('   into the Shopify app listing form under "App testing information"\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

createTestAccount();
