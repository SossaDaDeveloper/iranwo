import type { ReactNode } from "react";
import type { UserProfile } from "../../features/profile/profile.types";

export type StepProps = {
  profile: UserProfile;
  update: (changes: Partial<UserProfile>) => void;
  next: () => void;
  back: () => void;
  goTo: (step: number) => void;
  editing: boolean;
  reset: () => void;
};

const URGENT = /chest pain|can't breathe|cannot breathe|difficulty breathing|short(ness)? of breath|seizure|unconscious|passed out|collapse|severe bleeding|heavy bleeding|stroke|slurred speech|poison|choking|breathe no dey|dey faint/i;
export const isUrgent = (...text: (string | undefined)[]) => URGENT.test(text.join(" "));

const fieldClass = "w-full rounded-xl border border-[#d8d8c9] bg-white/75 px-4 py-3.5 text-[15px] text-[#193f36] outline-none transition placeholder:text-[#8b948a] focus:border-[#17604e] focus:ring-4 focus:ring-[#17604e]/10";
export const inputClass = fieldClass;
export const labelClass = "mb-1.5 block text-sm font-semibold text-[#25483e]";

export function Screen({ children, wide = false }: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-[#f0ecdf] px-0 text-[#163f35] sm:px-4 sm:py-6">
      <main className={`relative mx-auto flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[#fbf8ef] px-6 pb-7 pt-5 shadow-[0_14px_50px_rgba(48,57,39,0.12)] sm:min-h-[calc(100dvh-3rem)] sm:rounded-[2rem] ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#e5ead7]/70 to-transparent" aria-hidden="true" />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
      </main>
    </div>
  );
}

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dimensions = size === "lg" ? "h-11 w-11 text-3xl" : size === "sm" ? "h-7 w-7 text-xl" : "h-9 w-9 text-2xl";
  const word = size === "lg" ? "text-3xl" : size === "sm" ? "text-xl" : "text-2xl";
  return (
    <div className="inline-flex items-center justify-center gap-2.5 font-extrabold tracking-tight text-[#075849]" aria-label="Iranwo">
      <svg className={dimensions} viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path d="M19.8 35.4C8.4 29.7 3.7 20.1 7.2 7.4c8.8.4 14.2 5.1 15.8 13.1C24.6 12.9 29 8.6 35.1 7.6c3.1 12.1-2.4 22.1-15.3 27.8Z" fill="currentColor" />
        <path d="M20 35V18" stroke="#fbf8ef" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
      <span className={word}>Iranwo</span>
    </div>
  );
}

export function DoctorIllustration({ compact = false }: { compact?: boolean }) {
  const box = compact ? "h-44 w-44" : "h-52 w-52";
  return (
    <svg viewBox="0 0 240 240" className={`${box} max-w-full`} role="img" aria-label="Friendly healthcare companion illustration">
      <circle cx="120" cy="120" r="106" fill="#e5eddc" />
      <path d="M35 178c-17-31-12-70 8-90 20 20 27 48 16 76l-24 14Zm170 2c21-31 20-64 2-90-22 20-30 49-17 75l15 15Z" fill="#a5c7a0" />
      <path d="M45 199c9-44 39-64 75-64s67 20 76 64v18H45Z" fill="#fffdf6" stroke="#c9daca" strokeWidth="2" />
      <path d="M82 146c9 9 22 13 38 13s29-4 38-13l13 71H69Z" fill="#f3f5ea" />
      <path d="M104 121h32v28c-9 11-23 11-32 0v-28Z" fill="#b96e43" />
      <ellipse cx="120" cy="91" rx="42" ry="48" fill="#9b5735" />
      <path d="M78 93c-8-40 12-66 44-66 32 0 47 22 42 56-12-8-20-22-23-33-14 20-36 29-63 28Z" fill="#202c25" />
      <path d="M81 87c-4 14 1 39 12 51 8 10 17 14 27 14s20-4 28-14c10-12 15-36 11-51-12-1-28-10-38-24-9 13-23 22-40 24Z" fill="#b96e43" />
      <path d="M101 96h2m34 0h2" stroke="#26332b" strokeWidth="5" strokeLinecap="round" />
      <path d="M108 115c7 7 17 7 24 0" stroke="#6f3326" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M75 85c-6-22 1-50 23-62 17-9 37-5 49 6 12 11 16 26 12 43-14-4-27-17-33-29-11 19-30 33-51 42Z" fill="#202c25" />
      <path d="M82 161c10 13 23 20 38 20s28-7 38-20l12 57H70Z" fill="#fffdf6" stroke="#d6e1d2" strokeWidth="2" />
      <path d="M103 163l17 24 17-24" fill="none" stroke="#dce7d8" strokeWidth="5" />
      <path d="M93 164c-7 12-9 27-6 43m60-43c7 12 9 27 6 43" fill="none" stroke="#17604e" strokeWidth="3" strokeLinecap="round" />
      <circle cx="151" cy="194" r="5" fill="#17604e" />
      <path d="M48 154c-7-17-4-34 4-47 15 10 24 26 24 44l-28 3Zm145 0c8-17 5-34-3-47-15 10-24 26-24 44l27 3Z" fill="#77aa7c" />
    </svg>
  );
}

export function SuccessIllustration() {
  return (
    <div className="relative grid h-48 w-48 place-items-center" aria-label="Setup complete" role="img">
      <div className="absolute inset-2 rounded-full bg-[#e5eddc]" />
      <div className="absolute bottom-6 left-1 h-20 w-8 rotate-[-30deg] rounded-full bg-[#a4c69c]" />
      <div className="absolute bottom-6 right-1 h-20 w-8 rotate-[30deg] rounded-full bg-[#a4c69c]" />
      <div className="relative grid h-32 w-32 place-items-center rounded-full bg-gradient-to-br from-[#b9dfac] via-[#66b3a0] to-[#177b70] shadow-[inset_-8px_-10px_20px_rgba(0,45,39,.18)]">
        <span className="absolute right-6 top-5 h-7 w-4 rotate-[-35deg] rounded-full bg-white/70" />
        <svg viewBox="0 0 40 40" className="h-14 w-14 text-white" fill="none" aria-hidden="true"><path d="m8 21 8 8L32 12" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
    </div>
  );
}

export function Top({ n, back }: { n: number; back: () => void }) {
  return (
    <div className="mb-7 flex items-center justify-between gap-4">
      <button type="button" onClick={back} aria-label="Go back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-2xl text-[#244b40] transition hover:bg-[#eaf0e3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17604e]">←</button>
      <div className="flex items-center gap-1.5" aria-label={`Onboarding step ${n} of 6`}>
        {[1, 2, 3, 4, 5, 6].map((i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i <= n ? "w-5 bg-[#17604e]" : "w-1.5 bg-[#d9dfd2]"}`} />)}
      </div>
      <span className="w-10 text-right text-xs font-medium text-[#7a887d]">{Math.min(n, 6)}/6</span>
    </div>
  );
}

