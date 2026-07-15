/*
# Add razorpay_payment_id column to subscriptions

## Summary
Adds a `razorpay_payment_id` column to the subscriptions table to support
Razorpay payment integration (replacing Stripe). The old `stripe_session_id`
column is kept for backward compatibility but will not be used going forward.

## Tables Modified
- `subscriptions`: Added `razorpay_payment_id` (text, nullable) column

## Security
- No RLS policy changes needed — existing owner-scoped policies cover the new column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'razorpay_payment_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN razorpay_payment_id text;
  END IF;
END $$;
