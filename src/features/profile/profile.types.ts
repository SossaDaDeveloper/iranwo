export type Language = 'en' | 'pcm'

export type TrustedContact = {
  id?: string
  name: string
  relationship: string
  phone: string
}

export type UserProfile = {
  onboardingComplete: boolean
  firstName: string
  age?: number
  sex: string
  language: Language
  conditions: string[]
  conditionOther: string
  allergy: string
  allergyText: string
  medication: string
  medicationText: string
  symptomsNow: string
  symptomsText: string
  recurring: string
  recurringText: string
  notes: string
  trustedContact?: TrustedContact
  trustedContacts?: TrustedContact[]
}

export type AppPreferences = {
  reminders: boolean
  voiceInputEnabled: boolean
  autoAlertTrustedContacts: boolean
}
