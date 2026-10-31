import {
  Activity,
  ArrowRight,
  AudioLines,
  HeartPulse,
  Mic,
  Siren,
  Sparkles,
} from 'lucide-react'
import { Logo, type StepProps } from './ui'

type WelcomeStepProps = Pick<StepProps, 'next'> & {
  onEmergency: () => void
}

export default function WelcomeStep({ next, onEmergency }: WelcomeStepProps) {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#f8f8f3] text-[#182e27]">
      {/* Soft background light */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-44 h-[28rem] w-[28rem] rounded-full bg-[#e4eee1]/80 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 -right-32 h-[32rem] w-[32rem] rounded-full bg-[#e6eee4]/75 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col px-5 pb-6 pt-5 sm:px-8 sm:pt-7 lg:px-12">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <span className="hidden h-7 w-px bg-[#dce4d9] sm:block" />
            <span className="hidden text-xs font-semibold tracking-[0.12em] text-[#728078] sm:block">
              YOUR HEALTH COMPANION
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-right text-xs leading-4 text-[#78837b] sm:block">
              Need urgent
              <br />
              medical help?
            </span>
            <button
              type="button"
              onClick={() => onEmergency()}
              aria-label="Open emergency help"
              title="Emergency help"
              className="group relative grid h-[58px] w-[58px] shrink-0 place-items-center rounded-full border-[4px] border-white bg-[#c92d37] text-white shadow-[0_8px_24px_rgba(201,45,55,.22)] transition duration-200 hover:scale-[1.04] hover:bg-[#b9232e] active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c92d37]/20"
            >
              <span className="flex flex-col items-center justify-center gap-0.5">
                <Siren size={19} strokeWidth={2.4} />
                <span className="text-[10px] font-black tracking-[0.14em]">SOS</span>
              </span>
              <span
                aria-hidden="true"
                className="absolute -inset-[7px] -z-10 rounded-full border border-[#c92d37]/20 transition group-hover:scale-110"
              />
            </button>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.02fr_.98fr] lg:gap-16 lg:py-14">
          {/* Hero copy */}
          <div className="mx-auto w-full max-w-2xl lg:mx-0">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dce7d9] bg-white/75 px-3.5 py-2 shadow-sm shadow-[#234b38]/[0.03]">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[#e5efe2] text-[#245c49]">
                <Sparkles size={13} />
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#426756] sm:text-[11px]">
                A more human way to access health support
              </span>
            </div>

            <h1 className="max-w-[11ch] text-[clamp(2.9rem,8vw,5.7rem)] font-extrabold leading-[0.98] tracking-[-0.075em] text-[#183d32]">
              Help is closer than you think<span className="text-[#c92d37]">.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-[#66766d] sm:text-lg sm:leading-8">
              Talk naturally about how you feel. Get clear guidance on what to do next and find support when you need it.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={next}
                className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#173f35] px-7 py-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(23,63,53,.16)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#215744] hover:shadow-[0_16px_32px_rgba(23,63,53,.2)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#245c49]/20"
              >
                Get started
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
              <span className="text-center text-xs font-medium text-[#879188] sm:px-2 sm:text-left">
                Your health journey starts here.
              </span>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-[#e2e8df] pt-5 text-xs font-semibold text-[#68796f]">
              <span className="inline-flex items-center gap-2">
                <AudioLines size={15} className="text-[#39745b]" />
                Voice-first support
              </span>
              <span className="inline-flex items-center gap-2">
                <HeartPulse size={15} className="text-[#39745b]" />
                Health guidance
              </span>
              <span className="inline-flex items-center gap-2">
                <Activity size={15} className="text-[#39745b]" />
                Help when it matters
              </span>
            </div>
          </div>

          {/* Visual conversation preview */}
          <div className="relative mx-auto w-full max-w-[34rem] lg:ml-auto">
            <div className="relative min-h-[390px] overflow-hidden rounded-[2rem] border border-white/90 bg-[linear-gradient(145deg,#edf3e9_0%,#e5eee3_46%,#f6f5ec_100%)] p-5 shadow-[0_28px_75px_rgba(35,71,49,.10)] sm:min-h-[470px] sm:rounded-[2.5rem] sm:p-7">
              <div aria-hidden="true" className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-white/60" />
              <div aria-hidden="true" className="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-white/70" />
              <div aria-hidden="true" className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#c7ddc7]/50 blur-2xl" />

              <div className="relative flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/65 px-3 py-2 backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-[#4b9a70] shadow-[0_0_0_4px_rgba(75,154,112,.12)]" />
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#456757]">
                    Meet your health companion
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#789083]">01 / 01</span>
              </div>

              <div className="relative flex min-h-[280px] flex-col items-center justify-center py-8 sm:min-h-[340px]">
                {/* Abstract voice orb — CSS only, no external image */}
                <div className="relative grid h-48 w-48 place-items-center sm:h-60 sm:w-60">
                  <div className="absolute inset-0 rounded-full border border-white/80" />
                  <div className="absolute inset-4 rounded-full border border-white/75" />
                  <div className="absolute inset-8 rounded-full bg-white/35 blur-xl" />
                  <div className="relative grid h-32 w-32 place-items-center rounded-full bg-[radial-gradient(circle_at_34%_25%,#fafff3_0%,#b7d6b9_28%,#6aa88b_62%,#245c49_100%)] shadow-[inset_-12px_-16px_25px_rgba(20,70,50,.22),0_18px_38px_rgba(36,92,73,.20)] sm:h-40 sm:w-40">
                    <div className="absolute left-7 top-6 h-7 w-12 rotate-[-35deg] rounded-full bg-white/45 blur-[1px] sm:left-9 sm:top-8 sm:h-9 sm:w-16" />
                    <AudioLines size={44} strokeWidth={1.7} className="relative text-white drop-shadow-sm sm:h-14 sm:w-14" />
                  </div>
                  <span className="absolute right-7 top-8 h-3 w-3 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,.9)] sm:right-9 sm:top-9" />
                  <span className="absolute bottom-8 left-7 h-2.5 w-2.5 rounded-full bg-[#fff7dc] shadow-[0_0_16px_rgba(255,247,220,.9)] sm:bottom-10 sm:left-9" />
                </div>
                <p className="mt-2 text-center text-sm font-bold tracking-tight text-[#285443] sm:text-base">
                  A conversation that starts with you.
                </p>
                <p className="mt-1 max-w-xs text-center text-xs leading-5 text-[#718477]">
                  Speak in the language that feels natural to you.
                </p>
              </div>

              <div className="relative flex items-end justify-between gap-3">
                <div className="max-w-[17rem] rounded-2xl rounded-bl-md border border-white/80 bg-white/85 px-4 py-3 shadow-[0_8px_24px_rgba(40,76,53,.07)] backdrop-blur-sm">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#6d8a78]">Iranwo</p>
                  <p className="mt-1 text-sm font-semibold leading-5 text-[#284b3c]">
                    Hi, I'm here to help. What's on your mind today?
                  </p>
                </div>
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/80 bg-white/75 text-[#2c694f] shadow-sm backdrop-blur-sm">
                  <Mic size={21} />
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 left-5 right-5 -z-10 h-16 rounded-[2rem] bg-[#d8e6d5]/75 blur-xl" />
          </div>
        </section>

        <footer className="relative flex flex-col items-center justify-between gap-2 border-t border-[#e4e9e0] pt-4 text-center sm:flex-row sm:text-left">
          <p className="text-[11px] leading-5 text-[#829087]">
            Iranwo provides health information, not a diagnosis or a substitute for professional medical care.
          </p>
          <span className="text-[10px] font-semibold tracking-wide text-[#9aa49b]">
            MADE TO HELP YOU TAKE THE NEXT STEP
          </span>
        </footer>
      </div>
    </main>
  )
}
