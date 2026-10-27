import { Chip, inputClass, labelClass, NextButton, Note, Screen, SkipButton, Top, type StepProps } from "./ui";

const CONDITIONS = ["Asthma", "Diabetes", "High blood pressure", "Sickle cell disease", "Epilepsy", "Other"];
const EXCLUSIVE = ["None", "Prefer not to say"];
const ALLERGIES = ["No known allergies", "Yes — specify", "Not sure", "Prefer not to say"];
const MEDICATIONS = ["Yes — enter medication names", "No", "Prefer not to say"];

export default function HealthHistoryStep({ profile: p, update, next, back, editing }: StepProps) {
  const toggleCondition = (condition: string) => {
    if (EXCLUSIVE.includes(condition)) {
      update({ conditions: p.conditions.includes(condition) ? [] : [condition] });
      return;
    }
    const regular = p.conditions.filter((value) => !EXCLUSIVE.includes(value));
    update({ conditions: regular.includes(condition) ? regular.filter((value) => value !== condition) : [...regular, condition] });
  };
  const pick = (key: "allergy" | "medication", value: string) => update({ [key]: p[key] === value ? "" : value });

  return (
    <Screen>
      <Top n={3} back={back} />
      <h1 className="text-[1.7rem] font-bold leading-tight tracking-tight text-[#173f35]">Tell us about your health.</h1>
      <p className="mt-2 text-sm leading-6 text-[#5f7367]">Knowing a little about your health can help us provide more relevant guidance.</p>
      <div className="mt-6 space-y-6">
        <section><h2 className="mb-3 text-sm font-bold text-[#25483e]">Do you have any existing medical conditions?</h2><div className="grid grid-cols-2 gap-2">{CONDITIONS.map((condition) => <Chip key={condition} label={condition} selected={p.conditions.includes(condition)} onClick={() => toggleCondition(condition)} />)}{EXCLUSIVE.map((condition) => <Chip key={condition} wide label={condition === "None" ? "None of these" : condition} selected={p.conditions.includes(condition)} onClick={() => toggleCondition(condition)} />)}</div>{p.conditions.includes("Other") && <div className="mt-3"><label htmlFor="conditionOther" className={labelClass}>Other condition(s)</label><input id="conditionOther" className={inputClass} placeholder="Describe the condition" value={p.conditionOther} onChange={(e) => update({ conditionOther: e.target.value })} /></div>}</section>
        <section><h2 className="mb-3 text-sm font-bold text-[#25483e]">Do you have any allergies?</h2><div className="space-y-2">{ALLERGIES.map((value) => <Chip key={value} wide label={value} selected={p.allergy === value} onClick={() => pick("allergy", value)} />)}</div>{p.allergy === "Yes — specify" && <div className="mt-3"><label htmlFor="allergyText" className={labelClass}>Please specify</label><input id="allergyText" className={inputClass} placeholder="e.g. penicillin, peanuts" value={p.allergyText} onChange={(e) => update({ allergyText: e.target.value })} /></div>}</section>
        <section><h2 className="mb-3 text-sm font-bold text-[#25483e]">Are you currently taking any medication?</h2><div className="space-y-2">{MEDICATIONS.map((value) => <Chip key={value} wide label={value} selected={p.medication === value} onClick={() => pick("medication", value)} />)}</div>{p.medication.startsWith("Yes") && <div className="mt-3"><label htmlFor="medicationText" className={labelClass}>Medication names</label><input id="medicationText" className={inputClass} placeholder="List medication names" value={p.medicationText} onChange={(e) => update({ medicationText: e.target.value })} /></div>}</section>
      </div>
      <Note>These answers give Iranwo context only; they do not diagnose you. You can leave these questions blank and update them later.</Note>
      <div className="mt-auto"><NextButton editing={editing} onClick={next} /><SkipButton onClick={next} /></div>
    </Screen>
  );
}
