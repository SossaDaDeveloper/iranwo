import { Alert, Chip, inputClass, labelClass, NextButton, Screen, SkipButton, Top, isUrgent, type StepProps } from "./ui";

const RECURRING = ["Yes — describe them", "No", "Not sure", "Prefer not to say"];

export default function SymptomsStep({ profile: p, update, next, back, editing }: StepProps) {
  const urgent = isUrgent(p.symptomsText, p.recurringText, p.notes);
  return (
    <Screen>
      <Top n={4} back={back} />
      <h1 className="text-[1.7rem] font-bold leading-tight tracking-tight text-[#173f35]">Anything we should know?</h1>
      <p className="mt-2 text-sm leading-6 text-[#5f7367]">Share any ongoing symptoms or recurring health concerns you would like us to consider.</p>
      <div className="mt-6 space-y-6">
        <section><h2 className="mb-3 text-sm font-bold text-[#25483e]">Are you experiencing any symptoms right now?</h2><div className="grid grid-cols-2 gap-2">{["Yes", "No"].map((value) => <Chip key={value} label={value} selected={p.symptomsNow === value} onClick={() => update({ symptomsNow: p.symptomsNow === value ? "" : value, symptomsText: value === "No" ? "" : p.symptomsText })} />)}</div>{p.symptomsNow === "Yes" && <div className="mt-3"><label className={labelClass} htmlFor="symptomsText">Please describe them</label><textarea id="symptomsText" className={`${inputClass} min-h-24 resize-y`} placeholder="e.g. headache, fever, cough" value={p.symptomsText} onChange={(e) => update({ symptomsText: e.target.value })} /></div>}</section>
        <Alert show={urgent} />
        <section><h2 className="mb-3 text-sm font-bold text-[#25483e]">Have you experienced recurring health problems?</h2><div className="space-y-2">{RECURRING.map((value) => <Chip key={value} wide label={value} selected={p.recurring === value} onClick={() => update({ recurring: p.recurring === value ? "" : value, recurringText: value.startsWith("Yes") || value === p.recurring ? p.recurringText : "" })} />)}</div>{p.recurring.startsWith("Yes") && <div className="mt-3"><label className={labelClass} htmlFor="recurringText">Describe recurring problems</label><textarea id="recurringText" className={`${inputClass} min-h-20 resize-y`} placeholder="e.g. frequent stomach pain" value={p.recurringText} onChange={(e) => update({ recurringText: e.target.value })} /></div>}</section>
        <section><label className={labelClass} htmlFor="healthNotes">Anything else Iranwo should know? <span className="font-normal text-[#869087]">(optional)</span></label><textarea id="healthNotes" className={`${inputClass} min-h-24 resize-y`} placeholder="Optional notes" value={p.notes} onChange={(e) => update({ notes: e.target.value })} /></section>
      </div>
      <div className="mt-auto pt-4"><NextButton editing={editing} onClick={next} /><SkipButton onClick={next} /></div>
    </Screen>
  );
}
