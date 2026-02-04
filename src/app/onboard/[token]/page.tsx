'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { appConfig } from '@/lib/config/theme'
import { cn } from '@/lib/utils'

type Step = 1 | 2 | 3

const projectTypes = [
  { value: 'automation', label: 'Automation & Workflows', description: 'Streamline repetitive tasks and processes' },
  { value: 'internal_system', label: 'Internal System', description: 'Custom tools for your team' },
  { value: 'mvp', label: 'MVP / Prototype', description: 'Validate your idea quickly' },
  { value: 'ai_agent', label: 'AI Agent / Assistant', description: 'Intelligent automation with AI' },
  { value: 'consulting', label: 'Consulting', description: 'Strategic advice and planning' },
  { value: 'other', label: 'Other', description: 'Something else entirely' },
]

const budgetRanges = [
  { value: 'under_5k', label: 'Under €5,000' },
  { value: '5k_10k', label: '€5,000 - €10,000' },
  { value: '10k_25k', label: '€10,000 - €25,000' },
  { value: '25k_50k', label: '€25,000 - €50,000' },
  { value: '50k_plus', label: '€50,000+' },
  { value: 'not_sure', label: 'Not sure yet' },
]

const timelines = [
  { value: 'asap', label: 'As soon as possible' },
  { value: '1_month', label: 'Within 1 month' },
  { value: '2_3_months', label: '2-3 months' },
  { value: '3_6_months', label: '3-6 months' },
  { value: 'flexible', label: 'Flexible / No rush' },
]

