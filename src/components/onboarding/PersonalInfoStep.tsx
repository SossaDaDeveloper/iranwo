import { useState } from "react";
import { inputClass, labelClass, NextButton, Screen, SkipButton, Top, type StepProps } from "./ui";

export default function PersonalInfoStep({ profile, update, next, back, editing }: StepProps) {
  const [errors, setErrors] = useState<{ name?: string; age?: string }>({});
  const submit = () => {
    const nextErrors: typeof errors = {};
    if (profile.age !== undefined && (!Number.isFinite(profile.age) || profile.age < 0 || profile.age > 120)) nextErrors.age = "Enter an age between 0 and 120.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      update({ firstName: profile.firstName.trim() });
      next();
    }
  };

  return (
    <Screen>
      <Top n={2} back={back} />
      <h1 className="text-[1.7rem] font-bold leading-tight tracking-tight text-[#173f35]">Let's get to know you.</h1>
      <p className="mt-2 text-sm leading-6 text-[#5f7367]">A few details will help us make your experience more relevant.</p>
      <div className="mt-7 space-y-5">
        <div><label className={labelClass} htmlFor="firstName">First name <span className="font-normal text-[#869087]">(optional)</span></label><input className={inputClass} id="firstName" autoComplete="given-name" placeholder="e.g. Tunde" value={profile.firstName} onChange={(e) => update({ firstName: e.target.value })} /></div>
        <div><label className={labelClass} htmlFor="age">Age <span className="font-normal text-[#869087]">(optional)</span></label><input className={inputClass} id="age" type="number" inputMode="numeric" min={0} max={120} placeholder="e.g. 25" value={profile.age ?? ""} onChange={(e) => update({ age: e.target.value === "" ? undefined : Number(e.target.value) })} aria-invalid={Boolean(errors.age)} />{errors.age && <p className="mt-1 text-sm text-red-700" role="alert">{errors.age}</p>}</div>
        <div><label className={labelClass} htmlFor="sex">Sex <span className="font-normal text-[#869087]">(optional)</span></label><select className={inputClass} id="sex" value={profile.sex} onChange={(e) => update({ sex: e.target.value })}><option value="">Select</option>{["Female", "Male", "Prefer not to say"].map((value) => <option key={value} value={value}>{value}</option>)}</select><p className="mt-2 text-xs leading-5 text-[#718075]">Some health guidance may depend on age and biological factors. Share only what you are comfortable sharing.</p></div>
      </div>
      <div className="mt-auto pt-5"><NextButton editing={editing} onClick={submit} /><SkipButton onClick={next} /></div>
    </Screen>
  );
}
