import type { UserProfile } from '../profile/profile.types'
import type { StoredChatMessage } from '../profile/storage'

/**
 * Compatibility stub for the unmounted, older local-model screen.
 * Iranwo's active integration now uses a server-side provider; no browser model
 * package is installed or downloaded by this build.
 */
export const LOCAL_MODEL_ID = 'disabled-local-model'
export type ModelProgress = { progress: number; status: string; file?: string }

export async function loadLocalGemma(_onProgress: (progress: ModelProgress) => void): Promise<void> {
  throw new Error('On-device Gemma is not enabled in this build. Use the configured Iranwo AI backend instead.')
}

export function isLocalGemmaLoaded(): boolean {
  return false
}

export async function generateWithLocalGemma(
  _history: StoredChatMessage[],
  _profile: UserProfile,
): Promise<string> {
  throw new Error('On-device Gemma is not enabled in this build. Use the configured Iranwo AI backend instead.')
}
