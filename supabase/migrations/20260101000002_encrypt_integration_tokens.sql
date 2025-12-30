-- Add encryption_version column to integration_tokens table
-- This tracks whether tokens are v1 (plaintext - legacy) or v2 (encrypted with master key)

ALTER TABLE public.integration_tokens
  ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1;

-- Add comment explaining versions
COMMENT ON COLUMN public.integration_tokens.encryption_version IS
  'Token encryption version: 1 = plaintext (legacy/insecure), 2 = encrypted with master key (E2EE)';

-- Create index for encrypted tokens
CREATE INDEX IF NOT EXISTS idx_integration_tokens_encrypted
  ON public.integration_tokens(user_id, provider)
  WHERE encryption_version = 2;

-- Create index for legacy tokens (for migration tracking)
CREATE INDEX IF NOT EXISTS idx_integration_tokens_legacy
  ON public.integration_tokens(user_id, provider)
  WHERE encryption_version = 1;
