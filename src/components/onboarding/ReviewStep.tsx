import { Note, Screen, Top, type StepProps } from "./ui";

export default function ReviewStep({ profile: p, next, back, goTo }: StepProps) {
  const display = (value: string) => value.trim() || "Not provided";
  const conditions = p.conditions.map((condition) => condition === "Other" && p.conditionOther ? p.conditionOther : condition).join(", ");
  const history = [p.symptomsNow === "Yes" ? p.symptomsText || "Current symptoms reported" : "", p.recurring.startsWith("Yes") ? p.recurringText || "Recurring health problems reported" : "", p.notes].filter(Boolean).join(" · ");
  const contact = p.trustedContact;
  const rows: { title: string; value: string; step: number; symbol: string }[] = [
    { title: "Personal details", value: [p.firstName, p.age !== undefined ? `${p.age} years` : "", p.sex].filter(Boolean).join(" · ") || "Not provided", step: 2, symbol: "♙" },
    { title: "Language", value: p.language === "en" ? "English" : "Nigerian Pidgin", step: 1, symbol: "文" },
    { title: "Health conditions", value: display(conditions), step: 3, symbol: "♡" },
    { title: "Allergies", value: p.allergy === "Yes — specify" ? display(p.allergyText) : display(p.allergy), step: 3, symbol: "◇" },
    { title: "Current medication", value: p.medication.startsWith("Yes") ? display(p.medicationText) : display(p.medication), step: 3, symbol: "+" },
    { title: "Symptoms and history", value: display(history), step: 4, symbol: "♥" },
    { title: "Trusted contact", value: contact ? `${contact.name}${contact.relationship ? ` (${contact.relationship})` : ""} · ${contact.phone}` : "Not added", step: 5, symbol: "♧" },
  ];
  return (
    <Screen wide>
      <Top n={6} back={back} />
      <h1 className="text-[1.7rem] font-bold leading-tight tracking-tight text-[#173f35]">Here's your health profile.</h1>
      <p className="mt-2 text-sm leading-6 text-[#5f7367]">Review your information. You can edit anything before finishing setup.</p>
      <div className="mt-5 divide-y divide-[#e8e7da] overflow-hidden rounded-2xl border border-[#e2e3d7] bg-white/55">
        {rows.map((row) => <div key={row.title} className="flex items-center gap-3 px-3.5 py-3.5 sm:px-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#d4dfcf] bg-[#f0f4e9] text-lg text-[#17604e]" aria-hidden="true">{row.symbol}</span><div className="min-w-0 flex-1"><h2 className="text-sm font-bold text-[#25483e]">{row.title}</h2><p className="mt-0.5 break-words text-xs leading-5 text-[#64766b]">{row.value}</p></div><button type="button" onClick={() => goTo(row.step)} className="rounded-lg px-2.5 py-2 text-xs font-bold text-[#17604e] hover:bg-[#eaf1e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17604e]">Edit</button></div>)}
      </div>
      <Note>Your health information is stored in this browser on this device for this prototype. Browser storage is not encrypted by default. Do not use sensitive real health information in a public or shared-device demo.</Note>
      <div className="mt-auto"><button type="button" onClick={next} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#075849] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#06483c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#17604e]/20">Finish Setup <span aria-hidden="true">→</span></button></div>
    </Screen>
  );
}
