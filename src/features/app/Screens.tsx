import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity, AlertCircle, ArrowLeft, ArrowRight, AudioLines, BadgeCheck, BookOpen, Bot,
  CheckCircle2, ChevronRight, CircleHelp, Clock3, CloudDownload, ExternalLink, Download,
  HeartPulse, Hospital, Info, LocateFixed, LockKeyhole, MapPin, MapPinned, MessageCircle,
  Mic, Navigation, Phone, PhoneCall, Plus, Search, Send, Settings, ShieldCheck, Siren,
  Sparkles, Stethoscope, Trash2, UserRound, Users, Wifi, WifiOff, X, LoaderCircle,
} from 'lucide-react'
import type { AppPreferences, TrustedContact, UserProfile } from '../profile/profile.types'
import type { StoredChatMessage } from '../profile/storage'
import type { EmergencyDispatchResult } from '../emergency/emergencyService'
import { getContacts, normaliseContact } from '../profile/storage'
import { DEMO_CLINICS, type Clinic } from '../../data/clinics'
import { generateDemoReply } from '../ai/demoAssistant'
import { generateWithLocalGemma, isLocalGemmaLoaded } from '../ai/localModel'
import { mayNeedUrgentHelp } from '../safety/redFlags'
import { EMERGENCY_NUMBER } from '../../config'

export type ScreenName = 'home' | 'chat' | 'symptoms' | 'urgent' | 'clinics' | 'clinic-details' | 'contacts' | 'profile' | 'settings' | 'model' | 'guide' | 'location'

type Props = {
  profile: UserProfile
  updateProfile: (changes: Partial<UserProfile>) => void
  screen: ScreenName
  navigate: (screen: ScreenName) => void
  openChat: (prompt?: string) => void
  messages: StoredChatMessage[]
  setMessages: (updater: StoredChatMessage[] | ((current: StoredChatMessage[]) => StoredChatMessage[])) => void
  draftPrompt: string
  setDraftPrompt: (value: string) => void
  onEmergency: (reason?: string) => void
  emergencyStartedAt: number | null
  emergencyReason: string
  onRequestPractitioner: () => Promise<EmergencyDispatchResult>
  dispatchState: 'idle' | 'sending' | 'accepted' | 'not-configured' | 'failed'
  dispatchMessage: string
  selectedClinic: Clinic | null
  setSelectedClinic: (clinic: Clinic | null) => void
  modelReady: boolean
  modelLoading: boolean
  modelProgress: number
  modelStatus: string
  modelError: string
  onLoadModel: () => Promise<void>
  preferences: AppPreferences
  updatePreferences: (changes: Partial<AppPreferences>) => void
  onEditProfile: () => void
  onRestartOnboarding: () => void
  onClearChat: () => void
}

const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')
const contactList = (profile: UserProfile) => getContacts(profile)
const fmtTime = (time: number) => new Date(time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-2.5">
    <span className="grid h-10 w-10 place-items-center rounded-[15px] bg-forest text-cream shadow-sm"><HeartPulse size={22} strokeWidth={2.2} /></span>
    <span className={cn('font-extrabold tracking-[-0.05em] text-forest', compact ? 'text-xl' : 'text-[1.35rem]')}>Iranwo</span>
  </div>
}

function Orb({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dimension = size === 'lg' ? 'h-36 w-36' : size === 'sm' ? 'h-12 w-12' : 'h-20 w-20'
  return <div className={cn('relative isolate grid shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#d5eaca_0,#89c5a6_34%,#278b7a_65%,#145748_100%)] shadow-[inset_-9px_-12px_20px_rgba(11,59,48,.18),0_16px_35px_rgba(38,99,75,.18)]', dimension)} aria-label="Iranwo assistant orb" role="img">
    <span className="absolute left-[22%] top-[18%] h-6 w-3 rotate-[-35deg] rounded-full bg-white/70 blur-[1px]" />
    <span className="absolute left-[31%] top-[43%] h-2 w-2 rounded-full bg-forest/80" />
    <span className="absolute right-[31%] top-[43%] h-2 w-2 rounded-full bg-forest/80" />
    <span className="absolute top-[52%] h-3 w-6 rounded-b-full border-b-[2.5px] border-forest/80" />
    <span className="absolute inset-[-7px] rounded-full border border-sage/80" />
  </div>
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-[1.45rem] border border-line/90 bg-white/80 p-4 shadow-[0_5px_20px_rgba(30,66,49,.035)]', className)}>{children}</section>
}

function ActionButton({ children, onClick, variant = 'primary', disabled = false, className }: {
  children: ReactNode; onClick: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'quiet'; disabled?: boolean; className?: string
}) {
  const style = {
    primary: 'bg-forest text-white shadow-sm hover:bg-forest/90',
    secondary: 'border border-[#c8d6c7] bg-[#f1f5ed] text-forest hover:bg-[#e8efe2]',
    danger: 'bg-danger text-white shadow-sm hover:bg-[#b91f2b]',
    quiet: 'bg-transparent text-forest hover:bg-[#edf2e9]',
  }[variant]
  return <button type="button" disabled={disabled} onClick={onClick} className={cn('inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest/15 disabled:cursor-not-allowed disabled:opacity-40', style, className)}>{children}</button>
}

function PageHeading({ eyebrow, title, subtitle, onBack }: { eyebrow?: string; title: string; subtitle?: string; onBack?: () => void }) {
  return <div className="mb-5 mt-2">
    {onBack && <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-2 rounded-full p-2 pr-3 text-sm font-semibold text-muted transition hover:bg-sage/70"><ArrowLeft size={18} /> Back</button>}
    {eyebrow && <p className="text-[10px] font-extrabold uppercase tracking-[.19em] text-muted">{eyebrow}</p>}
    <h1 className="mt-1 text-[1.7rem] font-extrabold leading-tight tracking-[-.045em] text-ink">{title}</h1>
    {subtitle && <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p>}
  </div>
}

function Shell({ children, p, title, showNav = true }: { children: ReactNode; p: Props; title?: string; showNav?: boolean }) {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const yes = () => setOnline(true)
    const no = () => setOnline(false)
    window.addEventListener('online', yes)
    window.addEventListener('offline', no)
    return () => { window.removeEventListener('online', yes); window.removeEventListener('offline', no) }
  }, [])
  const tabs: { screen: ScreenName; label: string; icon: typeof HeartPulse }[] = [
    { screen: 'home', label: 'Home', icon: Activity }, { screen: 'chat', label: 'Assistant', icon: MessageCircle },
    { screen: 'clinics', label: 'Clinics', icon: Hospital }, { screen: 'profile', label: 'Profile', icon: UserRound },
  ]
  return <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_15%_0%,#f0f3e8_0,transparent_30%),#eaeadd] text-ink sm:px-4 sm:py-5">
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[470px] flex-col overflow-hidden bg-cream shadow-[0_18px_70px_rgba(35,64,47,.12)] sm:min-h-[calc(100dvh-2.5rem)] sm:rounded-[2rem] sm:border sm:border-white/70">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line/70 bg-cream/90 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <button type="button" onClick={() => p.navigate('home')} aria-label="Go home" className="rounded-2xl text-left"><Logo compact /></button>
        <div className="flex items-center gap-1.5">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold', online ? 'bg-[#e6f1e2] text-[#24633f]' : 'bg-[#f9e8da] text-[#99562a]')}>
            {online ? <Wifi size={12} /> : <WifiOff size={12} />}{online ? 'Online' : 'Offline'}
          </span>
          {p.screen !== 'urgent' && <button type="button" onClick={() => p.onEmergency()} aria-label="Emergency SOS" title="Emergency SOS" className="grid h-9 w-9 place-items-center rounded-full bg-[#c62832] text-white shadow-sm transition hover:bg-[#b91f2b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-danger/20"><Siren size={18} /></button>}
          <button type="button" onClick={() => p.navigate('settings')} aria-label="Settings" className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-sage/80"><Settings size={19} /></button>
        </div>
      </header>
      <main key={p.screen} className="flex-1 px-5 pb-6 pt-4 animate-in">
        {title && <h1 className="sr-only">{title}</h1>}
        {children}
      </main>
      {showNav && <nav aria-label="Main navigation" className="sticky bottom-0 z-20 grid grid-cols-4 border-t border-line/80 bg-white/90 px-3 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        {tabs.map((tab) => {
          const IconComponent = tab.icon
          const selected = p.screen === tab.screen || (tab.screen === 'profile' && p.screen === 'contacts')
          return <button type="button" key={tab.screen} onClick={() => p.navigate(tab.screen)} aria-current={selected ? 'page' : undefined} className={cn('flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-bold transition', selected ? 'text-forest' : 'text-[#829087] hover:bg-[#f1f4ed]')}>
            <span className={cn('grid h-8 w-12 place-items-center rounded-full transition', selected && 'bg-sage/80')}><IconComponent size={20} strokeWidth={selected ? 2.5 : 1.8} /></span>{tab.label}
          </button>
        })}
      </nav>}
    </div>
  </div>
}

