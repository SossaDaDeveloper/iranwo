import { useEffect, useState } from "react";

import WelcomeStep from "./components/onboarding/WelcomeStep";
import LanguageStep from "./components/onboarding/LanguageStep";
import PersonalInfoStep from "./components/onboarding/PersonalInfoStep";
import HealthHistoryStep from "./components/onboarding/HealthHistoryStep";
import SymptomsStep from "./components/onboarding/SymptomsStep";
import TrustedContactStep from "./components/onboarding/TrustedContactStep";
import ReviewStep from "./components/onboarding/ReviewStep";
import CompleteStep from "./components/onboarding/CompleteStep";
import HomeStep from "./components/onboarding/HomeStep";
import type { UserProfile } from "./features/profile/profile.types";
import "./App.css";

const PROFILE_STORAGE_KEY = "iranwo-profile-v1";
const LEGACY_COMPLETE_KEY = "iranwo-onboarding-complete";
const HOME_STEP = 8;

const DEFAULT_PROFILE: UserProfile = {
  onboardingComplete: false,
  firstName: "",
  age: undefined,
  sex: "",
  language: "en",
  conditions: [],
  conditionOther: "",
  allergy: "",
  allergyText: "",
  medication: "",
  medicationText: "",
  symptomsNow: "",
  symptomsText: "",
  recurring: "",
  recurringText: "",
  notes: "",
  trustedContact: undefined,
};

function readInitialState(): { profile: UserProfile; step: number } {
  if (typeof window === "undefined") {
    return { profile: DEFAULT_PROFILE, step: 0 };
  }

  try {
    const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    const savedProfile = stored ? (JSON.parse(stored) as Partial<UserProfile>) : {};
    const legacyComplete = window.localStorage.getItem(LEGACY_COMPLETE_KEY) === "true";
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      ...savedProfile,
      onboardingComplete: savedProfile.onboardingComplete ?? legacyComplete,
    };

    return { profile, step: profile.onboardingComplete ? HOME_STEP : 0 };
  } catch {
    return { profile: DEFAULT_PROFILE, step: 0 };
  }
}

function App() {
  const [initialState] = useState(readInitialState);
  const [profile, setProfile] = useState<UserProfile>(initialState.profile);
  const [currentStep, setCurrentStep] = useState(initialState.step);
  const [editing, setEditing] = useState(false);

  // Save profile updates locally so progress survives refreshes and reopening the app.
  useEffect(() => {
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      if (profile.onboardingComplete) {
        window.localStorage.setItem(LEGACY_COMPLETE_KEY, "true");
      } else {
        window.localStorage.removeItem(LEGACY_COMPLETE_KEY);
      }
    } catch {
      // The app can still run if storage is unavailable, though data may not persist.
    }
  }, [profile]);

  const update = (changes: Partial<UserProfile>) => {
    setProfile((current) => ({ ...current, ...changes }));
  };

  const next = () => {
    if (editing) {
      // When editing from Review, return to Review instead of advancing the whole flow.
      setEditing(false);
      setCurrentStep(6);
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, HOME_STEP));
  };

  const back = () => {
    if (editing) {
      setEditing(false);
      setCurrentStep(6);
      return;
    }

    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const goTo = (step: number) => {
    // Review's Edit buttons target steps 1 through 5.
    if (step < 1 || step > 5) return;
    setEditing(true);
    setCurrentStep(step);
  };

  const reset = () => {
    try {
      window.localStorage.removeItem(PROFILE_STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_COMPLETE_KEY);
    } catch {
      // Reset the in-memory state even if local storage is unavailable.
    }
    setProfile({ ...DEFAULT_PROFILE });
    setEditing(false);
    setCurrentStep(0);
  };

  const stepProps = { profile, update, next, back, goTo, editing, reset };

  switch (currentStep) {
    case 0:
      return <WelcomeStep {...stepProps} />;
    case 1:
      return <LanguageStep {...stepProps} />;
    case 2:
      return <PersonalInfoStep {...stepProps} />;
    case 3:
      return <HealthHistoryStep {...stepProps} />;
    case 4:
      return <SymptomsStep {...stepProps} />;
    case 5:
      return <TrustedContactStep {...stepProps} />;
    case 6:
      return <ReviewStep {...stepProps} />;
    case 7:
      return <CompleteStep {...stepProps} />;
    default:
      return <HomeStep {...stepProps} />;
  }
}

export default App;