export default function OnboardingPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [step, setStep] = useState<Step>(1)
  const [isValidating, setIsValidating] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkWorkspaceId, setLinkWorkspaceId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    project_type: '',
    project_description: '',
    budget_range: '',
    timeline: '',
    source: '',
    referral: ''
  })

  useEffect(() => {
    validateToken()
  }, [token])

  const validateToken = async () => {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('intake_links')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single()
    
    if (error || !data) {
      setError('This link is invalid or has expired.')
      setIsValidating(false)
      return
    }
    
    // Check expiry
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setError('This link has expired.')
      setIsValidating(false)
      return
    }
    
    // Check max uses
    if (data.max_uses && data.use_count >= data.max_uses) {
      setError('This link has reached its maximum uses.')
      setIsValidating(false)
      return
    }
    
    // Store the workspace_id from the intake link for the lead insert
    if (data.workspace_id) {
      setLinkWorkspaceId(data.workspace_id)
    }
    
    setIsValid(true)
    setIsValidating(false)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const supabase = createClient()
      
      // Create lead (include workspace_id from the intake link)
      const leadInsert: Record<string, unknown> = {
        company_name: formData.company_name,
        contact_name: formData.contact_name,
        email: formData.email,
        phone: formData.phone || null,
        website: formData.website || null,
        project_type: formData.project_type || 'other',
        project_description: formData.project_description || null,
        budget_range: formData.budget_range || null,
        timeline: formData.timeline || null,
        source: formData.source || null,
        referral: formData.referral || null,
        intake_token: token,
        token_used_at: new Date().toISOString()
      }
      if (linkWorkspaceId) {
        leadInsert.workspace_id = linkWorkspaceId
      }

      const { error: leadError } = await supabase
        .from('leads')
        .insert(leadInsert)
      
      if (leadError) throw leadError
      
      // Increment link use count
      const { data: link } = await supabase
        .from('intake_links')
        .select('use_count')
        .eq('token', token)
        .single()
      
      if (link) {
        await supabase
          .from('intake_links')
          .update({ use_count: (link.use_count || 0) + 1 })
          .eq('token', token)
      }
      
      setIsSubmitted(true)
    } catch (error) {
      console.error(error)
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => setStep((s) => Math.min(s + 1, 3) as Step)
  const prevStep = () => setStep((s) => Math.max(s - 1, 1) as Step)

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.company_name && formData.contact_name && formData.email
      case 2:
        return formData.project_type
      case 3:
        return true
      default:
        return false
    }
  }

  if (isValidating) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    )
  }

  if (error && !isValid) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">😕</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Link Not Valid</h2>
            <p className="text-zinc-400">{error}</p>
            <p className="text-sm text-zinc-500 mt-4">
              Please contact us directly at{' '}
              <a href={`mailto:${appConfig.supportEmail}`} className="text-emerald-500 hover:underline">
                {appConfig.supportEmail}
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Thank You!</h2>
            <p className="text-zinc-400">
              Your inquiry has been submitted successfully. We&apos;ll review your project details and get back to you within 24-48 hours.
            </p>
            <div className="mt-6 p-4 rounded-lg bg-zinc-800 text-left">
              <p className="text-sm text-zinc-400 mb-2">What happens next?</p>
              <ol className="text-sm text-zinc-300 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-500 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  We&apos;ll review your project requirements
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-500 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  Schedule a call to discuss details
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-500 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  Receive a tailored proposal
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image src={appConfig.logo} alt={appConfig.name} width={32} height={32} className="h-8 w-8" />
            <span className="text-2xl font-bold text-white">{appConfig.name}</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">Let&apos;s Build Something Great</h1>
          <p className="text-zinc-400 mt-2">Tell us about your project and we&apos;ll get back to you soon.</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                'h-2 w-16 rounded-full transition-colors',
                step >= s ? 'bg-emerald-500' : 'bg-zinc-800'
              )}
            />
          ))}
        </div>

        {/* Form Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">
              {step === 1 && 'About You'}
              {step === 2 && 'Your Project'}
              {step === 3 && 'Budget & Timeline'}
            </CardTitle>
            <CardDescription className="text-zinc-400">
              {step === 1 && 'Who are we working with?'}
              {step === 2 && 'What are you looking to build?'}
              {step === 3 && 'Help us understand your constraints'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Contact Info */}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Your company"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Your Name *</Label>
                  <Input
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    placeholder="John Doe"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@company.com"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Phone (optional)</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+49 123 456789"
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Website (optional)</Label>
                    <Input
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="www.company.com"
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Project Info */}
            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label>What type of project is this? *</Label>
                  <div className="grid gap-3 md:grid-cols-2">
                    {projectTypes.map((type) => (
                      <div
                        key={type.value}
                        onClick={() => setFormData({ ...formData, project_type: type.value })}
                        className={cn(
                          'p-4 rounded-lg border cursor-pointer transition-colors',
                          formData.project_type === type.value
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                        )}
                      >
                        <p className="font-medium text-white">{type.label}</p>
                        <p className="text-sm text-zinc-400">{type.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tell us more about your project</Label>
                  <Textarea
                    value={formData.project_description}
                    onChange={(e) => setFormData({ ...formData, project_description: e.target.value })}
                    placeholder="What problem are you trying to solve? What's your vision?"
                    className="bg-zinc-800 border-zinc-700 min-h-[120px]"
                  />
                </div>
              </>
            )}

            {/* Step 3: Budget & Timeline */}
            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label>Budget Range</Label>
                  <Select
                    value={formData.budget_range}
                    onValueChange={(v) => setFormData({ ...formData, budget_range: v })}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="Select budget range" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {budgetRanges.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timeline</Label>
                  <Select
                    value={formData.timeline}
                    onValueChange={(v) => setFormData({ ...formData, timeline: v })}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="When do you need this?" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {timelines.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>How did you hear about us? (optional)</Label>
                  <Input
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="Google, LinkedIn, Referral..."
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              {step > 1 ? (
                <Button
                  variant="outline"
                  onClick={prevStep}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              ) : (
                <div />
              )}
              
              {step < 3 ? (
                <Button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit
                      <CheckCircle2 className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-zinc-500 mt-6">
          Questions? Email us at{' '}
          <a href={`mailto:${appConfig.supportEmail}`} className="text-emerald-500 hover:underline">
            {appConfig.supportEmail}
          </a>
        </p>
      </div>
    </div>
  )
}
