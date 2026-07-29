import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  voice_language: z.enum(['te', 'en', 'mixed']).default('te'),
})

export const campaignUpdateSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
})

export const followUpSchema = z.object({
  contact_id: z.string().min(1, 'Contact is required'),
  campaign_id: z.string().min(1, 'Campaign is required'),
  scheduled_date: z.string().min(1, 'Date is required'),
  notes: z.string().max(500, 'Notes too long').optional(),
})

export const profileUpdateSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').optional(),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type CampaignFormData = z.infer<typeof campaignSchema>
export type CampaignUpdateFormData = z.infer<typeof campaignUpdateSchema>
export type FollowUpFormData = z.infer<typeof followUpSchema>
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>
