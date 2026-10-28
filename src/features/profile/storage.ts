import type { AppPreferences, UserProfile, TrustedContact } from './profile.types'

export const STORAGE_KEYS = {
  profile: 'iranwo-profile-v2',
  messages: 'iranwo-chat-v2',
  preferences: 'iranwo-preferences-v1',
  lastEmergency: 'iranwo-last-emergency-v1',
} as const

export const DEFAULT_PROFILE: UserProfile = {
  onboardingComplete: false,
  firstName: '',
  age: undefined,
  sex: '',
  language: 'en',
  conditions: [],
  conditionOther: '',
  allergy: '',
  allergyText: '',
  medication: '',
  medicationText: '',
  symptomsNow: '',
  symptomsText: '',
  recurring: '',
  recurringText: '',
  notes: '',
  trustedContact: undefined,
  trustedContacts: [],
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  reminders: false,
  voiceInputEnabled: true,
  autoAlertTrustedContacts: false,
}

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function loadProfile(): UserProfile {
  const earlierProfile = safeRead<Partial<UserProfile>>('iranwo-profile-v1', {})
  const current = safeRead<Partial<UserProfile>>(STORAGE_KEYS.profile, earlierProfile)
  // Migrate profiles saved by the earlier single-contact prototype.
  const legacyContact = current.trustedContact
  const trustedContacts = current.trustedContacts?.length
    ? current.trustedContacts
    : legacyContact
      ? [{ ...legacyContact, id: legacyContact.id ?? crypto.randomUUID() }]
      : []
  return {
    ...DEFAULT_PROFILE,
    ...current,
    conditions: Array.isArray(current.conditions) ? current.conditions : [],
    trustedContacts,
    trustedContact: legacyContact ?? trustedContacts[0],
  }
}

export function saveProfile(profile: UserProfile): void {
  try {
    const contacts = profile.trustedContacts?.length ? profile.trustedContacts : (profile.trustedContact ? [profile.trustedContact] : [])
    window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify({
      ...profile,
      trustedContacts: contacts,
      trustedContact: contacts[0],
    }))
  } catch {
    // Storage can be disabled or full; the current app session remains usable.
  }
}

export type StoredChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: number
}

export function loadMessages(): StoredChatMessage[] {
  const earlier = safeRead<Array<StoredChatMessage & { time?: string }>>('iranwo-chat-v1', [])
  const rows = safeRead<Array<StoredChatMessage & { time?: string }>>(STORAGE_KEYS.messages, earlier)
  return Array.isArray(rows) ? rows.filter((row) => row && typeof row.text === 'string').map((row) => ({
    id: row.id || crypto.randomUUID(),
    role: row.role === 'user' ? 'user' : 'assistant',
    text: row.text,
    createdAt: typeof row.createdAt === 'number' ? row.createdAt : row.time ? (Date.parse(row.time) || Date.now()) : Date.now(),
  })) : []
}

export function saveMessages(messages: StoredChatMessage[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages.slice(-60)))
  } catch {
    // Never block the conversation if local storage is unavailable.
  }
}

export function loadPreferences(): AppPreferences {
  return { ...DEFAULT_PREFERENCES, ...safeRead<Partial<AppPreferences>>(STORAGE_KEYS.preferences, {}) }
}

export function savePreferences(preferences: AppPreferences): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(preferences))
  } catch {
    // Preferences will persist for this session only when storage is unavailable.
  }
}

export function getContacts(profile: UserProfile): TrustedContact[] {
  const contacts = profile.trustedContacts?.length
    ? profile.trustedContacts
    : profile.trustedContact
      ? [profile.trustedContact]
      : []
  return contacts.map((contact) => ({ ...contact, id: contact.id ?? `${contact.name}-${contact.phone}` }))
}

export function normaliseContact(contact: TrustedContact): TrustedContact {
  return {
    ...contact,
    id: contact.id ?? crypto.randomUUID(),
    name: contact.name.trim(),
    phone: contact.phone.trim(),
    relationship: contact.relationship.trim(),
  }
}
