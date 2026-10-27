import { NextButton, Screen, Top, type StepProps } from "./ui";
import type { Language } from "../../features/profile/profile.types";

const OPTIONS: { id: Language; title: string; text: string; symbol: string }[] = [
  { id: "en", title: "English", text: "Clear and simple English.", symbol: "EN" },
  { id: "pcm", title: "Nigerian Pidgin", text: "Make we yarn for the language wey you understand.", symbol: "Na" },
];

export default function LanguageStep({ profile, update, next, back, editing }: StepProps) {
  return (
    <Screen>
      <Top n={1} back={back} />
      <div className="pt-1">
        <h1 className="text-[1.7rem] font-bold leading-tight tracking-tight text-[#173f35]">How would you like us to talk?</h1>
        <p className="mt-2 text-sm leading-6 text-[#5f7367]">Choose the language you're most comfortable with.</p>
      </div>
      <div className="mt-7 space-y-3">
        {OPTIONS.map((option) => {
          const selected = profile.language === option.id;
          return <button type="button" key={option.id} aria-pressed={selected} onClick={() => update({ language: option.id })} className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17604e] ${selected ? "border-[#17604e] bg-[#edf2e7] shadow-sm" : "border-[#dedecf] bg-white/70 hover:border-[#b4c9b2]"}`}>
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-extrabold ${selected ? "bg-[#17604e] text-white" : "bg-[#e8eee0] text-[#17604e]"}`}>{option.symbol}</span>
            <span className="flex-1"><span className="block font-bold text-[#1c453a]">{option.title}</span><span className="mt-1 block text-xs leading-5 text-[#62766a]">{option.text}</span></span>
            <span className={`grid h-5 w-5 place-items-center rounded-full border ${selected ? "border-[#17604e] bg-[#17604e] text-white" : "border-[#aab8aa]"}`}>{selected && <span className="text-xs">✓</span>}</span>
          </button>;
        })}
      </div>
      <div className="mt-auto pt-8"><NextButton editing={editing} onClick={next} /></div>
    </Screen>
  );
}
