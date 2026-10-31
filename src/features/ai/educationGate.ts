/**
 * Conservative allow-list for Google AI Studio experiments inside Iranwo.
 * Google API use here is restricted to general, non-personalized education.
 * This deliberately blocks symptom stories and requests for individual advice.
 */
const EDUCATION_OPENING = /^(?:what is|what are|define|definition of|explain|meaning of|how does|what does|what causes|causes of|symptoms of|signs of|difference between|compare|describe|what happens during|what is the difference between)\b/i

const PERSONAL_REFERENCE = /\b(?:i|i'm|im|me|my|mine|we|us|our|ours|you|your|yours|he|she|they|them|their|someone|somebody|my mum|my mom|my dad|my child|my friend|my partner|this person|that person)\b/i

const ADVICE_OR_ACTION = /\b(?:should|could i|would i|can i|do i|what do i|how can i|how do i|need to|have to|treatment|treat|manage|management|cure|remedy|medicine|medication|drug|dosage|dose|prescribe|take|avoid|prevent|first aid|emergency|urgent|when to seek|seek care|doctor|clinic|hospital|visit|call|contact|is it safe|is this serious)\b/i

export function isGeneralEducationQuestion(value: string): boolean {
  const text = value.normalize('NFKC').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim()
  if (text.length < 8 || text.length > 2000) return false
  if (!EDUCATION_OPENING.test(text)) return false
  if (PERSONAL_REFERENCE.test(text) || ADVICE_OR_ACTION.test(text)) return false
  return true
}
