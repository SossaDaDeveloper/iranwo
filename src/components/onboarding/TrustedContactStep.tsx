import { useState } from "react";
import { inputClass, labelClass, NextButton, Note, Screen, SkipButton, Top, type StepProps } from "./ui";

export default function TrustedContactStep({ profile, update, next, back, editing }: StepProps) {
  const [contact, setContact] = useState(profile.trustedContact ?? { name: "", relationship: "", phone: "" });
  const [error, setError] = useState("");
  const save = () => {
    if (!contact.name.trim() || contact.phone.replace(/[^\d+]/g, "").length < 7) {
      setError("Add a name and a valid phone number, or choose to do this later.");
      return;
    }
    update({ trustedContact: { ...contact, name: contact.name.trim(), phone: contact.phone.trim() } });
    next();
  };
  const skip = () => { setError(""); next(); };
  const remove = () => { update({ trustedContact: undefined }); setContact({ name: "", relationship: "", phone: "" }); setError(""); next(); };

  return (
    <Screen>
      <Top n={5} back={back} />
      <h1 className="text-[1.7rem] font-bold leading-tight tracking-tight text-[#173f35]">Who's your person?</h1>
      <p className="mt-2 text-sm leading-6 text-[#5f7367]">Add someone you trust so you can quickly access their contact details when you need support.</p>
      <div className="mt-7 space-y-5">
        <div><label className={labelClass} htmlFor="contactName">Contact's name</label><input id="contactName" autoComplete="name" className={inputClass} placeholder="e.g. Amina Yusuf" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} /></div>
        <div><label className={labelClass} htmlFor="relationship">Relationship</label><select id="relationship" className={inputClass} value={contact.relationship} onChange={(e) => setContact({ ...contact, relationship: e.target.value })}><option value="">Select</option>{["Parent", "Sibling", "Partner", "Friend", "Relative", "Neighbor", "Other"].map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
        <div><label className={labelClass} htmlFor="contactPhone">Phone number</label><input id="contactPhone" type="tel" inputMode="tel" autoComplete="tel" className={inputClass} placeholder="e.g. 080 123 4567" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></div>
      </div>
      {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      <Note>Saving a contact does not notify them automatically. Iranwo should ask you before initiating a call or preparing a message.</Note>
      <div className="mt-auto"><NextButton editing={editing} onClick={save} label="Save Contact" /><SkipButton onClick={skip}>{profile.trustedContact ? "Keep saved contact and continue" : "I'll do this later"}</SkipButton>{editing && profile.trustedContact && <button type="button" onClick={remove} className="mt-1 min-h-9 w-full rounded-full px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Remove saved contact</button>}</div>
    </Screen>
  );
}
