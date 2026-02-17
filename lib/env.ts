import { z } from 'zod';

/**
 * Environment variable schema with strict validation.
 * The application will crash with specific errors if validation fails.
 */
const envSchema = z.object({
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL',
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required',
  }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, {
    message: 'SUPABASE_SERVICE_ROLE_KEY is required',
  }),

  // Anthropic Configuration
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-', {
    message: 'ANTHROPIC_API_KEY must start with "sk-ant-"',
  }),

  // Stripe Configuration
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', {
    message: 'STRIPE_SECRET_KEY must start with "sk_"',
  }),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', {
    message: 'STRIPE_WEBHOOK_SECRET must start with "whsec_"',
  }),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_', {
    message: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with "pk_"',
  }),

  // Vapi Configuration
  VAPI_API_KEY: z.string().min(1, {
    message: 'VAPI_API_KEY is required',
  }),
  NEXT_PUBLIC_VAPI_PUBLIC_KEY: z.string().min(1, {
    message: 'NEXT_PUBLIC_VAPI_PUBLIC_KEY is required',
  }),
  VAPI_WEBHOOK_SECRET: z.string().min(1).optional(),
  VAPI_PHONE_NUMBER_ID: z.string().min(1).optional(),

  // Resend Configuration (Email)
  RESEND_API_KEY: z.string().startsWith('re_', {
    message: 'RESEND_API_KEY must start with "re_"',
  }).optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  // Twilio Configuration (SMS)
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC', {
    message: 'TWILIO_ACCOUNT_SID must start with "AC"',
  }).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  TWILIO_PHONE_NUMBER: z.string().min(1).optional(),

  // Application Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables and throws descriptive errors if invalid.
 * This function should be called when the app needs to access env vars.
 */
function validateEnv(): Env {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    VAPI_API_KEY: process.env.VAPI_API_KEY,
    NEXT_PUBLIC_VAPI_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY,
    VAPI_WEBHOOK_SECRET: process.env.VAPI_WEBHOOK_SECRET,
    VAPI_PHONE_NUMBER_ID: process.env.VAPI_PHONE_NUMBER_ID,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!parsed.success) {
    const errors = parsed.error.errors
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');

    throw new Error(
      `\n❌ Invalid environment variables:\n${errors}\n\n` +
        `Please check your .env.local file and ensure all required variables are set.\n`
    );
  }

  return parsed.data;
}

/**
 * Cached environment variables.
 * Lazy-loaded to avoid issues during build time for static pages.
 */
let cachedEnv: Env | null = null;

/**
 * Get validated environment variables.
 * Validates on first access and caches the result.
 * The app will crash with specific errors if env is invalid.
 *
 * @example
 * import { getEnv } from '@/lib/env';
 * const env = getEnv();
 * const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
 */
export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}

/**
 * Validated environment variables (getter-based for lazy loading).
 * Access these values instead of process.env directly.
 *
 * @example
 * import { env } from '@/lib/env';
 * const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
 */
export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    const validatedEnv = getEnv();
    return validatedEnv[prop as keyof Env];
  },
});

/**
 * Type-safe environment variable access for client-side code.
 * Only includes NEXT_PUBLIC_ prefixed variables.
 */
export const clientEnv = new Proxy(
  {} as {
    readonly NEXT_PUBLIC_SUPABASE_URL: string;
    readonly NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    readonly NEXT_PUBLIC_VAPI_PUBLIC_KEY: string;
    readonly NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
    readonly NEXT_PUBLIC_APP_URL: string | undefined;
  },
  {
    get(_target, prop: string) {
      const validatedEnv = getEnv();
      const allowedKeys = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'NEXT_PUBLIC_VAPI_PUBLIC_KEY',
        'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
        'NEXT_PUBLIC_APP_URL',
      ];
      if (!allowedKeys.includes(prop)) {
        throw new Error(`Cannot access ${prop} from clientEnv - only NEXT_PUBLIC_ vars allowed`);
      }
      return validatedEnv[prop as keyof Env];
    },
  }
);
