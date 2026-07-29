import { Router, Response } from 'express';
import axios from 'axios';
import logger from '../utils/logger.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { toE164, isAllowedNumber } from '../lib/phone.js';

const router = Router();

// This endpoint places real, billable phone calls. It was previously unauthenticated, so anyone
// who found the URL could dial arbitrary numbers on this Sarvam account.
router.use(requireAuth);

router.post('/trigger', async (req: AuthRequest, res: Response) => {
  const { customerName, customerPhone, service } = req.body;

  const API_KEY = process.env.SARVAM_VOICE_AGENTS_API_KEY;
  const AGENT_ID = process.env.SARVAM_AGENT_ID;
  const FROM_NUMBER = process.env.SARVAM_AGENT_PHONE_NUMBER;
  const ORG_ID = process.env.SARVAM_ORG_ID;
  const WORKSPACE_ID = process.env.SARVAM_WORKSPACE_ID;
  const CONNECTION_ID = process.env.SARVAM_CONNECTION_ID;

  if (!AGENT_ID || !ORG_ID || !WORKSPACE_ID || !CONNECTION_ID || !FROM_NUMBER) {
    return res.status(500).json({
      error: 'Sarvam outbound not configured. Set SARVAM_AGENT_ID, SARVAM_ORG_ID, SARVAM_WORKSPACE_ID, SARVAM_CONNECTION_ID, SARVAM_AGENT_PHONE_NUMBER.',
    });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: 'Missing SARVAM_VOICE_AGENTS_API_KEY in .env' });
  }
  const phone = toE164(String(customerPhone || ''));
  if (!phone) {
    return res.status(400).json({ error: 'A valid phone number is required' });
  }
  if (!isAllowedNumber(phone)) {
    logger.warn('Blocked outbound call to a number outside the allow list', { userId: req.userId });
    return res.status(403).json({ error: 'This number is not in the allowed list' });
  }

  try {
    const response = await axios.post(
      `https://apps.sarvam.ai/api/outbounds/v1/orgs/${ORG_ID}/workspaces/${WORKSPACE_ID}/outbounds`,
      {
        app_config: {
          app_id: AGENT_ID,
          app_version: 1,
          app_type: 'agent',
          connection_config: {
            connection_id: CONNECTION_ID,
            agent_phone_number: FROM_NUMBER
          },
          agent_variables: {
            merchant_name: customerName,
            issue_type: service,
            serviceProviderName: 'Razorpay Support'
          }
        },
        user_config: {
          user_phone_number: phone
        },
        // The instant-outbound webhook echoes webhook_config.metadata but carries no phone number
        // and supports no custom headers, so the shared secret and the fields we need to attribute
        // the call travel here. Body-borne, so they stay out of URLs and access logs.
        webhook_config: process.env.SARVAM_WEBHOOK_URL ? {
          url: process.env.SARVAM_WEBHOOK_URL,
          metadata: {
            token: process.env.SARVAM_WEBHOOK_SECRET,
            user_phone_number: phone,
            customer_name: customerName,
            app_id: AGENT_ID,
          },
        } : undefined,
      },
      {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    logger.info('Outbound call placed', { userId: req.userId });
    return res.json({ data: response.data });
  } catch (error: any) {
    const detail = error.response?.data;
    logger.error('Failed to trigger outbound call', { detail: detail || error.message });
    return res.status(error.response?.status || 500).json({
      error: typeof detail === 'string' ? detail : detail?.message || 'Failed to trigger call',
    });
  }
});

export default router;
