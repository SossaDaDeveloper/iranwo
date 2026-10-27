import { emptyProfile, type UserProfile } from "./profile.types";

const KEY = "iranwo.profile.v1";

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...emptyProfile, ...JSON.parse(raw) } : emptyProfile;
  } catch {
    return emptyProfile;
  }
}

export function saveProfile(p: UserProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: keep going */
  }
}

export function clearProfile() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
