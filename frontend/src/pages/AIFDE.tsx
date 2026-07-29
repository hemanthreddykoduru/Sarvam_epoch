import { useState } from 'react'
import { Bot, Mic, Plus, ArrowUp, ChevronDown, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'

const SUGGESTIONS = [
  "Create a customer service agent",
  "Book appointments automatically",
  "Make a lead qualification agent",
  "Set up an outbound sales caller"
]

export function AIFDE() {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [generatedAgent, setGeneratedAgent] = useState<any>(null)
  const [submittedPrompt, setSubmittedPrompt] = useState('')
  const [executionSteps, setExecutionSteps] = useState<{label: string, status: 'pending'|'running'|'done', time?: string}[]>([])

  const simulatePipeline = () => {
    const steps = [
      "Analyzing user request...",
      "Planner started work",
      "Drafting agent persona & behavior...",
      "Generating localized greeting (Telugu)...",
      "ScriptWriter started work",
      "Validating agent configuration...",
      "Saving your agent to the database..."
    ];
    
    setExecutionSteps(steps.map(s => ({ label: s, status: 'pending' })));
    
    let currentStep = 0;
    const interval = setInterval(() => {
      setExecutionSteps(prev => prev.map((step, idx) => {
        if (idx < currentStep) return { ...step, status: 'done', time: '0.8s' };
        if (idx === currentStep) return { ...step, status: 'running' };
        return step;
      }));
      currentStep++;
      if (currentStep > steps.length) clearInterval(interval);
    }, 800);
    
    return interval;
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;
    
    setIsLoading(true);
    setSubmittedPrompt(prompt);
    setGeneratedAgent(null);
    const interval = simulatePipeline();

    try {
      const response = await api.post('/fde/generate', { prompt });
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Ensure the pipeline animation completes at least a few steps before showing result
      setTimeout(() => {
        clearInterval(interval);
        setExecutionSteps(prev => prev.map(s => ({ ...s, status: 'done', time: '0.4s' })));
        setGeneratedAgent(response.data.agent);
      }, 3000);
      
      setPrompt('');
    } catch (error: any) {
      clearInterval(interval);
      console.error('Failed to generate agent:', error);
      alert(`Failed to generate agent: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  }

  return (
    <>
      <div className="flex h-full flex-col">
      <PageHeader 
        title={
          <div className="flex items-center gap-2">
            AI Agent Builder <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">COMING SOON</span>
          </div>
        }
      />

      <div className="flex flex-1 flex-col items-center justify-center p-4">
        {/* Logo and Greeting */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 text-muted-foreground">
            {/* Custom bot icon roughly matching reference */}
            <Bot className="h-16 w-16 text-muted-foreground/60" />
          </div>
          <div className="mb-2 text-xs font-bold tracking-widest text-muted-foreground uppercase">AI Agent Builder</div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Ready when you are<span className="animate-pulse font-normal text-primary">|</span>
          </h1>
        </div>

        {/* Input Box Area - Moved to bottom if submitted */}
        <div className={`w-full max-w-4xl transition-all duration-700 ${submittedPrompt ? 'mt-auto pt-8' : 'mt-8'}`}>
          <div className="relative flex flex-col rounded-2xl border bg-card p-2 shadow-sm transition-shadow focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Help me build an agent... (Coming soon)"
              className="min-h-[60px] w-full resize-none bg-transparent p-3 text-sm focus:outline-none opacity-50 cursor-not-allowed"
              rows={2}
              disabled={true}
            />
            
            <div className="flex items-center justify-between px-2 pb-1 pt-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0">
                  <Mic className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-full text-xs font-medium">
                  Plan <ChevronDown className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-full text-xs font-medium bg-muted/50">
                  GPT-4o <ChevronDown className="h-3 w-3" />
                </Button>
                <Button size="sm" className="h-8 w-8 rounded-full p-0 transition-all" disabled={!prompt || isLoading} onClick={handleGenerate}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {generatedAgent && (
            <div className="mt-6 animate-in slide-in-from-bottom-4 fade-in duration-500 rounded-xl border bg-card p-4 shadow-sm text-left">
              <div className="flex items-center gap-2 border-b pb-3 mb-3">
                <Bot className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Draft Agent Ready: {generatedAgent.name}</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground block mb-1">Description</span>
                  <p className="text-foreground bg-accent/50 p-2 rounded-md">{generatedAgent.description}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground block mb-1">First Message (Telugu)</span>
                  <p className="text-foreground bg-accent/50 p-2 rounded-md font-medium">{generatedAgent.first_message}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground block mb-1">System Prompt</span>
                  <div className="bg-accent/50 p-2 rounded-md max-h-40 overflow-y-auto whitespace-pre-wrap text-xs font-mono">
                    {generatedAgent.system_prompt}
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <Button className="gap-2">Deploy to Sarvam <ArrowUp className="h-3 w-3 rotate-45" /></Button>
                </div>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {!generatedAgent && (
            <div className="mt-8 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                disabled={true}
                className="rounded-full border bg-background px-4 py-2 text-xs font-medium text-muted-foreground opacity-50 cursor-not-allowed"
              >
                {suggestion}
              </button>
            ))}
          </div>
          )}
        </div>
      </div>
    </div>

    {/* Full screen layout for execution */}
      {submittedPrompt && (
        <div className="absolute inset-0 bg-background/95 z-10 flex flex-col p-8 overflow-y-auto">
          <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-8 pb-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Bot className="h-5 w-5" /> {submittedPrompt}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => { setSubmittedPrompt(''); setGeneratedAgent(null); setIsLoading(false); }}>Cancel</Button>
            </div>

            <div className="flex-1 font-mono text-sm space-y-4 max-w-3xl">
              {executionSteps.map((step, i) => (
                step.status !== 'pending' && (
                  <div key={i} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="relative flex h-3 w-3 items-center justify-center">
                      {step.status === 'running' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>}
                      <span className={`relative inline-flex h-2 w-2 rounded-full ${step.status === 'done' ? 'bg-green-500' : 'bg-primary'}`}></span>
                    </div>
                    <span className={step.status === 'running' ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                      {step.label}
                    </span>
                    {step.label.includes('work') && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground border">delegated</span>
                    )}
                    {step.time && <span className="text-muted-foreground/50 ml-auto text-xs">{step.time}</span>}
                  </div>
                )
              ))}

              {generatedAgent && (
                <div className="mt-8 pt-6 border-t animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <p className="text-foreground font-medium mb-4">Agent created and saved successfully.</p>
                  <ul className="space-y-2 mb-6 font-sans">
                    <li><span className="font-semibold w-24 inline-block">Agent:</span> {generatedAgent.name}</li>
                    <li><span className="font-semibold w-24 inline-block">Language:</span> Telugu</li>
                    <li><span className="font-semibold w-24 inline-block">Type:</span> Inbound Support</li>
                    <li><span className="font-semibold w-24 inline-block">Description:</span> {generatedAgent.description}</li>
                  </ul>
                  
                  <div className="bg-accent/30 p-4 rounded-lg font-sans text-sm mb-4 border border-border/50">
                    <span className="font-semibold block mb-2 text-primary">First Message:</span>
                    {generatedAgent.first_message}
                  </div>

                  <a href="#" className="text-primary hover:underline font-sans text-sm inline-flex items-center gap-1">
                    Open the agent in Prompt Studio <ArrowUp className="h-3 w-3 rotate-45" />
                  </a>
                </div>
              )}
            </div>

            {/* Input box pinned to bottom in execution view */}
            <div className="w-full mt-auto pt-8">
              <div className="relative flex flex-col rounded-2xl border bg-card p-2 shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Help me build another agent..."
                  className="min-h-[60px] w-full resize-none bg-transparent p-3 text-sm focus:outline-none"
                  rows={2}
                  disabled={isLoading}
                />
                <div className="flex items-center justify-between px-2 pb-1 pt-2">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0"><Plus className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0"><Mic className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-full text-xs font-medium">Auto <ChevronDown className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-full text-xs font-medium bg-muted/50">GPT-4o <ChevronDown className="h-3 w-3" /></Button>
                    <Button size="sm" className="h-8 w-8 rounded-full p-0 transition-all" disabled={!prompt || isLoading} onClick={handleGenerate}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
