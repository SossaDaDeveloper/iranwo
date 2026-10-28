import type { UserProfile } from '../profile/profile.types'
import { mayNeedUrgentHelp } from '../safety/redFlags'

export type AssistantReply = {
  text: string
  urgent: boolean
}

/** Safe, explicitly temporary responses for UI testing before Gemma is loaded. */
export async function generateDemoReply(userText: string, profile: UserProfile): Promise<AssistantReply> {
  await new Promise((resolve) => window.setTimeout(resolve, 500))
  if (mayNeedUrgentHelp(userText)) {
    return {
      urgent: true,
      text: profile.language === 'pcm'
        ? 'Wetin you describe fit need urgent medical attention. Abeg no wait for chatbot reply. Use the Emergency Help button to call for help or reach somebody you trust.'
        : 'What you described could need urgent medical attention. Please do not wait for a chatbot response. Open Emergency Help to call for assistance or contact someone you trust.',
    }
  }
  return {
    urgent: false,
    text: profile.language === 'pcm'
      ? 'I dey demo mode for now; the local AI model never connect. I no fit diagnose you. You fit tell me when e start, how e strong, and whether e dey get worse. If you feel say na emergency, tap SOS now.'
      : 'Iranwo is currently in demo mode; the local AI model is not connected yet. I cannot diagnose you. Can you tell me when this started, how severe it feels, and whether it is getting worse? If you think this is an emergency, tap SOS now.',
  }
}
