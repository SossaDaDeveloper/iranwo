import { DoctorIllustration, Logo, Screen, type StepProps } from "./ui";

export default function WelcomeStep({ next }: StepProps) {
  return (
    <Screen>
      <header className="flex justify-center pt-6"><Logo size="lg" /></header>
      <p className="mt-3 text-center text-sm font-semibold text-[#36584c]">Help is closer than you think.</p>
      <div className="flex flex-1 flex-col items-center justify-center py-5">
        <DoctorIllustration />
        <h1 className="mt-3 text-center text-lg font-bold tracking-tight text-[#193f36]">Your personal health companion.</h1>
        <p className="mt-2 max-w-xs text-center text-sm leading-6 text-[#526b60]">Understand your symptoms, get guidance on what to do next, and find help when you need it.</p>
      </div>
      <button type="button" onClick={next} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#075849] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#06483c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#17604e]/20">Get Started <span aria-hidden="true">→</span></button>
      <p className="mx-auto mt-4 max-w-xs text-center text-xs leading-5 text-[#68796f]">Iranwo does not replace professional medical care.</p>
    </Screen>
  );
}
