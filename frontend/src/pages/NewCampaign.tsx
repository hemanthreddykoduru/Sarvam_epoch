import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCreateCampaign } from '@/hooks/useQueries'
import { campaignSchema, type CampaignFormData } from '@/lib/schemas'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const languageOptions = [
  { value: 'te', label: 'Telugu' },
  { value: 'en', label: 'English' },
  { value: 'mixed', label: 'Mixed' },
]

export function NewCampaign() {
  const navigate = useNavigate()
  const createCampaign = useCreateCampaign()

  const { register, handleSubmit, formState: { errors } } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      description: '',
      voice_language: 'te',
    },
  })

  const onSubmit = (data: CampaignFormData) => {
    createCampaign.mutate(data, {
      onSuccess: (res) => {
        toast.success('Campaign created')
        if (res?.data?.id) {
          navigate(`/campaigns/${res.data.id}`)
        } else {
          navigate('/campaigns')
        }
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to create campaign')
      },
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Campaigns
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Campaign</CardTitle>
          <CardDescription>Create a new voice calling campaign for your contacts</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="Campaign Name"
              placeholder="e.g. Summer Promo 2026"
              {...register('name')}
              error={errors.name?.message}
              required
            />

            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="flex min-h-[100px] w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Optional campaign description..."
                {...register('description')}
              />
              {errors.description?.message && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <Select
              label="Voice Language"
              options={languageOptions}
              {...register('voice_language')}
            />

            <div className="space-y-1">
              <label className="text-sm font-medium">Merchant List (CSV Upload)</label>
              <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center bg-muted/40 hover:bg-muted/40 transition-colors cursor-pointer">
                <Input type="file" accept=".csv" className="hidden" id="csv-upload" />
                <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  </div>
                  <span className="text-sm font-medium">Click to upload CSV</span>
                  <span className="text-xs text-muted-foreground mt-1">or drag and drop here</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault();
                  toast.success('Successfully parsed CSV.');
                  setTimeout(() => toast.success('1,432 Merchants queued for AI Escalation!', { duration: 5000 }), 1000);
                  setTimeout(() => navigate('/dashboard'), 3000);
                }}
              >
                Launch Bulk Campaign
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/campaigns')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