function SmallIcon({ children, tone = 'sage' }: { children: ReactNode; tone?: 'sage' | 'red' | 'white' }) {
  return <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-[1.05rem]', tone === 'red' ? 'bg-[#fee7e5] text-danger' : tone === 'white' ? 'bg-white/15 text-white' : 'bg-sage/75 text-forest')}>{children}</span>
}

function FeatureLink({ icon, title, description, onClick, tone = 'sage' }: { icon: ReactNode; title: string; description: string; onClick: () => void; tone?: 'sage' | 'red' }) {
  return <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 rounded-[1.25rem] border border-line bg-white/75 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-[#c1d4be] hover:bg-white hover:shadow-[0_9px_22px_rgba(28,73,54,.07)]">
    <SmallIcon tone={tone}>{icon}</SmallIcon><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-ink">{title}</span><span className="mt-1 block text-xs leading-4 text-muted">{description}</span></span><ChevronRight size={18} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-forest" />
  </button>
}

export function DashboardScreen(p: Props) {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const onlineHandler = () => setOnline(true)
    const offlineHandler = () => setOnline(false)
    window.addEventListener('online', onlineHandler)
    window.addEventListener('offline', offlineHandler)
    return () => { window.removeEventListener('online', onlineHandler); window.removeEventListener('offline', offlineHandler) }
  }, [])
  const name = p.profile.firstName?.trim()
  const greeting = p.profile.language === 'pcm' ? `How you dey${name ? `, ${name}` : ''}?` : `${new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}${name ? `, ${name}` : ''}.`
  const quickSymptoms = ['Headache', 'Fever', 'Stomach pain', 'Cough']
  return <Shell p={p} title="Home dashboard">
    {!online && <div className="mb-3 flex items-start gap-2 rounded-xl border border-[#e8d6bb] bg-[#fff4e2] p-3 text-xs leading-5 text-[#8b5a2c]"><WifiOff size={15} className="mt-0.5 shrink-0" /><span><strong>You're offline.</strong> You can still open saved information. Local AI works only if the model was downloaded and loads successfully.</span></div>}
    <div className="relative overflow-hidden rounded-[1.8rem] bg-[linear-gradient(135deg,#edf3e6_0%,#f8f6ed_65%,#dbead9_100%)] p-5">
      <div className="absolute -right-12 -top-10 h-44 w-44 rounded-full bg-white/45 blur-2xl" />
      <div className="relative flex items-start gap-2"><div className="flex-1"><p className="text-sm font-bold text-[#517165]">Your health companion</p><h1 className="mt-2 text-[1.85rem] font-extrabold leading-[1.1] tracking-[-.05em] text-ink">{greeting}</h1><p className="mt-3 max-w-[14rem] text-sm leading-5 text-muted">How are you feeling today? Let's figure out your next step together.</p></div><div className="pt-2"><Orb size="md" /></div></div>
    </div>

    <section className="mt-5 rounded-[1.8rem] border border-[#efc2be] bg-[linear-gradient(140deg,#fff0ee,#fff8f3)] p-4 text-center shadow-[0_10px_35px_rgba(164,40,40,.06)]">
      <div className="flex items-center justify-center gap-2"><span className="rounded-full bg-[#ffe1de] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[.17em] text-danger">Always accessible</span></div>
      <button type="button" onClick={() => p.onEmergency()} aria-label="Start emergency help" className="sos-button group mx-auto mt-3 grid h-36 w-36 place-items-center rounded-full border-[7px] border-white/75 bg-[radial-gradient(circle_at_35%_25%,#ff7775_0%,#e23d40_38%,#bc202b_100%)] text-white shadow-[0_12px_30px_rgba(188,32,43,.28)] transition hover:scale-[1.035] active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-danger/25">
        <span className="flex flex-col items-center gap-1"><Siren size={31} strokeWidth={2.2} /><span className="text-[1.45rem] font-black tracking-[.09em]">SOS</span><span className="text-[10px] font-bold uppercase tracking-[.18em]">Tap for help</span></span>
      </button>
      <h2 className="mt-3 text-base font-extrabold text-[#702b2c]">Emergency Help</h2><p className="mx-auto mt-1 max-w-[17rem] text-xs leading-5 text-[#98605b]">Tap if you or someone nearby needs urgent medical assistance.</p>
    </section>

    <section className="mt-4 rounded-[1.5rem] bg-forest p-4 text-white shadow-[0_12px_32px_rgba(18,77,61,.17)]">
      <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/12"><MessageCircle size={24} /></span><div className="flex-1"><p className="font-extrabold">Talk to Iranwo</p><p className="mt-1 text-xs leading-5 text-white/75">Describe symptoms or ask a health question.</p></div><span className="rounded-full bg-white/10 p-2"><ArrowRight size={18} /></span></div>
      <ActionButton onClick={() => p.openChat()} variant="secondary" className="mt-4 w-full border-white/20 bg-white text-forest hover:bg-white/90">Start a conversation <ArrowRight size={16} /></ActionButton>
    </section>

    <section className="mt-5"><div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-muted">Start with a symptom</p><h2 className="mt-1 text-base font-extrabold text-ink">What's bothering you?</h2></div><button type="button" onClick={() => p.navigate('symptoms')} className="text-xs font-extrabold text-forest">See all</button></div>
      <div className="flex flex-wrap gap-2">{quickSymptoms.map((symptom) => <button type="button" key={symptom} onClick={() => p.openChat(`I'd like to talk about ${symptom.toLowerCase()}.`)} className="rounded-full border border-line bg-white/80 px-3.5 py-2.5 text-xs font-bold text-[#48665a] transition hover:border-[#a9c8a6] hover:bg-sage/60">{symptom}</button>)}<button type="button" onClick={() => p.navigate('symptoms')} className="inline-flex items-center gap-1 rounded-full border border-line bg-white/80 px-3.5 py-2.5 text-xs font-bold text-forest"><Plus size={14} /> Other</button></div>
    </section>

    <section className="mt-6"><p className="mb-3 text-[10px] font-extrabold uppercase tracking-[.17em] text-muted">Your shortcuts</p><div className="grid grid-cols-2 gap-2.5">
      <FeatureLink icon={<MapPin size={20} />} title="Find a clinic" description="Browse nearby care" onClick={() => p.navigate('clinics')} />
      <FeatureLink icon={<Users size={20} />} title="Trusted contacts" description={`${contactList(p.profile).length} saved contact${contactList(p.profile).length === 1 ? '' : 's'}`} onClick={() => p.navigate('contacts')} />
      <FeatureLink icon={<HeartPulse size={20} />} title="My health profile" description="Your health details" onClick={() => p.navigate('profile')} />
      <FeatureLink icon={<BookOpen size={20} />} title="Emergency guide" description="When and how to get help" onClick={() => p.navigate('guide')} />
    </div></section>

    {!p.modelReady && <button type="button" onClick={() => p.navigate('model')} className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-[#d5e2d0] bg-[#edf4e9] p-3.5 text-left transition hover:bg-[#e5efdf]"><SmallIcon><CloudDownload size={21} /></SmallIcon><span className="flex-1"><span className="block text-sm font-extrabold">Set up offline AI</span><span className="mt-1 block text-xs leading-5 text-muted">Load Gemma on this device to try local chat.</span></span><ChevronRight size={18} /></button>}
    <p className="mt-5 text-center text-[10px] leading-5 text-[#839084]">Iranwo provides health information, not a diagnosis or a substitute for emergency care.</p>
  </Shell>
}

export function ChatScreen(p: Props) {
  const [input, setInput] = useState('')
  const [replying, setReplying] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  useEffect(() => { if (p.draftPrompt) { setInput(p.draftPrompt); p.setDraftPrompt('') } }, [p.draftPrompt, p.setDraftPrompt])
  const messages = p.messages
  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    const text = input.trim()
    if (!text || replying) return
    const userMessage: StoredChatMessage = { id: crypto.randomUUID(), role: 'user', text, createdAt: Date.now() }
    const nextMessages = [...messages, userMessage]
    p.setMessages(nextMessages)
    setInput('')
    setVoiceError('')
    if (mayNeedUrgentHelp(text)) {
      p.setMessages([...nextMessages, { id: crypto.randomUUID(), role: 'assistant', text: 'This could be urgent. Please do not wait for a chatbot. Iranwo is opening Emergency Help so you can contact real-world support.', createdAt: Date.now() }])
      p.onEmergency(text)
      return
    }
    setReplying(true)
    try {
      let responseText: string
      if (p.modelReady && isLocalGemmaLoaded()) {
        responseText = await generateWithLocalGemma(nextMessages, p.profile)
      } else {
        responseText = (await generateDemoReply(text, p.profile)).text
      }
      p.setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: responseText, createdAt: Date.now() }])
    } catch {
      p.setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: 'I could not complete a response this time. You can try again. If you may be in danger, use SOS or seek urgent medical care; do not wait for this chat.', createdAt: Date.now() }])
    } finally { setReplying(false) }
  }
  const startVoice = () => {
    type SpeechResult = { transcript: string }
    type SpeechRecognitionResultLike = { 0: SpeechResult; isFinal: boolean }
    type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> }
    type SpeechRecognitionLike = { lang: string; interimResults: boolean; onresult: ((event: SpeechRecognitionEventLike) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void }
    type SpeechRecognitionConstructor = new () => SpeechRecognitionLike
    const browserWindow = window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }
    const Constructor = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition
    if (!Constructor) { setVoiceError('Voice input is not supported in this browser. You can type your message instead.'); return }
    try {
      const recognition = new Constructor()
      recognition.lang = p.profile.language === 'pcm' ? 'en-NG' : 'en-US'
      recognition.interimResults = false
      recognition.onresult = (event) => { const result = event.results[event.resultIndex]?.[0]?.transcript; if (result) setInput((old) => old ? `${old} ${result}` : result) }
      recognition.onerror = () => setVoiceError('Could not access voice input. Check your microphone permission or type your message.')
      recognition.start()
    } catch { setVoiceError('Voice input could not start. You can type your message instead.') }
  }
  const userHasMessages = messages.length > 0
  return <Shell p={p} title="Assistant" showNav>
    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-line bg-white/80 p-3"><Orb size="sm" /><div className="min-w-0 flex-1"><h1 className="font-extrabold text-ink">Talk to Iranwo</h1><p className="mt-0.5 text-xs text-muted">{p.modelReady ? 'Local Gemma model loaded' : 'Demo chat · local model not loaded'}</p></div><button type="button" onClick={() => { if (confirm('Clear conversation history on this device?')) p.onClearChat() }} aria-label="Clear chat" className="rounded-full p-2 text-muted hover:bg-sage/60"><Trash2 size={17} /></button></div>
    {!p.modelReady && <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#d9e4d3] bg-[#edf4e9] p-3 text-xs leading-5 text-[#49675a]"><Info size={16} className="mt-0.5 shrink-0" /><span>Demo mode is active, so replies are sample guidance rather than live AI answers. <button type="button" onClick={() => p.navigate('model')} className="font-extrabold underline">Set up offline AI</button>.</span></div>}
    <div className="flex-1 space-y-3 pb-4" aria-live="polite">
      {!userHasMessages && <div className="rounded-[1.5rem] rounded-tl-md border border-[#dbe6d6] bg-[#edf4e9] p-4"><div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.14em] text-forest"><Sparkles size={14} /> Iranwo</div><p className="mt-2 text-sm leading-6 text-ink">Hi{nameSuffix(p.profile.firstName)}. How are you feeling today? Tell me what is going on and I'll help you think through a next step.</p><p className="mt-2 text-[11px] leading-5 text-muted">I can't diagnose you or replace a healthcare professional. If this is an emergency, tap SOS now.</p></div>}
      {messages.map((message) => <div key={message.id} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}><div className={cn('max-w-[88%] rounded-[1.35rem] px-4 py-3', message.role === 'user' ? 'rounded-br-md bg-forest text-white' : 'rounded-bl-md border border-line bg-white text-ink')}><p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p><p className={cn('mt-2 text-right text-[10px]', message.role === 'user' ? 'text-white/60' : 'text-muted')}>{fmtTime(message.createdAt)}</p></div></div>)}
      {replying && <div className="flex items-center gap-2 text-xs font-semibold text-muted"><span className="flex gap-1"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-forest" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-forest [animation-delay:120ms]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-forest [animation-delay:240ms]" /></span>{p.modelReady ? 'Gemma is responding…' : 'Preparing demo reply…'}</div>}
    </div>
    {voiceError && <p className="mb-2 rounded-xl bg-[#fff0eb] p-2 text-xs text-danger" role="status">{voiceError}</p>}
    {!userHasMessages && <div className="mb-3 flex flex-wrap gap-2">{['I have a headache', 'I have a fever', 'I feel unwell'].map((prompt) => <button type="button" key={prompt} onClick={() => setInput(prompt)} className="rounded-full border border-line bg-white px-3 py-2 text-[11px] font-bold text-forest hover:bg-sage/60">{prompt}</button>)}</div>}
    <form onSubmit={submit} className="sticky bottom-0 mt-auto flex items-end gap-2 rounded-[1.5rem] border border-[#dce5d6] bg-white p-2 shadow-[0_6px_22px_rgba(18,67,49,.07)]">
      <textarea aria-label="Type your message" rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit() } }} placeholder={p.profile.language === 'pcm' ? 'Type your message...' : 'Tell me how you feel…'} className="max-h-28 min-h-11 flex-1 resize-y bg-transparent px-3 py-3 text-sm outline-none placeholder:text-[#98a29a]" />
      <button type="button" onClick={startVoice} aria-label="Use voice input" className="mb-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage/70 text-forest hover:bg-sage"><Mic size={18} /></button>
      <button type="submit" disabled={!input.trim() || replying} aria-label="Send message" className="mb-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest text-white transition hover:bg-forest/90 disabled:opacity-40"><Send size={17} /></button>
    </form>
    <p className="mt-2 text-center text-[10px] leading-4 text-muted">AI responses are not a diagnosis or a substitute for medical care. In an emergency, use SOS or contact emergency services.</p>
  </Shell>
}

