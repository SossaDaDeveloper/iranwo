/**
 * Iranwo conversation-first safety screening.
 *
 * This module detects selected warning-sign phrases and returns a structured
 * prompt for the chat UI. It does NOT diagnose, determine that a person is safe,
 * call anyone, contact a clinic, or dispatch emergency services.
 *
 * The initial rule set is an English prototype with very limited Nigerian
 * Pidgin phrase coverage. It requires clinical review, language review, and
 * validation before use with real patients.
 */

export type SafetyLevel = 'emergency' | 'urgent' | 'clarify' | 'no_detected_red_flag'
export type SafetyLanguage = 'en' | 'pcm' | 'yo' | 'ha' | 'ig' | string
export type SafetyPromptKind = 'contact_now' | 'contact_soon' | 'clarify' | 'none'

export interface SafetyContext {
  language?: SafetyLanguage
}

export interface SafetyAssessment {
  level: SafetyLevel
  promptKind: SafetyPromptKind
  title: string
  userMessage: string
  matchedRuleIds: string[]
  coverage: 'prototype-en-pcm' | 'limited-language-coverage'
  /** No navigation or call is triggered automatically by this flag. */
  shouldOfferContactOptions: boolean
  note: string
}

type Rule = {
  id: string
  title: string
  level: 'emergency' | 'urgent'
  pattern: RegExp
  additionalAdvice?: string
}

const EMERGENCY_MESSAGE =
  "I'm concerned about what you've described. These symptoms may be a medical emergency. Please contact emergency services now rather than waiting for a reply here. I can show you emergency options and help you reach someone you trust. Choose an option below."

const URGENT_MESSAGE =
  "What you're describing should be assessed by a healthcare professional promptly. Would you like to open the emergency help options or contact someone you trust? If symptoms become severe or rapidly worsen, call your local emergency number immediately."

