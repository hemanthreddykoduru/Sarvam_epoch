import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { adminClient } from '../lib/insforge.js';
import { logger } from '../utils/logger.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Initialize Razorpay with test mode credentials
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_xxxxxx',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_xxxxxx',
});

// All payment routes require authentication
router.use(requireAuth);

// Create Razorpay order
router.get('/diagnose', (req: AuthRequest, res: Response) => {
  // Test Razorpay init
  let razorpayInitStatus = 'unknown';
  let testOrderResult = 'not_tested';
  try {
    const testRp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_xxxxxx',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_xxxxxx',
    });
    razorpayInitStatus = 'ok';
    // Try to create a test order synchronously — just test that the call can be made
    testOrderResult = 'sdk_loaded';
  } catch (e: any) {
    razorpayInitStatus = `init_failed: ${e?.message || e}`;
  }
  res.json({
    razorpayKeySet: !!process.env.RAZORPAY_KEY_ID,
    razorpaySecretSet: !!process.env.RAZORPAY_KEY_SECRET,
    razorpayKeyPrefix: process.env.RAZORPAY_KEY_ID?.substring(0, 8),
    frontendUrl: process.env.FRONTEND_URL,
    userId: req.userId,
    userEmail: req.userEmail,
    razorpayInitStatus,
    testOrderResult,
  });
});

router.post('/create-order', async (req: AuthRequest, res: Response) => {
  try {
    const { plan, amount, currency } = req.body;

    if (!plan || !amount) {
      return res.status(400).json({ error: 'Plan and amount are required' });
    }

    // Map plan to Razorpay amount
    const planAmounts: Record<string, number> = {
      free: 0,
      starter: 999, // ₹999
      professional: 2999, // ₹2,999
      enterprise: 0 // Custom pricing
    };

    const razorpayAmount = planAmounts[plan as keyof typeof planAmounts] || 0;

    if (razorpayAmount === 0) {
      return res.json({ orderId: null, message: 'Free plan - no payment required' });
    }

    // Create Razorpay order
    const shortId = (req.userId || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    const receipt = `txn_${shortId}_${Date.now() % 1000000}`.slice(0, 40);

    const options = {
      amount: razorpayAmount * 100, // Razorpay expects amount in paise
      currency: currency || 'INR',
      receipt,
      notes: {
        plan,
        userId: req.userId!,
      },
      payment_capture: 1 // Auto capture
    };

    const optionsStr = JSON.stringify(options);
    logger.info('Creating Razorpay order', { options: optionsStr });

    const order = await razorpay.orders.create(options);

    logger.info('Razorpay order created', { 
      orderId: order.id, 
      plan, 
      amount: razorpayAmount,
      userId: req.userId!
    });

    return res.json({ 
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan,
      userId: req.userId!
    });
  } catch (error: any) {
    const errorProps: Record<string, any> = {};
    try {
      // Extract all enumerable and non-enumerable properties
      const props = Object.getOwnPropertyNames(error);
      for (const p of props) {
        const val = error[p];
        errorProps[p] = typeof val === 'object' ? JSON.stringify(val) : val;
      }
    } catch {}
    const errMsg = JSON.stringify(errorProps) || error?.message || error?.toString() || 'Unknown error';
    logger.error('Failed to create Razorpay order', { error: errMsg, errorProps });
    return res.status(500).json({ error: errMsg, errorProps });
  }
});

// Verify Razorpay payment
router.post('/verify-payment', async (req: AuthRequest, res: Response) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      plan,
      amount
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    // Verify the payment signature using Razorpay
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'rzp_test_xxxxxx')
      .update(body)
      .digest('hex');

    const isValidSignature = expectedSignature === razorpay_signature;

    if (!isValidSignature) {
      logger.error('Invalid Razorpay signature', { 
        razorpay_order_id, 
        razorpay_payment_id,
        razorpay_signature,
        expectedSignature
      });
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Determine credits based on actual amount paid or plan name
    const planCredits: Record<string, number> = {
      starter: 100,
      professional: 500,
      enterprise: -1
    };

    // Default to plan-based credits
    let credits = planCredits[plan] ?? 10;
    const paidRupees = amount ? Number(amount) : 0;

    if (paidRupees > 0) {
      // Match by amount first (handles test mode with ₹1)
      const planAmounts: Record<string, number> = {
        free: 0,
        starter: 999,
        professional: 2999,
      };
      let matched = false;
      for (const [p, amt] of Object.entries(planAmounts)) {
        if (amt === paidRupees) {
          credits = planCredits[p] ?? 10;
          matched = true;
          break;
        }
      }
      if (!matched) {
        // Proportional: ~₹10 per credit for custom/test amounts
        credits = Math.max(1, Math.floor(paidRupees / 10));
      }
    }

    // Upsert user plan in the database (update or insert)
    const now = new Date().toISOString();
    let users: any = null;

    // Try update first
    const { data: updateData, error: updateError } = await adminClient.database
      .from('users')
      .update({
        plan,
        credits_remaining: credits,
        updated_at: now
      })
      .eq('id', req.userId!)
      .select()
      .single();

    if (updateError && updateError.message?.includes('row not found')) {
      // Insert new row if user doesn't exist
      const { data: insertData, error: insertError } = await adminClient.database
        .from('users')
        .insert([{
          id: req.userId!,
          email: req.userEmail || '',
          full_name: req.userEmail?.split('@')[0] || '',
          role: 'user',
          plan,
          credits_remaining: credits,
          created_at: now,
          updated_at: now
        }])
        .select()
        .single();

      if (insertError) {
        logger.error('Failed to insert user after payment', { error: insertError.message, userId: req.userId! });
        return res.status(500).json({ error: insertError.message });
      }
      users = insertData;
    } else if (updateError) {
      logger.error('Failed to update user', { error: updateError.message, userId: req.userId! });
      return res.status(500).json({ error: updateError.message });
    } else {
      users = updateData;
    }

    // Upsert subscription record
    const subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error: subError } = await adminClient.database
      .from('subscriptions')
      .upsert({
        user_id: req.userId!,
        plan,
        status: 'active',
        credits_total: credits,
        credits_used: 0,
        stripe_customer_id: `rzp_${req.userId!}`,
        stripe_subscription_id: razorpay_payment_id,
        current_period_start: now,
        current_period_end: subscriptionEnd
      }, { onConflict: 'user_id', ignoreDuplicates: false })
      .select()
      .single();

    if (subError) {
      logger.error('Failed to upsert subscription', { error: subError.message, userId: req.userId! });
    }

    logger.info('Razorpay payment verified', { 
      orderId: razorpay_order_id, 
      paymentId: razorpay_payment_id,
      plan,
      userId: req.userId!
    });

    return res.json({ 
      success: true, 
      user: users,
      subscription: {
        plan,
        status: 'active',
        credits_total: credits,
        credits_used: 0,
        current_period_end: subscriptionEnd
      },
      payment: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        plan,
        amount: users?.credits_remaining ?? 0,
        status: 'completed'
      }
    });
  } catch (error: any) {
    logger.error('Failed to verify Razorpay payment', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

export default router;