function nameSuffix(name: string | undefined) { return name?.trim() ? ` ${name.trim()}` : '' }

const symptomOptions = [
  { name: 'Headache', icon: '◉', note: 'Pain in the head' }, { name: 'Fever', icon: '♨', note: 'Feeling hot or feverish' },
  { name: 'Stomach pain', icon: '◌', note: 'Abdominal discomfort' }, { name: 'Cough', icon: '≈', note: 'Cough or throat irritation' },
  { name: 'Body ache', icon: '♧', note: 'Muscle or body pain' }, { name: 'Nausea', icon: '◍', note: 'Feeling sick or queasy' },
  { name: 'Sore throat', icon: '◒', note: 'Pain or irritation in the throat' }, { name: 'Diarrhea', icon: '≋', note: 'Loose or frequent stool' },
  { name: 'Dizziness', icon: '✧', note: 'Feeling faint or unsteady' }, { name: 'Fatigue', icon: '☾', note: 'Unusual tiredness' },
]

export function SymptomScreen(p: Props) {
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [other, setOther] = useState('')
  const filtered = symptomOptions.filter((item) => `${item.name} ${item.note}`.toLowerCase().includes(search.toLowerCase()))
  const toggle = (symptom: string) => setSelected((current) => current.includes(symptom) ? current.filter((item) => item !== symptom) : [...current, symptom])
  return <Shell p={p} title="Choose symptoms"><PageHeading eyebrow="Let's understand" title="What are you feeling?" subtitle="Select one or more symptoms you'd like to discuss with Iranwo." onBack={() => p.navigate('home')} />
    <label className="flex items-center gap-2 rounded-2xl border border-line bg-white px-3.5 py-3"><Search size={18} className="text-muted" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search symptoms…" className="w-full bg-transparent text-sm outline-none" /></label>
    <div className="mt-4 grid grid-cols-2 gap-2.5">{filtered.map((item) => { const active = selected.includes(item.name); return <button type="button" key={item.name} onClick={() => toggle(item.name)} aria-pressed={active} className={cn('rounded-[1.3rem] border p-3.5 text-left transition', active ? 'border-forest bg-[#e7f1e3] ring-1 ring-forest/20' : 'border-line bg-white/85 hover:border-[#a9c9a6]')}><span className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sage/70 text-lg text-forest">{item.icon}</span>{active && <CheckCircle2 size={17} className="text-forest" />}</span><span className="mt-3 block text-sm font-extrabold">{item.name}</span><span className="mt-1 block text-[11px] leading-4 text-muted">{item.note}</span></button> })}</div>
    <label className="mt-4 block text-xs font-bold text-ink">Another symptom (optional)<input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Type a symptom" className="mt-2 w-full rounded-xl border border-line bg-white px-3.5 py-3 text-sm font-normal outline-none focus:border-forest" /></label>
    <div className="mt-auto pt-5"><ActionButton onClick={() => { const parts = [...selected, ...(other.trim() ? [other.trim()] : [])]; p.openChat(parts.length ? `I'd like to discuss these symptoms: ${parts.join(', ')}.` : '') }} className="w-full">Continue to assistant <ArrowRight size={16} /></ActionButton><button type="button" onClick={() => p.navigate('home')} className="mt-2 w-full rounded-full py-2.5 text-sm font-bold text-muted hover:bg-sage/50">Cancel</button></div>
  </Shell>
}

export function UrgentHelpScreen(p: Props) {
  const contacts = contactList(p.profile)
  const [retryingRequest, setRetryingRequest] = useState(false)
  const sendPractitionerRequest = async () => {
    if (retryingRequest || p.dispatchState === 'sending' || p.dispatchState === 'accepted') return
    setRetryingRequest(true)
    try { await p.onRequestPractitioner() } finally { setRetryingRequest(false) }
  }
  const reason = p.emergencyReason
  const time = p.emergencyStartedAt ? new Date(p.emergencyStartedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null
  const smsBody = encodeURIComponent(`I may need urgent medical help. Please contact me or help me reach medical care. ${reason ? `What I reported: ${reason}. ` : ''}Sent from Iranwo.`)
  return <Shell p={p} title="Emergency help" showNav={false}>
    <div className="mb-4 flex items-center justify-between"><button type="button" onClick={() => p.navigate('home')} aria-label="Back home" className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white"><ArrowLeft size={18} /></button><span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffebe8] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-danger"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" /> Emergency mode</span><button type="button" onClick={() => p.navigate('guide')} className="rounded-full p-2 text-muted"><CircleHelp size={19} /></button></div>
    <div className="rounded-[1.8rem] border border-[#f0c7c0] bg-[linear-gradient(150deg,#fff2ef,#fffaf5)] p-5">
      <div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#ffe0dc] text-danger"><Siren size={25} /></span><div><h1 className="text-xl font-black tracking-tight text-[#7e2527]">Get help now</h1><p className="mt-1 text-sm leading-5 text-[#8e5a55]">If someone may be in immediate danger, contact emergency services or get urgent medical care now.</p>{time && <p className="mt-2 text-[11px] font-bold text-[#9d5650]">Emergency flow opened at {time}</p>}</div></div>
      <a href={`tel:${EMERGENCY_NUMBER}`} className="mt-5 flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-danger px-4 py-3 text-sm font-extrabold text-white shadow-[0_10px_25px_rgba(186,33,43,.22)] transition hover:bg-[#b91f2b]"><PhoneCall size={19} /> Call emergency number {EMERGENCY_NUMBER}</a>
      <p className="mt-2 text-[10px] leading-4 text-[#946a64]">This opens your device's phone app. Availability and connection cannot be guaranteed by Iranwo.</p>
    </div>
    <Panel className="mt-4"><div className="flex items-start gap-3"><SmallIcon><Stethoscope size={20} /></SmallIcon><div className="min-w-0 flex-1"><h2 className="text-sm font-extrabold">Request practitioner assistance</h2><p className="mt-1 text-xs leading-5 text-muted">This sends the emergency start time and the optional description you entered, only if a real backend is configured. Your profile is not included.</p></div></div><ActionButton onClick={() => void sendPractitionerRequest()} disabled={retryingRequest || p.dispatchState === 'sending' || p.dispatchState === 'accepted'} variant={p.dispatchState === 'accepted' ? 'secondary' : 'primary'} className="mt-3 w-full">{retryingRequest || p.dispatchState === 'sending' ? <><LoaderCircle size={16} className="animate-spin" /> Sending request…</> : p.dispatchState === 'accepted' ? <><CheckCircle2 size={16} /> Request accepted</> : p.dispatchState === 'failed' || p.dispatchState === 'not-configured' ? <>Try request again <ArrowRight size={16} /></> : <>Request practitioner response <ArrowRight size={16} /></>}</ActionButton>{p.dispatchMessage && <div role="status" className={cn('mt-3 rounded-xl p-3 text-xs leading-5', p.dispatchState === 'accepted' ? 'bg-[#e7f2e4] text-forest' : p.dispatchState === 'sending' ? 'bg-[#edf4e9] text-forest' : 'bg-[#fff0eb] text-[#8a342d]')}>{p.dispatchMessage}</div>}</Panel>
    <div className="mt-5"><p className="mb-3 text-[10px] font-extrabold uppercase tracking-[.17em] text-muted">Other immediate options</p><div className="space-y-2.5">
      <FeatureLink icon={<Users size={20} />} title="Contact a trusted person" description={contacts.length ? `${contacts.length} contact${contacts.length === 1 ? '' : 's'} saved on this device` : 'Add or choose a trusted contact'} onClick={() => p.navigate('contacts')} tone="red" />
      <FeatureLink icon={<Hospital size={20} />} title="Find nearby medical care" description="Browse sample clinic records or search maps" onClick={() => p.navigate('clinics')} />
      <FeatureLink icon={<MapPinned size={20} />} title="Share my location" description="Get your coordinates, then choose what to share" onClick={() => p.navigate('location')} />
      <FeatureLink icon={<BookOpen size={20} />} title="Emergency guide" description="Simple guidance for common warning signs" onClick={() => p.navigate('guide')} />
    </div></div>
    {contacts.length > 0 && <div className="mt-5"><h2 className="mb-2 text-sm font-extrabold">Call or message a trusted contact</h2><div className="space-y-2">{contacts.slice(0, 2).map((contact) => <Panel key={contact.id ?? contact.phone} className="flex items-center gap-3 p-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-sage text-forest"><UserRound size={18} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold">{contact.name}</span><span className="block text-xs text-muted">{contact.relationship || 'Trusted contact'} · {contact.phone}</span></span><a aria-label={`Call ${contact.name}`} className="grid h-10 w-10 place-items-center rounded-full bg-forest text-white" href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}><Phone size={17} /></a><a aria-label={`Prepare SMS for ${contact.name}`} className="grid h-10 w-10 place-items-center rounded-full border border-line text-forest" href={`sms:${contact.phone.replace(/[^+\d]/g, '')}?body=${smsBody}`}><MessageCircle size={17} /></a></Panel>)}</div></div>}
    <div className="mt-5 rounded-2xl border border-line bg-white/75 p-3.5 text-xs leading-5 text-muted"><strong className="text-ink">Please note:</strong> Iranwo has not automatically contacted a clinic or your contacts. Choose a call or message action above. This prototype does not have a staffed emergency-response service.</div>
    <ActionButton onClick={() => p.navigate('home')} variant="quiet" className="mt-4 w-full">Return to home</ActionButton>
  </Shell>
}

export function ClinicsScreen(p: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const clinics = useMemo(() => DEMO_CLINICS.filter((clinic) => `${clinic.name} ${clinic.area} ${clinic.type}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'All' || clinic.type === filter)), [search, filter])
  const filters = ['All', 'Hospital', 'Primary care', 'Community clinic', 'Pharmacy']
  return <Shell p={p} title="Find a clinic"><PageHeading eyebrow="Care directory" title="Find medical care" subtitle="These sample entries are for layout testing only. Verify facilities and their details independently before travelling." />
    <label className="flex items-center gap-2 rounded-2xl border border-line bg-white px-3.5 py-3"><Search size={18} className="text-muted" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clinic or area…" className="w-full bg-transparent text-sm outline-none" /></label>
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{filters.map((item) => <button type="button" key={item} onClick={() => setFilter(item)} className={cn('shrink-0 rounded-full px-3.5 py-2 text-xs font-extrabold transition', filter === item ? 'bg-forest text-white' : 'border border-line bg-white text-muted hover:bg-sage/60')}>{item}</button>)}</div>
    <div className="mt-4 space-y-3">{clinics.map((clinic, index) => <button key={clinic.id} type="button" onClick={() => { p.setSelectedClinic(clinic); p.navigate('clinic-details') }} className="flex w-full gap-3 rounded-[1.45rem] border border-line bg-white/85 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-[#b7cfb2] hover:shadow-[0_8px_22px_rgba(24,74,53,.07)]"><span className={cn('grid h-14 w-14 shrink-0 place-items-center rounded-2xl', index % 2 ? 'bg-[#e4eee0]' : 'bg-[#edf0e4')}><Hospital size={24} className="text-forest" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-ink">{clinic.name}</span><span className="mt-1 block text-xs text-muted">{clinic.type} · {clinic.area}</span><span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#fff2df] px-2 py-1 text-[9px] font-extrabold uppercase tracking-[.1em] text-[#93622d]"><Info size={11} /> Demo record</span></span><ChevronRight size={19} className="mt-1 text-muted" /></button>)}{clinics.length === 0 && <Panel className="py-10 text-center"><Search size={25} className="mx-auto text-muted" /><p className="mt-3 font-extrabold">No matching demo clinics</p><p className="mt-1 text-xs text-muted">Try another search or filter.</p></Panel>}</div>
    <p className="mt-4 text-[10px] leading-5 text-muted">No live distances, opening status, ratings, or availability are provided. These entries are fictional demonstration data.</p>
  </Shell>
}

export function ClinicDetailsScreen(p: Props) {
  const clinic = p.selectedClinic
  if (!clinic) return <Shell p={p} title="Clinic details"><PageHeading title="No clinic selected" subtitle="Choose a clinic from the directory." onBack={() => p.navigate('clinics')} /><ActionButton onClick={() => p.navigate('clinics')}>Browse clinics</ActionButton></Shell>
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${clinic.name} ${clinic.area}`)}`
  return <Shell p={p} title="Clinic details"><PageHeading title={clinic.name} subtitle={`${clinic.type} · ${clinic.area}`} onBack={() => p.navigate('clinics')} />
    <div className="grid h-40 place-items-center overflow-hidden rounded-[1.6rem] bg-[radial-gradient(circle_at_30%_15%,#e8f1df,#c5dfcf_50%,#a5cbb7)]"><div className="grid h-20 w-20 place-items-center rounded-[1.5rem] bg-white/65 text-forest shadow-sm"><Hospital size={37} /></div></div>
    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#fff1dd] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.13em] text-[#91612d]"><Info size={13} /> Fictional demo listing</div>
    <Panel className="mt-4"><h2 className="font-extrabold">About this listing</h2><p className="mt-2 text-sm leading-6 text-muted">{clinic.description}</p><div className="mt-3 flex items-start gap-2 text-sm"><Clock3 size={17} className="mt-0.5 text-forest" /><span>{clinic.hours} <span className="block text-xs text-muted">Unverified demo text</span></span></div><div className="mt-3 flex items-start gap-2 text-sm"><MapPin size={17} className="mt-0.5 text-forest" /><span>{clinic.area}<span className="block text-xs text-muted">Area placeholder, not a verified address</span></span></div></Panel>
    <div className="mt-4 space-y-2"><a href={maps} target="_blank" rel="noreferrer" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-4 py-3 text-sm font-extrabold text-white">Search this name on Maps <ExternalLink size={16} /></a><ActionButton variant="secondary" onClick={() => p.navigate('urgent')} className="w-full">Back to emergency options</ActionButton></div>
  </Shell>
}

export function ContactsScreen(p: Props) {
  const contacts = contactList(p.profile)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<TrustedContact>({ name: '', relationship: '', phone: '' })
  const [error, setError] = useState('')
  const save = (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim() || form.phone.replace(/\D/g, '').length < 7) { setError('Enter a contact name and a valid phone number.'); return }
    const updated = [...contacts, normaliseContact(form)]
    p.updateProfile({ trustedContacts: updated, trustedContact: updated[0] })
    setForm({ name: '', relationship: '', phone: '' }); setError(''); setShowForm(false)
  }
  const remove = (contact: TrustedContact) => {
    if (!confirm(`Remove ${contact.name} from trusted contacts on this device?`)) return
    const updated = contacts.filter((item) => item.id !== contact.id && !(item.name === contact.name && item.phone === contact.phone))
    p.updateProfile({ trustedContacts: updated, trustedContact: updated[0] })
  }
  return <Shell p={p} title="Trusted contacts"><PageHeading eyebrow="Your support circle" title="Trusted contacts" subtitle="Save people you may want to contact when you need assistance. Iranwo will not silently call or message them." />
    <div className="flex items-center gap-3 rounded-2xl bg-[#eaf2e5] p-3.5"><SmallIcon><ShieldCheck size={21} /></SmallIcon><div><p className="text-sm font-extrabold">Your contacts stay on this device</p><p className="mt-1 text-xs leading-5 text-muted">Call or prepare an SMS only when you tap the action.</p></div></div>
    <div className="mt-4 space-y-3">{contacts.map((contact) => <Panel key={contact.id ?? `${contact.name}-${contact.phone}`} className="p-3.5"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-sage text-forest"><UserRound size={20} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold">{contact.name}</span><span className="mt-0.5 block text-xs text-muted">{contact.relationship || 'Trusted contact'}</span><span className="mt-1 block text-xs font-semibold text-[#466356]">{contact.phone}</span></span><button type="button" onClick={() => remove(contact)} aria-label={`Remove ${contact.name}`} className="rounded-full p-2 text-muted hover:bg-[#fff0eb] hover:text-danger"><Trash2 size={16} /></button></div><div className="mt-3 grid grid-cols-2 gap-2"><a href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`} className="flex min-h-10 items-center justify-center gap-2 rounded-full bg-forest px-3 text-xs font-extrabold text-white"><Phone size={15} /> Call</a><a href={`sms:${contact.phone.replace(/[^+\d]/g, '')}?body=${encodeURIComponent('I may need medical help. Please contact me as soon as possible.')}`} className="flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#c8d6c7] bg-[#f5f7f1] px-3 text-xs font-extrabold text-forest"><MessageCircle size={15} /> Prepare SMS</a></div></Panel>)}{contacts.length === 0 && <Panel className="py-8 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sage/70 text-forest"><Users size={25} /></div><h2 className="mt-3 font-extrabold">No contacts saved yet</h2><p className="mx-auto mt-1 max-w-xs text-sm leading-5 text-muted">Add someone you trust. This makes their details easier to reach during an emergency.</p></Panel>}</div>
    {!showForm ? <ActionButton onClick={() => setShowForm(true)} variant="secondary" className="mt-4 w-full"><Plus size={17} /> Add trusted contact</ActionButton> : <Panel className="mt-4"><div className="flex items-center justify-between"><h2 className="font-extrabold">New trusted contact</h2><button type="button" onClick={() => { setShowForm(false); setError('') }} aria-label="Close form"><X size={18} /></button></div><form id="contact-form" onSubmit={save} className="mt-3 space-y-3"><label className="block text-xs font-bold">Full name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-forest" placeholder="e.g. Amina Yusuf" /></label><label className="block text-xs font-bold">Relationship<select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-forest"><option value="">Choose optional relationship</option>{['Parent', 'Sibling', 'Partner', 'Friend', 'Relative', 'Neighbour', 'Other'].map((r) => <option key={r}>{r}</option>)}</select></label><label className="block text-xs font-bold">Phone number<input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-forest" placeholder="e.g. 080 1234 5678" /></label>{error && <p className="text-xs text-danger" role="alert">{error}</p>}<ActionButton onClick={() => { const formElement = document.querySelector<HTMLFormElement>('#contact-form'); formElement?.requestSubmit() }} className="w-full">Save contact</ActionButton><button id="contact-form-hidden-submit" type="submit" className="hidden" aria-hidden="true">Submit</button></form></Panel>}
    <ActionButton onClick={() => p.onEditProfile()} variant="quiet" className="mt-3 w-full">Edit other health information</ActionButton>
  </Shell>
}

export function ProfileScreen(p: Props) {
  const conditionText = [...(p.profile.conditions ?? []), p.profile.conditionOther].filter(Boolean).join(', ') || 'Not provided'
  const allergyText = p.profile.allergy === 'Yes — specify' ? p.profile.allergyText || 'Not specified' : p.profile.allergy || 'Not provided'
  const medicationText = p.profile.medication?.startsWith('Yes') ? p.profile.medicationText || 'Not specified' : p.profile.medication || 'Not provided'
  const historyText = [p.profile.symptomsText, p.profile.recurringText, p.profile.notes].filter(Boolean).join(' · ') || 'Not provided'
  const details = [
    { icon: <UserRound size={19} />, title: 'Personal information', value: [p.profile.firstName || 'Name not added', p.profile.age != null ? `${p.profile.age} years old` : '', p.profile.sex].filter(Boolean).join(' · ') },
    { icon: <HeartPulse size={19} />, title: 'Health conditions', value: conditionText },
    { icon: <ShieldCheck size={19} />, title: 'Allergies', value: allergyText },
    { icon: <Activity size={19} />, title: 'Current medication', value: medicationText },
    { icon: <BookOpen size={19} />, title: 'Symptoms and history', value: historyText },
    { icon: <Users size={19} />, title: 'Trusted contacts', value: `${contactList(p.profile).length} saved contact${contactList(p.profile).length === 1 ? '' : 's'}` },
  ]
  return <Shell p={p} title="Health profile"><PageHeading eyebrow="Your information" title="My health profile" subtitle="Review information you chose to save. It can help provide context but is not a verified medical record." />
    <Panel className="mb-4 flex items-center gap-3 bg-[linear-gradient(130deg,#e9f1e4,#fdfcf7)]"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-forest"><UserRound size={27} /></span><div className="flex-1"><p className="text-base font-extrabold">{p.profile.firstName || 'Your profile'}</p><p className="mt-1 text-xs text-muted">{p.profile.language === 'pcm' ? 'Nigerian Pidgin' : 'English'} · Stored on this device</p></div><BadgeCheck size={20} className="text-forest" /></Panel>
    <div className="space-y-2.5">{details.map((detail) => <Panel key={detail.title} className="flex items-start gap-3 p-3.5"><SmallIcon>{detail.icon}</SmallIcon><div className="min-w-0 flex-1"><p className="text-sm font-extrabold">{detail.title}</p><p className="mt-1 break-words text-xs leading-5 text-muted">{detail.value}</p></div></Panel>)}</div>
    <ActionButton onClick={p.onEditProfile} className="mt-4 w-full">Edit health profile <ArrowRight size={16} /></ActionButton><ActionButton onClick={() => p.navigate('contacts')} variant="secondary" className="mt-2 w-full">Manage trusted contacts</ActionButton>
    <p className="mt-4 text-[10px] leading-5 text-muted">This prototype stores information in browser localStorage, which is not encrypted by default. Use fictional data during testing.</p>
  </Shell>
}

export function SettingsScreen(p: Props) {
  return <Shell p={p} title="Settings"><PageHeading eyebrow="Preferences" title="Settings" subtitle="Manage your local app experience." />
    <div className="space-y-2.5">
      <button type="button" onClick={p.onEditProfile} className="flex w-full items-center gap-3 rounded-[1.25rem] border border-line bg-white/85 p-3.5 text-left"><SmallIcon><UserRound size={20} /></SmallIcon><span className="flex-1"><span className="block text-sm font-extrabold">Personal and health profile</span><span className="mt-1 block text-xs text-muted">Update your information</span></span><ChevronRight size={18} className="text-muted" /></button>
      <button type="button" onClick={() => p.navigate('model')} className="flex w-full items-center gap-3 rounded-[1.25rem] border border-line bg-white/85 p-3.5 text-left"><SmallIcon><Bot size={20} /></SmallIcon><span className="flex-1"><span className="block text-sm font-extrabold">Offline AI model</span><span className="mt-1 block text-xs text-muted">{p.modelReady ? 'Loaded for this app session' : 'Download or load Gemma locally'}</span></span><ChevronRight size={18} className="text-muted" /></button>
      <div className="flex items-center gap-3 rounded-[1.25rem] border border-line bg-white/85 p-3.5"><SmallIcon><Clock3 size={20} /></SmallIcon><span className="flex-1"><span className="block text-sm font-extrabold">Reminders</span><span className="mt-1 block text-xs text-muted">Preference only; no push service connected</span></span><button type="button" role="switch" aria-checked={p.preferences.reminders} onClick={() => p.updatePreferences({ reminders: !p.preferences.reminders })} className={cn('relative h-6 w-11 rounded-full transition', p.preferences.reminders ? 'bg-forest' : 'bg-[#cbd1c8]')}><span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white transition', p.preferences.reminders ? 'left-6' : 'left-1')} /></button></div>
      <div className="flex items-center gap-3 rounded-[1.25rem] border border-line bg-white/85 p-3.5"><SmallIcon><AudioLines size={20} /></SmallIcon><span className="flex-1"><span className="block text-sm font-extrabold">Voice input</span><span className="mt-1 block text-xs text-muted">Use browser speech recognition if supported</span></span><button type="button" role="switch" aria-checked={p.preferences.voiceInputEnabled} onClick={() => p.updatePreferences({ voiceInputEnabled: !p.preferences.voiceInputEnabled })} className={cn('relative h-6 w-11 rounded-full transition', p.preferences.voiceInputEnabled ? 'bg-forest' : 'bg-[#cbd1c8]')}><span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white transition', p.preferences.voiceInputEnabled ? 'left-6' : 'left-1')} /></button></div>
      <div className="flex items-start gap-3 rounded-[1.25rem] border border-line bg-white/85 p-3.5"><SmallIcon><Users size={20} /></SmallIcon><span className="flex-1"><span className="block text-sm font-extrabold">Allow trusted-contact alerts</span><span className="mt-1 block text-xs leading-5 text-muted">Opt in to include saved contact details in an emergency request when a real backend is configured. This setting cannot send anything on its own.</span></span><button type="button" role="switch" aria-checked={p.preferences.autoAlertTrustedContacts} onClick={() => p.updatePreferences({ autoAlertTrustedContacts: !p.preferences.autoAlertTrustedContacts })} className={cn('relative mt-1 h-6 w-11 shrink-0 rounded-full transition', p.preferences.autoAlertTrustedContacts ? 'bg-forest' : 'bg-[#cbd1c8]')}><span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white transition', p.preferences.autoAlertTrustedContacts ? 'left-6' : 'left-1')} /></button></div>
      <button type="button" onClick={() => p.navigate('guide')} className="flex w-full items-center gap-3 rounded-[1.25rem] border border-line bg-white/85 p-3.5 text-left"><SmallIcon><BookOpen size={20} /></SmallIcon><span className="flex-1"><span className="block text-sm font-extrabold">Emergency guide</span><span className="mt-1 block text-xs text-muted">General safety guidance</span></span><ChevronRight size={18} className="text-muted" /></button>
      <Panel><div className="flex items-center gap-3"><SmallIcon><LockKeyhole size={20} /></SmallIcon><div><h2 className="text-sm font-extrabold">Data and privacy</h2><p className="mt-1 text-xs leading-5 text-muted">Profile and chat data stay in this browser. They do not sync or get encrypted by this prototype.</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><ActionButton onClick={p.onClearChat} variant="secondary" className="px-3 text-xs"><Trash2 size={14} /> Clear chat</ActionButton><ActionButton onClick={() => { if (confirm('Delete the saved local profile and conversation from this browser? This cannot be undone.')) p.onRestartOnboarding() }} variant="quiet" className="px-3 text-xs"><Trash2 size={14} /> Reset app</ActionButton></div></Panel>
    </div>
  </Shell>
}

export function ModelSetupScreen(p: Props) {
  const [loadError, setLoadError] = useState('')
  const load = async () => { setLoadError(''); try { await p.onLoadModel() } catch (error) { setLoadError(error instanceof Error ? error.message : 'The model could not be loaded. Try a compatible browser or device.') } }
  const percent = Math.max(0, Math.min(100, p.modelProgress))
  return <Shell p={p} title="Offline AI"><PageHeading eyebrow="On-device assistant" title="Set up your AI" subtitle="Gemma runs locally after model files are downloaded. Initial setup is a large download, so Wi-Fi is recommended." onBack={() => p.navigate('settings')} />
    <div className="my-2 flex flex-col items-center rounded-[1.8rem] border border-[#d9e7d2] bg-[radial-gradient(circle_at_50%_0%,#e4f0dd,#f8f6ef_74%)] px-5 py-7 text-center"><Orb size="lg" /><h2 className="mt-5 text-xl font-extrabold">{p.modelReady ? 'Your local model is loaded' : p.modelLoading ? 'Preparing Gemma…' : 'Private, on-device chat'}</h2><p className="mt-2 max-w-xs text-sm leading-6 text-muted">{p.modelReady ? 'The model loaded in this app session. Compatibility and response quality still need testing.' : 'Model files download from Hugging Face when you start setup. Offline inference works only after loading succeeds and is cached.'}</p></div>
    <Panel className="mt-4"><div className="flex items-center justify-between gap-3"><h2 className="font-extrabold">Download and load status</h2><span className="text-xs font-extrabold text-forest">{p.modelReady ? 'Ready' : `${Math.round(percent)}%`}</span></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#e3e9dd]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#75a879,#155344)] transition-all duration-300" style={{ width: p.modelReady ? '100%' : `${percent}%` }} /></div><p className="mt-2 text-xs leading-5 text-muted">{p.modelStatus || (p.modelReady ? 'Loaded in memory' : 'Not loaded')}</p>{(loadError || p.modelError) && <div role="alert" className="mt-3 rounded-xl border border-[#efc8bd] bg-[#fff0eb] p-3 text-xs leading-5 text-danger">{loadError || p.modelError}</div>}
      <div className="mt-4 space-y-2"><ActionButton onClick={() => void load()} disabled={p.modelLoading || p.modelReady} className="w-full">{p.modelLoading ? <><LoaderCircle size={17} className="animate-spin" /> Loading model…</> : p.modelReady ? <><CheckCircle2 size={17} /> Model loaded</> : <><Download size={17} /> Download and load Gemma</>}</ActionButton><ActionButton onClick={() => p.openChat()} variant="secondary" className="w-full">Open assistant chat</ActionButton></div>
    </Panel>
    <div className="mt-4 rounded-2xl border border-line bg-white/70 p-3 text-xs leading-5 text-muted"><strong className="text-ink">Device compatibility:</strong> The Gemma 3 1B ONNX model is large and may exceed the available memory on some 4 GB phones. Loading can fail or be slow. Do not assume it is offline-ready until tested on the actual target device. See the model card for its Gemma terms and technical instructions.</div>
    <a href="https://huggingface.co/onnx-community/gemma-3-1b-it-ONNX" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-forest underline">Open model card <ExternalLink size={13} /></a>
  </Shell>
}

export function EmergencyGuideScreen(p: Props) {
  const [category, setCategory] = useState<'common' | 'urgent'>('urgent')
  const topics = category === 'urgent'
    ? [{ title: 'Severe breathing difficulty', description: 'Get emergency medical help immediately. Do not wait for an AI chat.' }, { title: 'Chest pain or sudden weakness', description: 'Treat sudden severe symptoms as urgent and seek immediate medical assessment.' }, { title: 'Unconsciousness, seizure, or severe bleeding', description: 'Call emergency services and follow their instructions. Ask someone nearby to help.' }]
    : [{ title: 'Mild headache or body ache', description: 'Describe when it started, severity, and other symptoms. Seek a clinician if it is severe, unusual, worsening, or persistent.' }, { title: 'Fever or stomach upset', description: 'Pay attention to hydration and other symptoms. Get medical advice for severe symptoms, dehydration, or worsening condition.' }, { title: 'Medication or allergy questions', description: 'Share the exact medicine or substance and contact a qualified healthcare professional when uncertain.' }]
  return <Shell p={p} title="Emergency guide"><PageHeading eyebrow="Health and safety" title="Know your next step" subtitle="General information only. This guide does not assess you or replace a clinician." onBack={() => p.navigate('home')} />
    <div className="grid grid-cols-2 rounded-full bg-[#e9ede3] p-1">{[{ id: 'urgent', label: 'Warning signs' }, { id: 'common', label: 'Common symptoms' }].map((item) => <button key={item.id} type="button" onClick={() => setCategory(item.id as 'common' | 'urgent')} className={cn('rounded-full px-3 py-3 text-xs font-extrabold transition', category === item.id ? 'bg-white text-forest shadow-sm' : 'text-muted')}>{item.label}</button>)}</div>
    {category === 'urgent' && <div className="mt-4 rounded-2xl border border-[#efc6bf] bg-[#fff0ed] p-4"><div className="flex gap-3"><AlertCircle className="shrink-0 text-danger" size={23} /><div><h2 className="font-extrabold text-[#7e2527]">Do not wait for Iranwo</h2><p className="mt-1 text-sm leading-5 text-[#8e514d]">If symptoms feel life-threatening or someone is in immediate danger, call emergency services or get urgent medical care.</p></div></div><ActionButton variant="danger" onClick={() => p.onEmergency('Urgent help requested from the emergency guide')} className="mt-4 w-full">Open Emergency Help <ArrowRight size={16} /></ActionButton></div>}
    <div className="mt-4 space-y-3">{topics.map((topic) => <Panel key={topic.title}><div className="flex gap-3"><SmallIcon tone={category === 'urgent' ? 'red' : 'sage'}>{category === 'urgent' ? <AlertCircle size={20} /> : <HeartPulse size={20} />}</SmallIcon><div><h2 className="text-sm font-extrabold">{topic.title}</h2><p className="mt-1 text-xs leading-5 text-muted">{topic.description}</p></div></div></Panel>)}</div>
    <div className="mt-4 rounded-2xl border border-line bg-white/70 p-3 text-xs leading-5 text-muted">These are general safety reminders, not a clinically validated triage protocol. If you are unsure, seek professional medical help.</div>
  </Shell>
}

export function LocationScreen(p: Props) {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [status, setStatus] = useState('Location has not been requested.')
  const [loading, setLoading] = useState(false)
  const getLocation = () => {
    if (!navigator.geolocation) { setStatus('This browser does not support location access. You can still call or message a trusted contact.'); return }
    setLoading(true); setStatus('Requesting location permission…')
    navigator.geolocation.getCurrentPosition((position) => {
      setCoords({ lat: position.coords.latitude, lon: position.coords.longitude })
      setStatus('Location found on this device. It has not been shared yet.')
      setLoading(false)
    }, (error) => {
      setStatus(error.code === error.PERMISSION_DENIED ? 'Location permission was denied. You can enable it in browser settings if you choose.' : 'Could not get your location. Try again or share a nearby landmark instead.')
      setLoading(false)
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 })
  }
  const mapsUrl = coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lon}` : ''
  const share = async () => {
    if (!coords) return
    const text = `My location for assistance: ${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}. Maps: ${mapsUrl}`
    if (navigator.share) { try { await navigator.share({ title: 'My location for assistance', text, url: mapsUrl }) } catch { /* User may cancel the share sheet. */ } }
    else if (contactList(p.profile)[0]) window.location.href = `sms:${contactList(p.profile)[0].phone.replace(/[^+\d]/g, '')}?body=${encodeURIComponent(text)}`
    else window.open(mapsUrl, '_blank', 'noopener,noreferrer')
  }
  return <Shell p={p} title="Share location" showNav={false}><PageHeading eyebrow="Optional location sharing" title="Help someone find you" subtitle="Your coordinates are requested only after you tap the button. They are not sent automatically." onBack={() => p.navigate('urgent')} />
    <div className="grid h-48 place-items-center overflow-hidden rounded-[1.6rem] border border-line bg-[radial-gradient(circle_at_50%_45%,#d6e8d2,#edf2e4_55%,#f7f6ef)]"><div className="relative grid h-28 w-28 place-items-center rounded-full bg-white/50"><span className="absolute inset-0 animate-ping rounded-full border border-[#a5c9a4]/60" /><span className="grid h-16 w-16 place-items-center rounded-full bg-forest text-white shadow-lg"><MapPin size={30} /></span></div></div>
    <Panel className="mt-4"><p className="text-sm font-extrabold">Location status</p><p className="mt-2 text-xs leading-5 text-muted">{status}</p>{coords && <div className="mt-3 rounded-xl bg-[#edf3e8] p-3 font-mono text-xs text-forest">{coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}</div>}</Panel>
    <div className="mt-4 space-y-2"><ActionButton onClick={getLocation} disabled={loading} className="w-full">{loading ? <><LoaderCircle size={17} className="animate-spin" /> Getting location…</> : <><LocateFixed size={17} /> Get my location</>}</ActionButton>{coords && <><ActionButton onClick={() => void share()} variant="secondary" className="w-full"><ExternalLink size={16} /> Choose how to share</ActionButton><a href={mapsUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-full py-2 text-xs font-bold text-forest underline">View on map <Navigation size={13} /></a></>}</div>
    <p className="mt-4 text-[10px] leading-5 text-muted">Location is sensitive. Review the recipient before sharing. In an emergency, do not delay calling for help while trying to share coordinates.</p>
  </Shell>
}
