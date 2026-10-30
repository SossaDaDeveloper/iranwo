import {
  ArrowRight,
  AudioLines,
  HeartPulse,
  Languages,
  ShieldCheck,
  Siren,
  Sparkles,
  Stethoscope,
} from 'lucide-react'
import './WelcomeLanding.css'

type WelcomeLandingProps = {
  bodyText: string
  getStartedText: string
  showContinue: boolean
  onGetStarted: () => void
  onContinue: () => void
  onEmergency: () => void
}

export default function WelcomeLanding({
  bodyText,
  getStartedText,
  showContinue,
  onGetStarted,
  onContinue,
  onEmergency,
}: WelcomeLandingProps) {
  return (
    <section className="iw-welcome" aria-labelledby="iw-welcome-title">
      <div className="iw-welcome-glow iw-welcome-glow-top" aria-hidden="true" />
      <div className="iw-welcome-glow iw-welcome-glow-bottom" aria-hidden="true" />
      <div className="iw-welcome-shell">
        <header className="iw-welcome-header">
          <a className="iw-brand" href="#welcome" onClick={(event) => event.preventDefault()} aria-label="Iranwo home">
            <span className="iw-brand-mark"><Stethoscope size={21} strokeWidth={2.1} /></span>
            <span className="iw-brand-name">iranwo<span>.</span></span>
          </a>

          <div className="iw-header-note">
            A more thoughtful way to care for your health
          </div>

          {showContinue && (
            <button className="iw-continue-link" onClick={onContinue}>
              Continue to Iranwo <ArrowRight size={15} />
            </button>
          )}
        </header>

        <main className="iw-welcome-hero">
          <div className="iw-welcome-copy">

            <h1 id="iw-welcome-title">
              Help is closer than you think.
            </h1>

            <p className="iw-welcome-description">{bodyText}</p>

            <div className="iw-welcome-actions">
              <button className="iw-primary-action" onClick={onGetStarted}>
                {getStartedText}
                <span className="iw-action-arrow"><ArrowRight size={18} /></span>
              </button>
              <span className="iw-action-caption">A few simple steps to get started.</span>
            </div>

            <div className="iw-trust-points">
              <span><ShieldCheck size={16} /> You choose what to share</span>
              <span><Languages size={16} /> Support for local languages</span>
            </div>
          </div>

          
        </main>

        <footer className="iw-welcome-footer">
          <span>Thoughtful support. Clear next steps.</span>
          <span>Help is closer than you think.</span>
        </footer>
      </div>

      <button
        className="iw-sos-button"
        onClick={onEmergency}
        aria-label="Open emergency SOS options"
        title="Emergency SOS"
      >
        <Siren size={23} strokeWidth={2.1} />
        <span>SOS</span>
      </button>
    </section>
  )
}