export function Chip({ label, selected, onClick, wide = false }: { label: string; selected: boolean; onClick: () => void; wide?: boolean }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={`flex min-h-11 ${wide ? "col-span-2" : ""} items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17604e] ${selected ? "border-[#17604e] bg-[#e9f0e4] text-[#164e40]" : "border-[#dddccd] bg-white/65 text-[#365047] hover:border-[#9ebba2] hover:bg-white"}`}>
      <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${selected ? "border-[#17604e] bg-[#17604e]" : "border-[#abb9aa] bg-transparent"}`}>{selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>
      <span>{label}</span>
    </button>
  );
}

export function Alert({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="my-4 rounded-2xl border border-[#dfaa82] bg-[#fff0e7] p-4 text-sm leading-6 text-[#71351e]" role="alert">
      <p className="font-bold">This may be an emergency.</p>
      If someone is in immediate danger, contact local emergency services or go to the nearest emergency department. In Nigeria, you can try <a className="font-bold underline" href="tel:112">112</a> where available. Do not wait to finish setup.
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <div className="my-4 flex gap-3 rounded-2xl border border-[#e0e6d7] bg-[#edf2e6] px-4 py-3 text-xs leading-5 text-[#496054]"><span aria-hidden="true" className="mt-0.5">ⓘ</span><div>{children}</div></div>;
}

export function NextButton({ editing, onClick, label }: { editing: boolean; onClick: () => void; label?: string }) {
  return <button type="button" onClick={onClick} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#075849] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#06483c] active:scale-[.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#17604e]/20">{label ?? (editing ? "Save changes" : "Continue")} <span aria-hidden="true">→</span></button>;
}

export function SkipButton({ onClick, children = "Skip for now" }: { onClick: () => void; children?: ReactNode }) {
  return <button type="button" onClick={onClick} className="mt-3 min-h-10 w-full rounded-full px-4 py-2 text-sm font-semibold text-[#245a4a] transition hover:bg-[#eef2e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17604e]">{children}</button>;
}
