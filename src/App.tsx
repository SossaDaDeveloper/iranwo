import { useEffect, useState } from 'react'
import WelcomeStep from './components/onboarding/WelcomeStep'
import LanguageStep from './components/onboarding/LanguageStep'
import PersonalInfoStep from './components/onboarding/PersonalInfoStep'
import HealthHistoryStep from './components/onboarding/HealthHistoryStep'
import SymptomsStep from './components/onboarding/SymptomsStep'
import TrustedContactStep from './components/onboarding/TrustedContactStep'
import ReviewStep from './components/onboarding/ReviewStep'
import CompleteStep from './components/onboarding/CompleteStep'
import type { AppPreferences, UserProfile } from './features/profile/profile.types'
import { DEFAULT_PROFILE, loadMessages, loadPreferences, loadProfile, saveMessages, savePreferences, saveProfile, STORAGE_KEYS, type StoredChatMessage } from './features/profile/storage'
import { loadLocalGemma, type ModelProgress } from './features/ai/localModel'
import { requestPractitionerHelp, type EmergencyDispatchResult } from './features/emergency/emergencyService'
import { DashboardScreen, ChatScreen, SymptomScreen, UrgentHelpScreen, ClinicsScreen, ClinicDetailsScreen, ContactsScreen, ProfileScreen, SettingsScreen, ModelSetupScreen, EmergencyGuideScreen, LocationScreen, type ScreenName } from './features/app/Screens'
import type { Clinic } from './data/clinics'
import { getContacts } from './features/profile/storage';
import './App.css';

