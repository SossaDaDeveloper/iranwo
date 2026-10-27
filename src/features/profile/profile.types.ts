export type Language = "en" | "pcm";

export type TrustedContact = { name: string; relationship: string; phone: string };

export type UserProfile = {
  onboardingComplete: boolean;
  firstName: string;
  age?: number;
  sex: string;
  language: Language;
  conditions: string[];
  conditionOther: string;
  allergy: string;
  allergyText: string;
  medication: string;
  medicationText: string;
  symptomsNow: string;
  symptomsText: string;
  recurring: string;
  recurringText: string;
  notes: string;
  trustedContact?: TrustedContact;
};

export const emptyProfile: UserProfile = {
  onboardingComplete: false,
  firstName: "",
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
};
