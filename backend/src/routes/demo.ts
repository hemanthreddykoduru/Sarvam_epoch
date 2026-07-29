import { Router, Response, Request } from 'express';
import { io } from '../index.js';
import axios from 'axios';
import { saveAppointmentToExcel } from '../utils/excel.js';
import logger from '../utils/logger.js';

const router = Router();

// Post-call webhook: accepts both the manual demo shape and Sarvam's
// extracted-variables shape (flat, or nested under extracted_variables/data).
router.post('/book-appointment', async (req: Request, res: Response) => {
  // ponytail: raw dump so the first live call reveals Sarvam's real field names; drop once confirmed
  logger.info('post-call webhook payload', { body: req.body });

  const b = { ...req.body, ...(req.body?.data || {}), ...(req.body?.extracted_variables || {}) };

  const appointmentData = {
    id: Date.now(),
    customer: b.customer || b.merchant_name || 'Unknown Caller',
    merchantId: b.merchantId || b.merchant_id || '',
    service: b.service || b.issue_description || 'General Query',
    time: b.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'upcoming',
    phone: b.phone || b.user_phone_number || '+91 00000 00000'
  };

  // Emit a real-time WebSocket event to the frontend
  io.emit('new_appointment', appointmentData);

  // Save it directly to our Excel Sheet
  saveAppointmentToExcel(appointmentData);

  // Push to Zapier/Make Cloud Webhook if configured
  if (process.env.CLOUD_WEBHOOK_URL) {
    try {
      await axios.post(process.env.CLOUD_WEBHOOK_URL, appointmentData);
      console.log('Successfully pushed data to Cloud Webhook!');
    } catch (err: any) {
      console.error('Failed to push to Cloud Webhook:', err.message);
    }
  }

  return res.json({ success: true, message: 'Real-time event fired, Excel updated, & Cloud Webhook triggered!' });
});

export default router;
