/**
 * Small keyword safety net for the prototype. This is NOT a validated triage system.
 * It is only used to surface an urgent-help route; it must not be used to rule out danger.
 */
const RED_FLAG_PATTERNS: RegExp[] = [
  /chest pain|chest pressure|tight chest/i,
  /can't breathe|cannot breathe|difficulty breathing|trouble breathing|shortness of breath|gasping/i,
  /unconscious|not waking|passed out|fainted|collapse/i,
  /severe bleeding|heavy bleeding|won't stop bleeding/i,
  /seizure|convulsion/i,
  /stroke|face droop|slurred speech|sudden weakness/i,
  /choking|poison(?:ed|ing)?|overdose/i,
  /suicid(?:e|al)|want to kill myself|self harm/i,
  /breath no dey|i no fit breathe|i dey faint/i,
]

export function mayNeedUrgentHelp(text: string): boolean {
  return RED_FLAG_PATTERNS.some((pattern) => pattern.test(text))
}

export const URGENT_GUIDANCE = [
  'If someone may be in immediate danger, call your local emergency number now.',
  'Do not wait for an AI response or finish the chat before seeking urgent care.',
  'If it is safe to do so, ask someone nearby to stay with the person while help is arranged.',
]
