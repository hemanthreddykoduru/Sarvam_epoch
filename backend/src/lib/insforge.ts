import { createClient, createAdminClient } from '@insforge/sdk';

const INSFORGE_URL = process.env.INSFORGE_URL || 'https://3qxefbbq.us-east.insforge.app';
const INSFORGE_ANON_KEY = process.env.INSFORGE_ANON_KEY || 'anon_119c7538b2e4e4dcc7d2658d31f93ffc97645f09b30fb614110a69850c34b9eb';
const INSFORGE_API_KEY = process.env.INSFORGE_API_KEY || 'ik_7f29b019857ff9b1078df01abe6b09e384596275b9f685588c20b6114811b06b';

export const client = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_ANON_KEY,
});

export const adminClient = createAdminClient({
  baseUrl: INSFORGE_URL,
  apiKey: INSFORGE_API_KEY,
});