export default function App() {
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile())
  const [step, setStep] = useState(profile.onboardingComplete ? 8 : 0)
  const [screen, setScreen] = useState<ScreenName>('home')
  const [editing, setEditing] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [returnScreen, setReturnScreen] = useState<ScreenName>('profile')
  const [emergencyBypass, setEmergencyBypass] = useState(false)
  const [messages, setMessages] = useState<StoredChatMessage[]>(() => loadMessages())
  const [draftPrompt, setDraftPrompt] = useState('')
  const [preferences, setPreferences] = useState<AppPreferences>(() => loadPreferences())
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null)
  const [emergencyReason, setEmergencyReason] = useState('')
  const [emergencyStartedAt, setEmergencyStartedAt] = useState<number | null>(() => {
    try { const raw = localStorage.getItem(STORAGE_KEYS.lastEmergency); return raw ? Number(raw) : null } catch { return null }
  })
  const [modelReady, setModelReady] = useState(false)
  const [modelLoading, setModelLoading] = useState(false)
  const [modelProgress, setModelProgress] = useState(0)
  const [modelStatus, setModelStatus] = useState('Model not loaded in this session')
  const [modelError, setModelError] = useState('')
  const [dispatchState, setDispatchState] = useState<'idle' | 'sending' | 'accepted' | 'not-configured' | 'failed'>('idle')
  const [dispatchMessage, setDispatchMessage] = useState('')

  useEffect(() => { saveProfile(profile) }, [profile])
  useEffect(() => { saveMessages(messages) }, [messages])
  useEffect(() => { savePreferences(preferences) }, [preferences])

  const updateProfile = (changes: Partial<UserProfile>) => setProfile((current) => {
    const updated = { ...current, ...changes }
    if (changes.trustedContacts) updated.trustedContact = changes.trustedContacts[0]
    return updated
  })

  const next = () => {
    if (editMode) {
      if (step === 6) {
        setEditMode(false)
        setEditing(false)
        setStep(8)
        setScreen(returnScreen)
      } else {
        setEditing(false)
        setStep(6)
      }
      return
    }
    setStep((current) => Math.min(current + 1, 8))
  }

  const back = () => {
    if (editMode) {
      if (step === 6) {
        setEditMode(false)
        setEditing(false)
        setStep(8)
        setScreen(returnScreen)
      } else {
        setEditing(false)
        setStep(6)
      }
      return
    }
    setStep((current) => Math.max(current - 1, 0))
  }

  const goTo = (target: number) => {
    if (target >= 1 && target <= 5) {
      setEditMode(true)
      setEditing(true)
      setStep(target)
    }
  }

  const onEditProfile = () => {
    setReturnScreen(screen)
    setEditMode(true)
    setEditing(false)
    setStep(6)
  }

  const onRestartOnboarding = () => {
    setProfile({ ...DEFAULT_PROFILE, conditions: [], trustedContacts: [] })
    setMessages([])
    setStep(0)
    setEditing(false)
    setEditMode(false)
    setScreen('home')
    try {
      localStorage.removeItem(STORAGE_KEYS.lastEmergency)
      localStorage.removeItem('iranwo-emergency-reason')
    } catch { /* Ignore blocked storage. */ }
    setEmergencyStartedAt(null)
    setEmergencyReason('')
    setDispatchState('idle')
    setDispatchMessage('')
    setEmergencyBypass(false)
  }

  const openChat = (prompt = '') => {
    setDraftPrompt(prompt)
    setScreen('chat')
  }

  const navigate = (target: ScreenName) => {
    if (emergencyBypass && target === 'home') {
      setEmergencyBypass(false)
      setScreen('home')
      return
    }
    setScreen(target)
  }

  const updatePreferences = (changes: Partial<AppPreferences>) => setPreferences((current) => ({ ...current, ...changes }))

  const dispatchPractitionerRequest = async (startedAt: number, reason: string): Promise<EmergencyDispatchResult> => {
    setDispatchState('sending')
    setDispatchMessage('Checking the practitioner service connection…')
    const savedContacts = preferences.autoAlertTrustedContacts
      ? getContacts(profile).map(({ name, relationship, phone }) => ({ name, relationship, phone }))
      : undefined
    const result = await requestPractitionerHelp({
      startedAt,
      ...(reason.trim() ? { selfReportedReason: reason.trim() } : {}),
      ...(savedContacts?.length ? { trustedContacts: savedContacts } : {}),
    })
    setDispatchState(result.status)
    setDispatchMessage(result.message)
    return result
  }

  const onEmergency = (reason?: string) => {
    setEmergencyBypass(step < 8)
    const started = Date.now()
    const incidentReason = reason ?? ''
    setEmergencyStartedAt(started)
    setEmergencyReason(incidentReason)
    try {
      localStorage.setItem(STORAGE_KEYS.lastEmergency, String(started))
      if (incidentReason) localStorage.setItem('iranwo-emergency-reason', incidentReason)
      else localStorage.removeItem('iranwo-emergency-reason')
    } catch { /* Emergency UI must still open if storage fails. */ }
    setScreen('urgent')
    // This only reaches a service if a real endpoint is configured. The screen still opens immediately.
    void dispatchPractitionerRequest(started, incidentReason)
  }

  const onRequestPractitioner = (): Promise<EmergencyDispatchResult> => dispatchPractitionerRequest(
    emergencyStartedAt ?? Date.now(), emergencyReason,
  )

  const onLoadModel = async () => {
    setModelLoading(true)
    setModelError('')
    setModelProgress(0)
    setModelStatus('Starting model loader…')
    try {
      await loadLocalGemma((progress: ModelProgress) => {
        setModelProgress(progress.progress)
        setModelStatus(progress.file ? `${progress.status}: ${progress.file}` : progress.status)
      })
      setModelReady(true)
      setModelProgress(100)
      setModelStatus('Gemma loaded in memory for this app session.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown model-loading error.'
      setModelError(message)
      setModelStatus('Model could not be loaded. Review compatibility and browser support.')
      throw error
    } finally { setModelLoading(false) }
  }

  const shared = { profile, update: updateProfile, next, back, goTo, editing: editing || (editMode && step === 6), reset: onRestartOnboarding, onEmergency }
  if (step < 8 && !emergencyBypass) {
    switch (step) {
      case 0: return <WelcomeStep {...shared} />
      case 1: return <LanguageStep {...shared} />
      case 2: return <PersonalInfoStep {...shared} />
      case 3: return <HealthHistoryStep {...shared} />
      case 4: return <SymptomsStep {...shared} />
      case 5: return <TrustedContactStep {...shared} />
      case 6: return <ReviewStep {...shared} />
      case 7: return <CompleteStep {...shared} />
      default: return null
    }
  }

  const props = {
    profile, updateProfile, screen, navigate, openChat, messages, setMessages,
    draftPrompt, setDraftPrompt, onEmergency, emergencyStartedAt, emergencyReason, onRequestPractitioner, dispatchState, dispatchMessage, selectedClinic,
    setSelectedClinic, modelReady, modelLoading, modelProgress, modelStatus, modelError,
    onLoadModel, preferences, updatePreferences, onEditProfile, onRestartOnboarding,
    onClearChat: () => setMessages([]),
  }
  switch (screen) {
    case 'chat': return <ChatScreen {...props} />
    case 'symptoms': return <SymptomScreen {...props} />
    case 'urgent': return <UrgentHelpScreen {...props} />
    case 'clinics': return <ClinicsScreen {...props} />
    case 'clinic-details': return <ClinicDetailsScreen {...props} />
    case 'contacts': return <ContactsScreen {...props} />
    case 'profile': return <ProfileScreen {...props} />
    case 'settings': return <SettingsScreen {...props} />
    case 'model': return <ModelSetupScreen {...props} />
    case 'guide': return <EmergencyGuideScreen {...props} />
    case 'location': return <LocationScreen {...props} />
    default: return <DashboardScreen {...props} />
  }
}
