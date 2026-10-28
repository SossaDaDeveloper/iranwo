import type { UserProfile } from '../profile/profile.types'
import type { StoredChatMessage } from '../profile/storage'

export const LOCAL_MODEL_ID = 'onnx-community/gemma-3-1b-it-ONNX'
export type ModelProgress = { progress: number; status: string; file?: string }
type MessageInput = { role: 'system' | 'user' | 'assistant'; content: string }
type GeneratedRow = { generated_text?: string | Array<{ role?: string; content?: string }> }
type Generator = (messages: MessageInput[], options: Record<string, unknown>) => Promise<GeneratedRow[]>

let generator: Generator | null = null
let loadingPromise: Promise<void> | null = null

function progressText(value: unknown): ModelProgress {
  const item = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const rawProgress = typeof item.progress === 'number' ? item.progress : 0
  return {
    progress: Math.max(0, Math.min(100, rawProgress)),
    status: typeof item.status === 'string' ? item.status : 'Preparing model files',
    file: typeof item.file === 'string' ? item.file : undefined,
  }
}

export async function loadLocalGemma(onProgress: (progress: ModelProgress) => void): Promise<void> {
  if (generator) {
    onProgress({ progress: 100, status: 'Model is already loaded' })
    return
  }
  if (!loadingPromise) {
    loadingPromise = (async () => {
      onProgress({ progress: 0, status: 'Starting model loader' })
      const transformers = await import('@huggingface/transformers')
      // Keep model artifacts in the browser's cache so supported devices can reuse them offline.
      const runtimeEnv = transformers.env as unknown as Record<string, unknown>
      runtimeEnv.useBrowserCache = true
      const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator
      const pipelineOptions = {
        dtype: 'q4',
        device: hasWebGPU ? 'webgpu' : 'wasm',
        progress_callback: (progress: unknown) => onProgress(progressText(progress)),
      }
      // Transformers.js v4 preview currently exposes this pipeline API for the selected ONNX model.
      const candidate = await transformers.pipeline(
        'text-generation',
        LOCAL_MODEL_ID,
        pipelineOptions as never,
      )
      generator = candidate as unknown as Generator
      onProgress({ progress: 100, status: 'Model loaded' })
    })().catch((error: unknown) => {
      loadingPromise = null
      generator = null
      throw error
    })
  }
  await loadingPromise
}

export function isLocalGemmaLoaded(): boolean {
  return generator !== null
}

export async function generateWithLocalGemma(
  history: StoredChatMessage[],
  profile: UserProfile,
): Promise<string> {
  if (!generator) throw new Error('The local Gemma model has not been loaded.')
  const system = [
    'You are Iranwo, a cautious health information companion. You are not a doctor and must not diagnose, prescribe, or replace a clinician.',
    'Use plain, short, calm language. Ask one useful follow-up question at a time when context is missing.',
    'Do not claim to have contacted an emergency service, clinic, or trusted person.',
    'If a user describes potentially life-threatening symptoms, advise them to seek emergency medical help immediately and not wait for the chat.',
    'Never give certainty about a diagnosis. When uncertain, say so and encourage professional medical advice.',
    `Preferred response language: ${profile.language === 'pcm' ? 'Nigerian Pidgin' : 'simple English'}.`,
    `User context volunteered during onboarding: age ${profile.age ?? 'not provided'}; conditions ${(profile.conditions ?? []).join(', ') || 'not provided'}; allergies ${profile.allergyText || profile.allergy || 'not provided'}; medication ${profile.medicationText || profile.medication || 'not provided'}. Treat this as user-reported, not verified medical record.`,
  ].join('\n')
  const messages: MessageInput[] = [
    { role: 'system', content: system },
    ...history.slice(-8).map((message) => ({ role: message.role, content: message.text })),
  ]
  const output = await generator(messages, { max_new_tokens: 180, do_sample: false })
  const generated = output?.[0]?.generated_text
  if (Array.isArray(generated)) {
    const last = generated[generated.length - 1]
    if (last?.content?.trim()) return last.content.trim()
  }
  if (typeof generated === 'string' && generated.trim()) return generated.trim()
  throw new Error('The model did not return a readable response.')
}