const emergencyRules: Rule[] = [
  {
    id: 'breathing_emergency',
    level: 'emergency',
    title: 'Possible severe breathing difficulty',
    pattern: /\b(?:cannot breathe|can't breathe|cant breathe|unable to breathe|not breathing|struggling to breathe|hard to breathe|finding it hard to breathe|finding it difficult to breathe|difficult to breathe|breathing is difficult|difficulty breathing|trouble breathing|shortness of breath|short of breath|can't catch my breath|cannot catch my breath|can't get enough air|cannot get enough air|gasping for air|choking|breath no dey|i no fit breathe|no fit breathe|blue lips|i dey choke)\b/i,
  },
  {
    id: 'loss_of_consciousness',
    level: 'emergency',
    title: 'Possible loss of consciousness',
    pattern: /\b(?:unconscious|unresponsive|not waking up|won't wake(?: up)?|will not wake(?: up)?|not responding|passed out and (?:won't|will not) wake)\b/i,
  },
  {
    id: 'stroke_warning_signs',
    level: 'emergency',
    title: 'Possible stroke warning signs',
    pattern: /\b(?:face droop(?:ing)?|face (?:is )?(?:suddenly )?drooping|face (?:has )?(?:suddenly )?drooped|one side of (?:the )?face (?:is )?(?:drooping|drooped)|facial droop|arm weakness on one side|one arm (?:is )?(?:suddenly )?(?:weak|numb)|one[- ]sided weakness|one side of (?:the )?body (?:is )?(?:weak|numb)|slurred speech|speech (?:is )?slurred|sudden(?:ly)? (?:can't|cannot) speak|sudden trouble speaking|sudden loss of vision)\b/i,
  },
  {
    id: 'severe_chest_pain',
    level: 'emergency',
    title: 'Chest pain with emergency warning signs',
    pattern: /\b(?:severe|crushing|squeezing|persistent|constant)\s+chest (?:pain|pressure)\b|\b(?:chest pain|chest pressure|tightness in (?:the|my|his|her|their) chest|my chest hurts|chest hurts|chest feels tight)\b.{0,90}\b(?:won't go away|will not go away|not going away|shortness of breath|difficulty breathing|trouble breathing|sweating|sweaty|nausea|vomiting|faint(?:ing)?|lightheaded|spreads? to|radiat(?:es|ing)|severe|crushing|squeezing)\b|\b(?:pain|pressure) in (?:the|my|his|her|their) chest.{0,70}\b(?:arm|jaw|neck|back)\b/i,
  },
  {
    id: 'seizure_emergency',
    level: 'emergency',
    title: 'Possible prolonged, repeated, or first seizure',
    pattern: /\b(?:currently having|having|is having|are having|experiencing)\s+(?:(?:a|their|his|her)\s+)?(?:seizure|fit|convulsion)\b|\b(?:having|is having|are having)\s+(?:their|his|her)\s+first\s+(?:ever\s+)?(?:seizure|fit)\b|\b(?:seizing|convulsing)\b|\b(?:just had|has just had|have just had)\s+(?:(?:my|their|his|her)\s+)?first\s+(?:ever\s+)?(?:seizure|fit)\b|\bfirst[- ]time seizure\b|\b(?:seizure|fit|convulsion).{0,45}\b(?:5|five|6|six|7|seven|8|eight|9|nine|10|ten|11|eleven|12|twelve|[1-9][0-9]+)\s+minutes?\b|\b(?:seizures?|fits?).{0,45}\b(?:without (?:waking|recovering|regaining consciousness)|one after another|repeated)\b/i,
    additionalAdvice: "Do not restrain someone having a seizure and do not put anything in their mouth. Stay nearby and follow emergency responders' instructions.",
  },
  {
    id: 'severe_bleeding',
    level: 'emergency',
    title: 'Possible severe bleeding',
    pattern: /\b(?:severe bleeding|bleeding heavily|bleeding a lot|wound.{0,40}won't stop bleeding|wound.{0,40}will not stop bleeding|bleeding won't stop|bleeding will not stop|bleeding does not stop|bleeding doesn't stop|uncontrollable bleeding|blood is spurting|spurting blood)\b/i,
  },
  {
    id: 'severe_allergic_reaction',
    level: 'emergency',
    title: 'Possible severe allergic reaction',
    pattern: /\b(?:anaphylaxis|anaphylactic reaction|throat (?:is )?closing|throat swelling|tongue swelling|tongue (?:is )?swelling)\b|\b(?:severe allergic reaction|face swelling|lip swelling|lips swelling).{0,65}\b(?:breath|breathe|breathing|swallow|swallowing|dizz(?:y|iness)|faint)\w*\b/i,
  },
  {
    id: 'poisoning_or_overdose',
    level: 'emergency',
    title: 'Possible poisoning or overdose',
    pattern: /\b(?:overdose|overdosed|poisoning|poisoned|swallowed (?:bleach|detergent|kerosene|pesticide|rat poison)|drank (?:bleach|kerosene|poison|pesticide)|took too many (?:pills|tablets|medications|medicine)|taken too much (?:medicine|medication))\b/i,
    additionalAdvice: 'Do not try to make the person vomit or give a home remedy. Keep the product or medicine container available for medical responders if safe.',
  },
  {
    id: 'immediate_self_harm_risk',
    level: 'emergency',
    title: 'Possible immediate self-harm risk',
    pattern: /\b(?:i am going to kill myself|i'm going to kill myself|im going to kill myself|i plan to kill myself|i want to end my life|i am about to hurt myself|i'm about to hurt myself|i have taken .*because i want to die|i took .*to kill myself|i am going to hurt myself now)\b/i,
    additionalAdvice: 'Please move away from anything you could use to hurt yourself, get near a trusted person now, and contact emergency services or go to the nearest emergency department. Do not stay alone if you may act on these thoughts.',
  },
  {
    id: 'major_injury',
    level: 'emergency',
    title: 'Possible major injury',
    pattern: /\b(?:serious head injury|major head injury|hit by a car|struck by a vehicle|stabbed|gunshot wound|shot in the|major road accident|serious road traffic accident|fell from (?:a )?height and|deep wound with heavy bleeding)\b/i,
  },
  {
    id: 'pregnancy_emergency',
    level: 'emergency',
    title: 'Possible pregnancy-related emergency',
    pattern: /\b(?:pregnant|just gave birth|recently gave birth|postpartum)\b.{0,80}\b(?:heavy bleeding|severe abdominal pain|seizure|convulsion|unconscious|severe headache with vision|can't breathe|cannot breathe)\b|\b(?:heavy bleeding|severe abdominal pain|seizure|convulsion|unconscious)\b.{0,80}\b(?:pregnant|just gave birth|recently gave birth|postpartum)\b/i,
  },
]

const urgentRules: Rule[] = [
  {
    id: 'chest_pain_needs_assessment',
    level: 'urgent',
    title: 'Chest pain needs prompt assessment',
    pattern: /\b(?:chest pain|pain in (?:the|my|his|her|their) chest|chest pressure|tightness in (?:the|my|his|her|their) chest|my chest hurts|chest hurts|chest feels tight)\b/i,
  },
  {
    id: 'fainting_needs_assessment',
    level: 'urgent',
    title: 'Fainting or a recent blackout needs assessment',
    pattern: /\b(?:i fainted|i have fainted|i passed out|i blacked out|fainted earlier|recent fainting|recently fainted)\b/i,
  },
  {
    id: 'recent_seizure_needs_assessment',
    level: 'urgent',
    title: 'A recent seizure needs medical assessment',
    pattern: /\b(?:i had a seizure|i had a fit|my seizure ended|my child had a seizure|my child had a fit)\b/i,
  },
]

const educationalQuestion =
  /^(?:what is|what are|define|definition of|explain|tell me about|meaning of|symptoms of|signs of|causes of|how does|for school|homework|studying)\b/i

const clearCurrentSituation =
  /\b(?:i am|i'm|im|i have|i had|my|we are|my mum|my mom|my dad|my child|my son|my daughter|my friend|my partner|my wife|my husband|someone is (?:currently |right now )|somebody is (?:currently |right now )|right now|currently|just happened|happening now|help them now|i took|i swallowed|i drank|i overdosed|i fainted|i have fainted|i passed out|i blacked out|i had a seizure|i had a fit|my seizure|my child had a seizure|my child had a fit)\b/i

function normalize(text: string): string {
  return String(text ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\bi'm\b/g, 'i am')
    .replace(/\bim\b/g, 'i am')
    .replace(/\s+/g, ' ')
    .trim()
}

function isNegatedMention(text: string, matchIndex: number): boolean {
  const clauseStart = Math.max(
    text.lastIndexOf('.', matchIndex - 1),
    text.lastIndexOf('!', matchIndex - 1),
    text.lastIndexOf('?', matchIndex - 1),
    text.lastIndexOf(';', matchIndex - 1),
    text.lastIndexOf('\n', matchIndex - 1),
  ) + 1
  const prefix = text.slice(clauseStart, matchIndex).trimEnd()
  return /\b(?:no|not|never|without|deny|denies|don't|dont|do not|doesn't|doesnt|does not|didn't|didnt|did not|isn't|isnt|is not|aren't|arent|are not|am not)\b(?:\s+(?:currently|experiencing|having|feeling|any|a|an|the|have|has|showing|reporting|longer|suffering|getting|much))?\s*$/i.test(prefix)
}

function findMatches(text: string, rules: Rule[]): Rule[] {
  return rules.filter(rule => {
    const match = rule.pattern.exec(text)
    return Boolean(match && !isNegatedMention(text, match.index))
  })
}

function coverageFor(language?: SafetyLanguage): SafetyAssessment['coverage'] {
  return !language || language === 'en' || language === 'pcm'
    ? 'prototype-en-pcm'
    : 'limited-language-coverage'
}

function coverageNote(coverage: SafetyAssessment['coverage']): string {
  return coverage === 'limited-language-coverage'
    ? 'Safety phrases for this selected language have not been validated. A missing match must not be interpreted as reassurance.'
    : 'This is a prototype warning-sign screen, not a diagnosis or a validated clinical triage result.'
}

/**
 * Screens one user-authored message before it reaches the AI model.
 * Educational questions are not treated as current emergencies. If a warning
 * phrase appears without enough context to know whether it is happening now,
 * the app asks the user to clarify instead of assuming.
 */
export function assessSafetyMessage(input: string, context: SafetyContext = {}): SafetyAssessment {
  const text = normalize(input)
  const coverage = coverageFor(context.language)

  const empty: SafetyAssessment = {
    level: 'no_detected_red_flag',
    promptKind: 'none',
    title: 'No recognized warning-sign pattern',
    userMessage: '',
    matchedRuleIds: [],
    coverage,
    shouldOfferContactOptions: false,
    note: coverageNote(coverage),
  }

  if (!text) return empty

  const emergencyMatches = findMatches(text, emergencyRules)
  const urgentMatches = findMatches(text, urgentRules)
  const matches = emergencyMatches.length ? emergencyMatches : urgentMatches
  if (!matches.length) return empty

  // Educational prompts such as "What are the symptoms of a stroke?" should
  // receive general information, not an automatic emergency-contact prompt.
  if (educationalQuestion.test(text) && !clearCurrentSituation.test(text)) return empty

  const hypotheticalQuestion = /^(?:what if|what should i do if|what do i do if|how would i help|what happens if)\b/i.test(text)
  const explicitNow = /\b(?:right now|currently|just happened|happening now|help them now)\b/i.test(text)
  const directEmergencyStatement = /^(?:i )?(?:cannot breathe|can't breathe|cant breathe|unable to breathe|not breathing|unconscious|unresponsive|gasping for air|breath no dey|i no fit breathe|no fit breathe)\b/i.test(text)
  const isCurrent = explicitNow || directEmergencyStatement || (!hypotheticalQuestion && clearCurrentSituation.test(text))

  if (!isCurrent) {
    const selected = matches[0]
    return {
      level: 'clarify',
      promptKind: 'clarify',
      title: selected.title,
      userMessage: `You mentioned ${selected.title.toLowerCase()}. Is this happening to you or someone near you right now, or are you asking generally?`,
      matchedRuleIds: matches.map(rule => rule.id),
      coverage,
      shouldOfferContactOptions: false,
      note: 'The message mentions a warning sign, but the context does not establish that it is happening now.',
    }
  }

  if (emergencyMatches.length) {
    const selected = emergencyMatches[0]
    return {
      level: 'emergency',
      promptKind: 'contact_now',
      title: selected.title,
      userMessage: [EMERGENCY_MESSAGE, selected.additionalAdvice].filter(Boolean).join(' '),
      matchedRuleIds: emergencyMatches.map(rule => rule.id),
      coverage,
      shouldOfferContactOptions: true,
      note: coverageNote(coverage),
    }
  }

  const selected = urgentMatches[0]
  return {
    level: 'urgent',
    promptKind: 'contact_soon',
    title: selected.title,
    userMessage: URGENT_MESSAGE,
    matchedRuleIds: urgentMatches.map(rule => rule.id),
    coverage,
    shouldOfferContactOptions: true,
    note: coverageNote(coverage),
  }
}

/** Convert an ambiguous mention into an emergency contact prompt only after the user confirms it is happening now. */
export function confirmCurrentEmergency(assessment: SafetyAssessment): SafetyAssessment {
  if (assessment.level !== 'clarify') return assessment
  return {
    ...assessment,
    level: 'emergency',
    promptKind: 'contact_now',
    userMessage: EMERGENCY_MESSAGE,
    shouldOfferContactOptions: true,
    note: 'The user confirmed that the warning-sign situation is happening now. This remains a precautionary prompt, not a diagnosis.',
  }
}

/** Used when a user deliberately opens SOS from outside the chat. */
export function createManualSOSAssessment(): SafetyAssessment {
  return {
    level: 'emergency',
    promptKind: 'contact_now',
    title: 'You opened SOS',
    userMessage: EMERGENCY_MESSAGE,
    matchedRuleIds: ['manual_sos'],
    coverage: 'prototype-en-pcm',
    shouldOfferContactOptions: true,
    note: 'The user opened SOS manually. No automatic call or notification has been sent.',
  }
}

/** Used when the user clarifies that an ambiguous message was only a general question. */
export function dismissClarification(assessment: SafetyAssessment): SafetyAssessment {
  return {
    ...assessment,
    level: 'no_detected_red_flag',
    promptKind: 'none',
    title: 'General information request',
    userMessage: 'Thanks for clarifying. I can explain the topic generally. If this starts happening to you or someone nearby, please seek immediate help for severe or worsening symptoms.',
    shouldOfferContactOptions: false,
    note: 'The user clarified that the warning-sign mention was not describing a current situation.',
  }
}
