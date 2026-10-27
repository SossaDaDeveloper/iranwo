import { Logo, Screen, SuccessIllustration, type StepProps } from "./ui";

export default function CompleteStep({ profile, update, next }: StepProps) {
  const pidgin = profile.language === "pcm";
  const start = () => {
    update({ onboardingComplete: true });
    next();
  };
  return (
    <Screen>
      <header className="flex justify-center pt-8"><Logo size="md" /></header>
      <div className="flex flex-1 flex-col items-center justify-center py-8">
        <SuccessIllustration />
        <h1 className="mt-5 text-center text-[1.7rem] font-bold tracking-tight text-[#173f35]">{pidgin ? "You don set" : "You're all set"}{profile.firstName.trim() ? `, ${profile.firstName.trim()}` : ""}!</h1>
        <p className="mt-3 max-w-xs text-center text-sm leading-6 text-[#5f7367]">{pidgin ? "Anytime wey you need guidance, Iranwo dey here to help you take the next step." : "Whenever you need guidance, Iranwo is here to help you take the next step."}</p>
      </div>
      <button type="button" onClick={start} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#075849] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#06483c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#17604e]/20">Start Using Iranwo <span aria-hidden="true">→</span></button>
      <p className="mt-5 text-center text-xs text-[#78867a]">Together for better health.</p>
    </Screen>
  );
}
