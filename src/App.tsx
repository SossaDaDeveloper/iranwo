import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownLeft, ArrowLeft, ArrowRight, Check, CheckCircle2,
  ChevronDown, ChevronRight, CircleHelp, Clock3, HeartPulse, Home, Languages,
  MapPin, MessageCircle, Phone, Plus, Send, Settings, ShieldCheck, Siren,
  Sparkles, Stethoscope, UserRound, Users, Wifi, X, Zap,
} from 'lucide-react'
import WelcomeLanding from './components/onboarding/WelcomeLanding'
import { runAssistantTurn } from './features/ai/assistantOrchestrator'
import type { AgentAssessments } from './features/ai/agent.types'
import { isCloudAIConfigured } from './features/ai/aiGateway'
import type { SafetyAssessment } from '../features/safety/safetyEngine'
import { confirmCurrentEmergency, dismissClarification } from '../features/safety/safetyEngine'
import SafetyAlert from './features/safety/SafetyAlert'

type Language = 'en' | 'yo' | 'pcm' | 'ha' | 'ig'
type Sex = 'Female' | 'Male' | 'Prefer not to say'
type Condition = 'sickle' | 'asthma' | 'diabetes' | 'seizures' | 'hypertension' | 'heart' | 'other'
type Contact = { name: string; relationship: string; country: string; phone: string }
type Profile = { name: string; age: string; sex: Sex | ''; language: Language; country: string; phone: string; conditions: Condition[]; customConditions: string[]; notes: string; contacts: Contact[] }
type Screen = 'welcome' | 'language' | 'personal' | 'health' | 'contacts' | 'review' | 'complete' | 'home' | 'chat' | 'clinics' | 'profile' | 'emergency'

const blankProfile: Profile = { name: '', age: '', sex: '', language: 'en', country: 'NG', phone: '', conditions: [], customConditions: [], notes: '', contacts: [] }

const copy: Record<Language, Record<string, string>> = {
  en: {
    tagline: 'Help is closer than you think.', 
    welcomeTitle: 'Help is closer than you think.', 
    welcomeBody: 'A thoughtful health companion for everyday questions, helpful next steps, and the moments that matter.', 
    getStarted: 'Let’s get to know you', 
    already: 'Already set up? Continue', 
    chooseLanguage: 'Choose your language', 
    languageHelp: 'You can change this anytime in your profile.', 
    continue: 'Continue', back: 'Back', yourDetails: 'A little about you', detailsHelp: 'This helps us make your experience more relevant.', fullName: 'Full name', namePlaceholder: 'What should we call you?', age: 'Age', sex: 'Sex', selectSex: 'Select sex', female: 'Female', male: 'Male', intersex: 'Intersex', preferNot: 'Prefer not to say', country: 'Country', phone: 'Phone number', phoneHelp: 'Choose a country code. We’ll validate the number for that country.', healthHistory: 'Your health story', healthHelp: 'Select any conditions you live with. This is optional and you can update it later.', conditions: 'Existing medical conditions', none: 'None of these', notes: 'Anything else we should know? (optional)', notesPlaceholder: 'Allergies, important context, or questions…', trustedTitle: 'Your trusted people', trustedHelp: 'Add someone you may want to contact in an emergency. You choose whether to call or message them.', addContact: 'Add a trusted person', contactName: 'Contact name', relationship: 'Relationship', contactPhone: 'Contact phone', reviewTitle: 'Take a quick look', reviewHelp: 'Make sure everything looks right. You can edit it later.', completeTitle: 'You’re all set.', completeBody: 'Your health companion is ready when you need a hand. One step at a time.', enterApp: 'Explore Iranwo', dashboard: 'Your space', goodDay: 'A little care goes a long way.', emergency: 'SOS emergency', talk: 'Talk to Iranwo', talkBody: 'Ask a health question in plain language.', nearby: 'Care nearby', nearbyBody: 'Explore example clinics and helpful services.', healthSnapshot: 'Your health snapshot', conditionsSaved: 'conditions saved', trustedSaved: 'trusted people', chatTitle: 'Let’s talk about it', chatHelp: 'I can share general health information and help you think about next steps. I’m not a clinician.', chatPlaceholder: 'What’s on your mind?', send: 'Send', clinicsTitle: 'Care nearby', clinicsHelp: 'Example listings for this prototype. Verify details before visiting.', profileTitle: 'Your profile', save: 'Save changes', saved: 'Saved', urgentTitle: 'You deserve help now.', urgentBody: 'If someone is unconscious, struggling to breathe, having a seizure, or in immediate danger, contact local emergency services now.', callEmergency: 'Call emergency services', callTrusted: 'Call trusted person', messageTrusted: 'Prepare SMS alert', emergencyNote: 'Your device will open its calling or messaging app. This website cannot silently place calls or guarantee that a message was delivered.', noContacts: 'Add a trusted person in your profile to see their quick actions here.', cancel: 'Close emergency screen', online: 'Ready to help', settings: 'Profile & settings', symptom: 'What are you experiencing?', chooseContact: 'Choose a contact', contactAdded: 'Contact added', invalidPhone: 'Enter a valid phone number for the selected country.', required: 'This field is required.', ageError: 'Enter an age between 1 and 120.', chatDisclaimer: 'Iranwo can make mistakes. For urgent symptoms, seek professional or emergency care.', languageNames: 'English, Yorùbá, Nigerian Pidgin, Hausa, Igbo'
  },
  yo: {
    tagline: 'Ìlera rẹ, pẹ̀lú ìfẹ́ sí i.', welcomeTitle: 'Ìtọ́jú tó sún mọ́ ọ.', welcomeBody: 'Ọ̀rẹ́ ìlera tó lè ran ọ́ lọ́wọ́ pẹ̀lú àwọn ìbéèrè àti ìgbésẹ̀ tó yẹ.', getStarted: 'Jẹ́ ká mọ̀ ọ́ díẹ̀', already: 'Ṣé o ti ṣètò rẹ tẹ́lẹ̀? Tẹ̀síwájú', chooseLanguage: 'Yan èdè rẹ', languageHelp: 'O lè yí èyí padà nígbàkigbà.', continue: 'Tẹ̀síwájú', back: 'Padà', yourDetails: 'Nípa rẹ díẹ̀', detailsHelp: 'Èyí yóò ran wa lọ́wọ́ láti mú ìrírí rẹ sunwọ̀n sí i.', fullName: 'Orúkọ kíkún', namePlaceholder: 'Kí la máa pè ọ́?', age: 'Ọjọ́ orí', sex: 'Ìbálòpọ̀', selectSex: 'Yan ìbálòpọ̀', female: 'Obìnrin', male: 'Ọkùnrin', intersex: 'Intersex', preferNot: 'Mi ò fẹ́ sọ', country: 'Orílẹ̀-èdè', phone: 'Nọ́mbà fóònù', phoneHelp: 'Yan kóòdù orílẹ̀-èdè rẹ.', healthHistory: 'Ìtàn ìlera rẹ', healthHelp: 'Yan àwọn àìsàn tó kan ọ, bí ó bá wà.', conditions: 'Àwọn àìsàn tó ti wà tẹ́lẹ̀', none: 'Kò sí èyí', notes: 'Ohun mìíràn tí a yẹ kí a mọ̀', notesPlaceholder: 'Ẹ̀hun, àlàyé pàtàkì, tàbí ìbéèrè…', trustedTitle: 'Àwọn ènìyàn tí o fọkàn tán', trustedHelp: 'Fi ènìyàn kan kún un tí o lè fẹ́ kàn sí ní pàjáwìrì.', addContact: 'Fi ẹni tí o fọkàn tán kún un', contactName: 'Orúkọ ẹni náà', relationship: 'Ìbáṣepọ̀', contactPhone: 'Nọ́mbà fóònù', reviewTitle: 'Ṣàyẹ̀wò rẹ kíákíá', reviewHelp: 'Rí i dájú pé gbogbo nǹkan tọ́.', completeTitle: 'O ti parí.', completeBody: 'Ọ̀rẹ́ ìlera rẹ ti ṣetán láti ràn ọ́ lọ́wọ́.', enterApp: 'Ṣí Iranwo', dashboard: 'Ààyè rẹ', goodDay: 'Ìtọ́jú díẹ̀ lè ṣe púpọ̀.', emergency: 'Pàjáwìrì SOS', talk: 'Bá Iranwo sọ̀rọ̀', talkBody: 'Béèrè ìbéèrè nípa ìlera.', nearby: 'Ìtọ́jú tó sún mọ́ ọ', nearbyBody: 'Wo àwọn ilé ìtọ́jú àpẹẹrẹ.', healthSnapshot: 'Àkótán ìlera rẹ', conditionsSaved: 'àìsàn tí a fipamọ́', trustedSaved: 'ènìyàn tí o fọkàn tán', chatTitle: 'Jẹ́ ká jíròrò rẹ̀', chatHelp: 'Mo lè pín ìmọ̀ ìlera gbogbogbò. Mi ò ṣe dókítà.', chatPlaceholder: 'Kí ni o fẹ́ béèrè?', send: 'Fi ránṣẹ́', clinicsTitle: 'Ìtọ́jú tó sún mọ́ ọ', clinicsHelp: 'Àwọn àpẹẹrẹ ni wọ̀nyí; ṣàyẹ̀wò wọn kí o tó lọ.', profileTitle: 'Àkọsílẹ̀ rẹ', save: 'Fipamọ́', saved: 'A ti fipamọ́', urgentTitle: 'O yẹ kí o rí ìrànlọ́wọ́ báyìí.', urgentBody: 'Tí ẹnikan kò bá mọ̀ ara rẹ̀, tí ó bá ń ṣòro láti mí, tàbí tó bá wà nínú ewu, pe iṣẹ́ pàjáwìrì lẹ́sẹ̀kẹsẹ̀.', callEmergency: 'Pe iṣẹ́ pàjáwìrì', callTrusted: 'Pe ẹni tí o fọkàn tán', messageTrusted: 'Ṣètò SMS pàjáwìrì', emergencyNote: 'Fóònù rẹ yóò ṣí ohun èlò ìpè tàbí ìfiránṣẹ́.', noContacts: 'Fi ẹni tí o fọkàn tán kún àkọsílẹ̀ rẹ.', cancel: 'Pa ojú ìwé yìí', online: 'A ti ṣetán', settings: 'Àkọsílẹ̀ àti ètò', symptom: 'Kí ni o ń nírìírí rẹ̀?', chooseContact: 'Yan ẹni kan', contactAdded: 'A ti fi ẹni náà kún un', invalidPhone: 'Tẹ nọ́mbà fóònù tó tọ́.', required: 'A nílò àlàyé yìí.', ageError: 'Tẹ ọjọ́ orí láàárín 1 sí 120.', chatDisclaimer: 'Iranwo lè ṣàṣìṣe. Fún àmì pàjáwìrì, wá ìtọ́jú ọ̀jọ̀gbọ́n.', languageNames: 'English, Yorùbá, Nigerian Pidgin, Hausa, Igbo'
  },
  pcm: {
    tagline: 'Your health, with better care.', welcomeTitle: 'Care wey dey close to you.', welcomeBody: 'Your health companion for questions, next steps, and the moments wey matter.', getStarted: 'Make we know you small', already: 'You don set am up? Continue', chooseLanguage: 'Choose your language', languageHelp: 'You fit change am anytime for profile.', continue: 'Continue', back: 'Go back', yourDetails: 'Small thing about you', detailsHelp: 'This one go help make your experience better.', fullName: 'Full name', namePlaceholder: 'Wetin we go call you?', age: 'Age', sex: 'Sex', selectSex: 'Choose sex', female: 'Female', male: 'Male', intersex: 'Intersex', preferNot: 'I no wan talk', country: 'Country', phone: 'Phone number', phoneHelp: 'Choose country code; we go check the number.', healthHistory: 'Your health story', healthHelp: 'Choose any condition wey you get. You fit update am later.', conditions: 'Medical conditions wey you get', none: 'None of these', notes: 'Anything else wey we suppose know?', notesPlaceholder: 'Allergy, important info, or question…', trustedTitle: 'Your trusted people', trustedHelp: 'Add person wey you fit need for emergency. Na you choose to call or message dem.', addContact: 'Add trusted person', contactName: 'Contact name', relationship: 'Relationship', contactPhone: 'Contact phone', reviewTitle: 'Check am small', reviewHelp: 'Make sure say everything correct.', completeTitle: 'You don set!', completeBody: 'Your health companion dey ready when you need help.', enterApp: 'Enter Iranwo', dashboard: 'Your space', goodDay: 'Small care fit do plenty.', emergency: 'SOS emergency', talk: 'Talk to Iranwo', talkBody: 'Ask health question with simple words.', nearby: 'Care near you', nearbyBody: 'See sample clinics and helpful places.', healthSnapshot: 'Your health snapshot', conditionsSaved: 'conditions saved', trustedSaved: 'trusted people', chatTitle: 'Make we talk am', chatHelp: 'I fit share general health info, but I no be doctor.', chatPlaceholder: 'Wetin dey your mind?', send: 'Send', clinicsTitle: 'Care near you', clinicsHelp: 'Na sample listings. Confirm before you go.', profileTitle: 'Your profile', save: 'Save changes', saved: 'Saved', urgentTitle: 'You need help now.', urgentBody: 'If person no dey conscious, dey struggle to breathe, dey get seizure, or dey immediate danger, contact emergency service now.', callEmergency: 'Call emergency service', callTrusted: 'Call trusted person', messageTrusted: 'Prepare emergency SMS', emergencyNote: 'Your phone go open call or message app. Website no fit secretly call or confirm message delivery.', noContacts: 'Add trusted person for your profile.', cancel: 'Close emergency screen', online: 'Ready to help', settings: 'Profile & settings', symptom: 'Wetin you dey feel?', chooseContact: 'Choose contact', contactAdded: 'Contact don add', invalidPhone: 'Enter correct phone number for the country.', required: 'This field na required.', ageError: 'Enter age between 1 and 120.', chatDisclaimer: 'Iranwo fit make mistake. For urgent symptoms, seek professional care.', languageNames: 'English, Yorùbá, Nigerian Pidgin, Hausa, Igbo'
  },
  ha: {
    tagline: 'Lafiyarka, tare da kulawa.', welcomeTitle: 'Kulawa kusa da kai.', welcomeBody: 'Abokin taimakon lafiya don tambayoyi da matakan da suka dace.', getStarted: 'Mu san ka kaɗan', already: 'Ka riga ka saita? Ci gaba', chooseLanguage: 'Zaɓi harshenka', languageHelp: 'Za ka iya canza wannan daga baya.', continue: 'Ci gaba', back: 'Koma baya', yourDetails: 'Ɗan bayani game da kai', detailsHelp: 'Wannan zai taimaka wajen inganta amfani da manhajar.', fullName: 'Cikakken suna', namePlaceholder: 'Me za mu kira ka?', age: 'Shekaru', sex: 'Jinsi', selectSex: 'Zaɓi jinsi', female: 'Mace', male: 'Namiji', intersex: 'Intersex', preferNot: 'Ba na son faɗa', country: 'Ƙasa', phone: 'Lambar waya', phoneHelp: 'Zaɓi lambar ƙasa; za mu duba lambar wayar.', healthHistory: 'Tarihin lafiyarka', healthHelp: 'Zaɓi cututtukan da kake da su idan akwai.', conditions: 'Cututtukan da kake da su', none: 'Babu ɗaya daga ciki', notes: 'Wani abu da ya kamata mu sani?', notesPlaceholder: 'Allergy, bayani mai muhimmanci ko tambaya…', trustedTitle: 'Mutanen da ka amince da su', trustedHelp: 'Ƙara wanda za ka iya buƙata a lokacin gaggawa.', addContact: 'Ƙara amintaccen mutum', contactName: 'Sunan mutum', relationship: 'Dangantaka', contactPhone: 'Lambar wayarsa', reviewTitle: 'Duba bayananka', reviewHelp: 'Tabbatar cewa bayanan sun yi daidai.', completeTitle: 'An gama!', completeBody: 'Abokin taimakon lafiyarka ya shirya don taimaka maka.', enterApp: 'Buɗe Iranwo', dashboard: 'Wurinka', goodDay: 'Ƙaramin kulawa tana da amfani.', emergency: 'Gaggawa SOS', talk: 'Yi magana da Iranwo', talkBody: 'Tambayi game da lafiya cikin sauƙi.', nearby: 'Kulawa kusa', nearbyBody: 'Duba misalan asibitoci da ayyuka.', healthSnapshot: 'Taƙaitaccen lafiyarka', conditionsSaved: 'cututtuka da aka adana', trustedSaved: 'amintattun mutane', chatTitle: 'Mu tattauna', chatHelp: 'Zan iya ba da bayanin lafiya na gaba ɗaya. Ni ba likita ba ne.', chatPlaceholder: 'Me kake son tambaya?', send: 'Aika', clinicsTitle: 'Kulawa kusa', clinicsHelp: 'Waɗannan misalai ne. Tabbatar kafin ziyara.', profileTitle: 'Bayanan ka', save: 'Ajiye canje-canje', saved: 'An ajiye', urgentTitle: 'Kana buƙatar taimako yanzu.', urgentBody: 'Idan mutum ba ya farke, yana fama da numfashi, yana kamuwa da farfaɗiya, ko yana cikin haɗari, kira agajin gaggawa yanzu.', callEmergency: 'Kira agajin gaggawa', callTrusted: 'Kira amintaccen mutum', messageTrusted: 'Shirya saƙon gaggawa', emergencyNote: 'Wayarka za ta buɗe manhajar kira ko saƙo.', noContacts: 'Ƙara amintaccen mutum a bayananka.', cancel: 'Rufe shafin gaggawa', online: 'A shirye don taimako', settings: 'Bayanan ka da saituna', symptom: 'Me kake ji?', chooseContact: 'Zaɓi mutum', contactAdded: 'An ƙara mutum', invalidPhone: 'Shigar da ingantacciyar lambar waya.', required: 'Ana buƙatar wannan filin.', ageError: 'Shigar da shekaru daga 1 zuwa 120.', chatDisclaimer: 'Iranwo na iya yin kuskure. Don gaggawa, nemi taimakon ƙwararru.', languageNames: 'English, Yorùbá, Nigerian Pidgin, Hausa, Igbo'
  },
  ig: {
    tagline: 'Ahụ ike gị, na nlekọta ka mma.', welcomeTitle: 'Nlekọta dị gị nso.', welcomeBody: 'Enyi ga-enyere gị aka n’ajụjụ gbasara ahụ ike na ihe ị ga-eme ọzọ.', getStarted: 'Ka anyị mata gị ntakịrị', already: 'Ị haziela ya? Gaa n’ihu', chooseLanguage: 'Họrọ asụsụ gị', languageHelp: 'Ị nwere ike ịgbanwe nke a mgbe ọ bụla.', continue: 'Gaa n’ihu', back: 'Laghachi azụ', yourDetails: 'Obere ihe gbasara gị', detailsHelp: 'Nke a ga-enyere anyị aka ime ka ahụmịhe gị ka mma.', fullName: 'Aha zuru ezu', namePlaceholder: 'Gịnị ka anyị ga-akpọ gị?', age: 'Afọ', sex: 'Mmekọahụ', selectSex: 'Họrọ mmekọahụ', female: 'Nwanyị', male: 'Nwoke', intersex: 'Intersex', preferNot: 'Achọghị m ikwu', country: 'Mba', phone: 'Nọmba ekwentị', phoneHelp: 'Họrọ koodu mba; anyị ga-enyocha nọmba ahụ.', healthHistory: 'Akụkọ ahụ ike gị', healthHelp: 'Họrọ ọrịa ọ bụla ị nwere ma ọ bụrụ na ọ dị.', conditions: 'Ọrịa ndị ị nwere', none: 'Ọ dịghị nke ọ bụla', notes: 'Ihe ọzọ anyị kwesịrị ịma?', notesPlaceholder: 'Allergy, ozi dị mkpa, ma ọ bụ ajụjụ…', trustedTitle: 'Ndị ị tụkwasịrị obi', trustedHelp: 'Tinye onye ị nwere ike ịchọ n’oge mberede.', addContact: 'Tinye onye ị tụkwasịrị obi', contactName: 'Aha onye ahụ', relationship: 'Mmekọrịta', contactPhone: 'Nọmba ekwentị ya', reviewTitle: 'Lelee ya ngwa ngwa', reviewHelp: 'Gbaa mbọ hụ na ihe niile ziri ezi.', completeTitle: 'Ị dịla njikere!', completeBody: 'Enyi ahụ ike gị dị njikere inyere gị aka mgbe ịchọrọ ya.', enterApp: 'Mepee Iranwo', dashboard: 'Ebe gị', goodDay: 'Obere nlekọta na-eme nnukwu ihe.', emergency: 'Mberede SOS', talk: 'Gwa Iranwo okwu', talkBody: 'Jụọ ajụjụ gbasara ahụ ike n’asụsụ dị mfe.', nearby: 'Nlekọta dị nso', nearbyBody: 'Lelee ụlọ ọgwụ ihe atụ na ọrụ enyemaka.', healthSnapshot: 'Nchịkọta ahụ ike gị', conditionsSaved: 'ọrịa echekwara', trustedSaved: 'ndị a tụkwasịrị obi', chatTitle: 'Ka anyị kparịta ya', chatHelp: 'Enwere m ike ịkekọrịta ozi ahụ ike izugbe. Abụghị m dọkịta.', chatPlaceholder: 'Gịnị ka ị chọrọ ịjụ?', send: 'Zipụ', clinicsTitle: 'Nlekọta dị nso', clinicsHelp: 'Ndepụta ndị a bụ ihe atụ. Kwenye tupu ịga.', profileTitle: 'Profaịlụ gị', save: 'Chekwa mgbanwe', saved: 'Echekwara', urgentTitle: 'Ị chọrọ enyemaka ugbu a.', urgentBody: 'Ọ bụrụ na mmadụ amaghị onwe ya, ọ na-esiri ya ike iku ume, ọ na-adọkpụ, ma ọ bụ nọ n’ihe egwu, kpọọ ọrụ mberede ugbu a.', callEmergency: 'Kpọọ ọrụ mberede', callTrusted: 'Kpọọ onye ị tụkwasịrị obi', messageTrusted: 'Kwadebe ozi SMS mberede', emergencyNote: 'Ekwentị gị ga-emepe ngwa oku ma ọ bụ ozi.', noContacts: 'Tinye onye ị tụkwasịrị obi na profaịlụ gị.', cancel: 'Mechie ihuenyo mberede', online: 'Dị njikere inyere aka', settings: 'Profaịlụ na ntọala', symptom: 'Kedu ihe ị na-enwe?', chooseContact: 'Họrọ onye', contactAdded: 'Etinyela onye ahụ', invalidPhone: 'Tinye nọmba ekwentị ziri ezi.', required: 'A chọrọ mpaghara a.', ageError: 'Tinye afọ dị n’etiti 1 na 120.', chatDisclaimer: 'Iranwo nwere ike ihie ụzọ. Maka mberede, chọọ enyemaka ọkachamara.', languageNames: 'English, Yorùbá, Nigerian Pidgin, Hausa, Igbo'
  }
}

const languageOptions: { id: Language; name: string; native: string; flag: string }[] = [
  { id: 'en', name: 'English', native: 'English', flag: '🌍' },
  { id: 'yo', name: 'Yoruba', native: 'Yorùbá', flag: '🇳🇬' },
  { id: 'pcm', name: 'Nigerian Pidgin', native: 'Naija Pidgin', flag: '🇳🇬' },
  { id: 'ha', name: 'Hausa', native: 'Hausa', flag: '🇳🇬' },
  { id: 'ig', name: 'Igbo', native: 'Asụsụ Igbo', flag: '🇳🇬' },
]
const countryOptions = [
  { code: 'NG', name: 'Nigeria', dial: '+234', digits: 10, flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', dial: '+233', digits: 9, flag: '🇬🇭' },
  { code: 'KE', name: 'Kenya', dial: '+254', digits: 9, flag: '🇰🇪' },
  { code: 'ZA', name: 'South Africa', dial: '+27', digits: 9, flag: '🇿🇦' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', digits: 10, flag: '🇬🇧' },
  { code: 'US', name: 'United States', dial: '+1', digits: 10, flag: '🇺🇸' },
  { code: 'IN', name: 'India', dial: '+91', digits: 10, flag: '🇮🇳' },
]
const conditionData: { id: Condition; title: string; description: string; emoji: string; detail: string }[] = [
  { id: 'sickle', title: 'Sickle cell disease', description: 'Blood and pain management', emoji: '🩸', detail: 'Sickle-shaped red blood cells can affect blood flow and cause pain episodes.' },
  { id: 'asthma', title: 'Asthma', description: 'Breathing and airway health', emoji: '🫁', detail: 'Asthma can narrow airways. A severe breathing problem needs urgent medical help.' },
  { id: 'diabetes', title: 'Diabetes', description: 'Blood sugar management', emoji: '🩺', detail: 'Diabetes affects how the body manages blood glucose.' },
  { id: 'seizures', title: 'Epilepsy / seizures', description: 'Neurological health', emoji: '🧠', detail: 'Seizures have different causes. A prolonged or repeated seizure can be an emergency.' },
  { id: 'hypertension', title: 'High blood pressure', description: 'Heart and circulation', emoji: '❤️', detail: 'Blood pressure monitoring and clinician-guided care can help manage hypertension.' },
  { id: 'heart', title: 'Heart condition', description: 'Heart health and monitoring', emoji: '💗', detail: 'New chest pain, fainting, or severe breathlessness needs urgent assessment.' },
  { id: 'other', title: 'Another condition', description: 'Add context below', emoji: '➕', detail: 'You can add a short note to help personalize the experience.' },
]
const clinics = [
  { name: 'Community Health Centre', type: 'Primary care · Demo listing', distance: '1.2 km', address: 'Example Road, Lagos', icon: '🏥' },
  { name: 'Greenview Family Clinic', type: 'Family medicine · Demo listing', distance: '2.4 km', address: 'Sample Avenue, Lagos', icon: '🩺' },
  { name: 'City Specialist Hospital', type: 'Hospital · Demo listing', distance: '3.8 km', address: 'Illustrative Street, Lagos', icon: '🏨' },
]
const initialMessages = [
  { role: 'assistant', text: 'Hi! I’m here to help you think through general health questions. What would you like to understand today?' },
]
const key = 'iranwo-next-v1'

function readSaved(): { profile: Profile; onboarded: boolean } {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { profile: { ...blankProfile, ...parsed.profile, customConditions: Array.isArray(parsed.profile?.customConditions) ? parsed.profile.customConditions : [] }, onboarded: Boolean(parsed.onboarded) }
    }
  } catch { /* storage unavailable */ }
  return { profile: blankProfile, onboarded: false }
}

function DoctorMark() {
  return <div className="doctor-mark" aria-label="Iranwo doctor and stethoscope logo">
    <svg viewBox="0 0 120 120" role="img" aria-hidden="true">
      <defs><linearGradient id="coat" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#dcebe0"/></linearGradient></defs>
      <circle cx="60" cy="60" r="57" fill="#e7f0e4"/>
      <path d="M35 24v22a17 17 0 0 0 34 0V24" fill="none" stroke="#315e49" strokeWidth="5" strokeLinecap="round"/>
      <path d="M27 24h16M61 24h16" stroke="#315e49" strokeWidth="5" strokeLinecap="round"/>
      <circle cx="35" cy="24" r="5" fill="#315e49"/><circle cx="69" cy="24" r="5" fill="#315e49"/>
      <path d="M43 53l-9 8 7 30h38l7-30-9-8-7 13H50z" fill="url(#coat)" stroke="#b7cebd" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M52 57l8 8 8-8M60 65v20" fill="none" stroke="#315e49" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M69 46v16a14 14 0 0 0 28 0v-4" fill="none" stroke="#315e49" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="97" cy="53" r="6" fill="#d9a75e" stroke="#315e49" strokeWidth="2"/>
      <path d="M60 84v7" stroke="#315e49" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="60" cy="94" r="4" fill="#d9a75e"/>
    </svg>
    <span className="mark-spark spark-one">✦</span><span className="mark-spark spark-two">✧</span>
  </div>
}

function ConditionArt({ id }: { id: Condition }) {
  return <div className={`condition-art art-${id}`} aria-hidden="true">
    {id === 'sickle' ? <svg viewBox="0 0 100 72"><ellipse cx="24" cy="24" rx="17" ry="11" fill="#df6c6b" transform="rotate(20 24 24)"/><ellipse cx="24" cy="24" rx="8" ry="4" fill="#f9b0a6" transform="rotate(20 24 24)"/><path d="M55 48c-18-1-24-20-8-30 3 14 16 17 29 10-3 12-9 19-21 20z" fill="#b9273c" stroke="#8e2638" strokeWidth="2"/><path d="M59 42c-7-4-8-12-3-17" fill="none" stroke="#f5a5a3" strokeWidth="3" strokeLinecap="round"/><ellipse cx="76" cy="19" rx="12" ry="8" fill="#e77877" transform="rotate(-28 76 19)"/></svg>
      : id === 'asthma' ? <svg viewBox="0 0 100 72"><path d="M50 11v22M50 31L33 43M50 31l17 12" fill="none" stroke="#438f87" strokeWidth="5" strokeLinecap="round"/><path d="M33 41C18 31 14 53 22 61c7 7 22 2 25-9V34M67 41c15-10 19 12 11 20-7 7-22 2-25-9V34" fill="#bce4d7" stroke="#438f87" strokeWidth="2"/><path d="M5 20h18m-7-6 7 6-7 6M77 20h18m-7-6-7 6 7 6" fill="none" stroke="#d79b53" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      : id === 'diabetes' ? <svg viewBox="0 0 100 72"><path d="M50 10C40 26 27 39 27 49a23 23 0 0 0 46 0C73 39 60 26 50 10z" fill="#f2b3a4" stroke="#d87f72" strokeWidth="2"/><path d="M38 49a12 12 0 0 0 12 12" fill="none" stroke="#fff1dd" strokeWidth="4" strokeLinecap="round"/><circle cx="72" cy="19" r="12" fill="#e1edb9" stroke="#72996c" strokeWidth="2"/><path d="M67 19h10m-5-5v10" stroke="#72996c" strokeWidth="2" strokeLinecap="round"/></svg>
      : id === 'seizures' ? <svg viewBox="0 0 100 72"><path d="M49 9c-13 0-22 9-22 21 0 8 4 13 10 17v13h25V47c7-4 11-10 11-18 0-12-10-20-24-20z" fill="#d8d2f4" stroke="#8779bd" strokeWidth="2"/><path d="M47 15l-8 15h11l-5 12 18-19H51l5-8z" fill="#f4b75d" stroke="#b77b2e" strokeWidth="1.5" strokeLinejoin="round"/><path d="M20 17l5 4M78 49l5 4M18 53l5-2" stroke="#a59bd6" strokeWidth="3" strokeLinecap="round"/></svg>
      : id === 'hypertension' ? <svg viewBox="0 0 100 72"><path d="M50 58S16 38 23 21c5-12 20-10 27 1 7-11 22-13 27-1 7 17-27 37-27 37z" fill="#e58b92" stroke="#bd5d6a" strokeWidth="2"/><path d="M18 49h15l6-12 8 22 8-17 6 7h20" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
      : id === 'heart' ? <svg viewBox="0 0 100 72"><path d="M50 58S16 38 23 21c5-12 20-10 27 1 7-11 22-13 27-1 7 17-27 37-27 37z" fill="#e87883" stroke="#bc4f62" strokeWidth="2"/><path d="M15 42h16l6-10 8 21 7-13 5 4h18" fill="none" stroke="#fff1e6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
      : <div className="other-art-plus"><Plus size={42}/></div>}
  </div>
}

function App() {
  const saved = useMemo(readSaved, [])
  const [profile, setProfile] = useState<Profile>(saved.profile)
  const [onboarded, setOnboarded] = useState(saved.onboarded)
  const [screen, setScreen] = useState<Screen>(saved.onboarded ? 'home' : 'welcome')
  const [stepDirection, setStepDirection] = useState<'next' | 'back'>('next')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [contactDraft, setContactDraft] = useState<Contact>({ name: '', relationship: 'Family', country: 'NG', phone: '' })
  const [editingProfile, setEditingProfile] = useState(false)
  const [chatText, setChatText] = useState('')
  const [messages, setMessages] = useState(initialMessages)
  const [busy, setBusy] = useState(false)
  const [safetyAssessment, setSafetyAssessment] = useState<SafetyAssessment | null>(null)
  const [aiProcessingConsent, setAiProcessingConsent] = useState(false)
  const [aiProfileContextConsent, setAiProfileContextConsent] = useState(false)
  const [lastAgentAssessments, setLastAgentAssessments] = useState<AgentAssessments | null>(null)
  const [aiSuggestedEscalation, setAiSuggestedEscalation] = useState(false)
  const [toast, setToast] = useState('')
  const [emergencyContactIndex, setEmergencyContactIndex] = useState('0')
  const [showContactForm, setShowContactForm] = useState(false)
  const [customConditionDraft, setCustomConditionDraft] = useState('')
  const t = copy[profile.language] ?? copy.en
  const selectedCountry = countryOptions.find(c => c.code === profile.country) ?? countryOptions[0]
  const localPhoneDigits = profile.phone.replace(/\D/g, '')
  const contactCountry = countryOptions.find(c => c.code === contactDraft.country) ?? countryOptions[0]
  const localContactDigits = contactDraft.phone.replace(/\D/g, '')
  const onboardingSteps: Screen[] = ['language', 'personal', 'health', 'contacts', 'review', 'complete']
  const stepIndex = onboardingSteps.indexOf(screen)

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify({ profile, onboarded })) } catch { /* storage can be unavailable */ }
  }, [profile, onboarded])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(id)
  }, [toast])

  const setField = <K extends keyof Profile>(field: K, value: Profile[K]) => setProfile(p => ({ ...p, [field]: value }))

  const toggleCondition = (id: Condition) => {
    setProfile(current => ({
      ...current,
      conditions: current.conditions.includes(id)
        ? current.conditions.filter(condition => condition !== id)
        : [...current.conditions, id],
    }))
  }

  const addCustomCondition = () => {
    const condition = customConditionDraft.trim()

    if (!condition) {
      setToast('Enter a condition name first.')
      return
    }

    const alreadyAdded = profile.customConditions.some(
      item => item.toLocaleLowerCase() === condition.toLocaleLowerCase()
    )

    if (alreadyAdded) {
      setToast('That condition is already on your list.')
      return
    }

    setField('customConditions', [...profile.customConditions, condition])
    setCustomConditionDraft('')
    setToast('Additional condition added.')
  }

  const removeCustomCondition = (index: number) => {
    setField(
      'customConditions',
      profile.customConditions.filter((_, itemIndex) => itemIndex !== index)
    )
  }
  const go = (target: Screen, direction: 'next' | 'back' = 'next') => {
    setStepDirection(direction)
    setErrors({})
    setScreen(target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const validatePersonal = () => {
    const next: Record<string, string> = {}
    if (!profile.name.trim()) next.name = t.required
    const age = Number(profile.age)
    if (!profile.age || !Number.isInteger(age) || age < 1 || age > 120) next.age = t.ageError
    if (!profile.sex) next.sex = t.required
    if (profile.phone && localPhoneDigits.length !== selectedCountry.digits) next.phone = t.invalidPhone
    setErrors(next)
    return Object.keys(next).length === 0
  }
  const validateContacts = () => {
    if (!showContactForm) return true
    const next: Record<string, string> = {}
    if (!contactDraft.name.trim()) next.contactName = t.required
    if (localContactDigits.length !== contactCountry.digits) next.contactPhone = t.invalidPhone
    setErrors(next)
    return Object.keys(next).length === 0
  }
  const addContact = () => {
    if (!validateContacts()) return
    setField('contacts', [...profile.contacts, { ...contactDraft, phone: localContactDigits }])
    setContactDraft({ name: '', relationship: 'Family', country: 'NG', phone: '' })
    setShowContactForm(false)
    setErrors({})
    setToast(t.contactAdded)
  }
  const nextFromPersonal = () => { if (validatePersonal()) go('health') }
  const finish = () => { setOnboarded(true); go('complete') }
  const continueAfterOnboarding = () => { setOnboarded(true); go('home') }

  const sendMessage = async () => {
    const text = chatText.trim()
    if (!text || busy) return

    // Do not block here: the local safety screen must run even when cloud-AI
    // consent is absent or the selected language is not yet supported.

    const history = messages.slice(-8).map(message => ({
      role: message.role as 'user' | 'assistant',
      text: message.text,
    }))
    setMessages(current => [...current, { role: 'user', text }])
    setChatText('')
    setSafetyAssessment(null)
    setAiSuggestedEscalation(false)
    setLastAgentAssessments(null)
    setBusy(true)

    try {
      const result = await runAssistantTurn({
        message: text,
        history,
        language: profile.language,
        consentAccepted: aiProcessingConsent,
        profileContext: aiProfileContextConsent ? {
          age: profile.age && Number.isFinite(Number(profile.age)) ? Number(profile.age) : null,
          sex: profile.sex || null,
          conditions: [
            ...profile.conditions.filter(condition => condition !== 'other').map(condition => conditionData.find(item => item.id === condition)?.title ?? condition),
            ...profile.customConditions,
          ].filter(Boolean),
          notes: profile.notes.trim() || null,
        } : undefined,
      })

      if (result.kind === 'safety') {
        setSafetyAssessment(result.assessment)
      } else if (result.kind === 'ai') {
        const { response } = result
        setLastAgentAssessments(response.agents)
        const shouldOfferHelp = response.agents.riskAssessment.level === 'emergency'
          || response.agents.riskAssessment.level === 'urgent'
          || response.agents.responseEscalation.humanSupportRecommended
        setAiSuggestedEscalation(shouldOfferHelp)
        setMessages(current => [...current, { role: 'assistant', text: response.assistantMessage }])
      } else if (result.kind === 'demo') {
        setMessages(current => [...current, { role: 'assistant', text: result.text }])
      } else if (result.kind === 'consent_required') {
        setMessages(current => [...current, { role: 'assistant', text: 'Please review the AI data-processing notice below before using the connected AI service. Your message was screened locally and was not sent to the model.' }])
      } else if (result.kind === 'unsupported_language') {
        setMessages(current => [...current, { role: 'assistant', text: 'The local safety screen ran, but the connected Gemma test currently supports English only. Switch the chat language to English to test model responses. Your message was not sent to the model.' }])
      } else {
        setMessages(current => [...current, { role: 'assistant', text: `${result.message} Your message has not received an AI assessment. For urgent symptoms, open Emergency Help.` }])
      }
    } catch {
      setMessages(current => [...current, { role: 'assistant', text: 'Iranwo could not process that message. Please try again, or use Emergency Help if someone may be in immediate danger.' }])
    } finally {
      setBusy(false)
    }
  }

  const confirmSafetyIsCurrent = () => {
    if (!safetyAssessment) return
    const confirmed = confirmCurrentEmergency(safetyAssessment)
    setSafetyAssessment(confirmed)
  }

  const dismissSafetyClarification = () => {
    if (!safetyAssessment) return
    const dismissed = dismissClarification(safetyAssessment)
    setSafetyAssessment(null)
    setMessages(current => [...current, { role: 'assistant', text: dismissed.userMessage }])
  }

  const openEmergency = () => go('emergency')
  const emergencyNumber = (import.meta.env.VITE_IRANWO_EMERGENCY_NUMBER || '112').replace(/[^\d+]/g, '')
  const selectedTrusted = profile.contacts[Number(emergencyContactIndex)] ?? profile.contacts[0]
  const trustedE164 = selectedTrusted ? `${(countryOptions.find(c => c.code === selectedTrusted.country) ?? countryOptions[0]).dial}${selectedTrusted.phone.replace(/\D/g, '').replace(/^0+/, '')}` : ''
  const trustedSmsBody = encodeURIComponent(`Emergency: I may need urgent help. Please contact me now. ${profile.name ? `— ${profile.name}` : ''}`)
  const emergencySms = selectedTrusted ? `sms:${trustedE164}?body=${trustedSmsBody}` : '#'

  const stepProgress = Math.max(0, onboardingSteps.indexOf(screen)) / (onboardingSteps.length - 1) * 100
  const conditionNames = (id: Condition) => conditionData.find(c => c.id === id)?.title ?? id
  const selectedConditionNames = [
    ...profile.conditions.filter(id => id !== 'other').map(conditionNames),
    ...profile.customConditions,
  ]
  const selectedConditionCount = selectedConditionNames.length

  const handleEmergencyCall = () => {
    window.location.href = `tel:${emergencyNumber}`
  }

  return <div className="app-shell">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    {screen !== 'welcome' && screen !== 'language' && screen !== 'personal' && screen !== 'health' && screen !== 'contacts' && screen !== 'review' && screen !== 'complete' && <header className="app-header">
      <button className="brand-lockup" onClick={() => go('home')} aria-label="Iranwo home"><span className="brand-icon"><Stethoscope size={19}/></span><span>iranwo<span className="brand-dot">.</span></span></button>
      <div className="header-right"><span className="status-pill"><span className="status-dot"/>{t.online}</span><button className="icon-button" onClick={() => { setEditingProfile(true); go('profile') }} aria-label={t.settings}><Settings size={18}/></button><button className="sos-mini" onClick={openEmergency}><Siren size={16}/><span>SOS</span></button></div>
    </header>}

    <main className={`main-stage screen-${screen} transition-${stepDirection}`} key={screen}>
      {screen === 'welcome' && (
        <WelcomeLanding
          bodyText={t.welcomeBody}
          getStartedText={t.getStarted}
          showContinue={saved.onboarded}
          onGetStarted={() => go('language')}
          onContinue={() => go('home')}
          onEmergency={openEmergency}
        />
      )}

      {screen === 'language' && <section className="onboarding-card language-screen">
        <StepTop step={1} total={6} progress={stepProgress} back={() => go('welcome', 'back')} t={t}/>
        <div className="section-icon"><Languages size={24}/></div><p className="eyebrow">FIRST, LET’S MAKE IT YOURS</p><h1 style={{ fontWeight: 400 }}>{t.chooseLanguage}</h1><p className="muted">{t.languageHelp}</p>
        <div className="language-grid">{languageOptions.map(l => <button key={l.id} className={`language-option ${profile.language === l.id ? 'selected' : ''}`} onClick={() => setField('language', l.id)}><span className="language-flag">{l.flag}</span><span className="language-label"><strong>{l.name}</strong><small>{l.native}</small></span><span className="radio-mark">{profile.language === l.id && <Check size={14}/>}</span></button>)}</div>
        <div className="card-bottom"><span className="small-note"><ShieldCheck size={15}/> Language can be changed later.</span><button className="button button-primary" onClick={() => go('personal')}>{t.continue}<ArrowRight size={17}/></button></div>
      </section>}

      {screen === 'personal' && <section className="onboarding-card">
        <StepTop step={2} total={6} progress={stepProgress} back={() => go('language', 'back')} t={t}/>
        <div className="section-icon"><UserRound size={24}/></div><p className="eyebrow">LET’S START WITH THE BASICS</p><h1 style={{ fontWeight: 400 }}>{t.yourDetails}</h1><p className="muted">{t.detailsHelp}</p>
        <div className="form-grid">
          <Field label={t.fullName} required error={errors.name}><input autoComplete="name" value={profile.name} onChange={e => setField('name', e.target.value)} placeholder={t.namePlaceholder} aria-invalid={!!errors.name}/></Field>
          <Field label={t.age} required error={errors.age}><input type="number" inputMode="numeric" min="1" max="120" value={profile.age} onChange={e => setField('age', e.target.value)} placeholder="e.g. 24" aria-invalid={!!errors.age}/></Field>
          <Field label={t.sex} required error={errors.sex}><select value={profile.sex} onChange={e => setField('sex', e.target.value as Sex)} aria-invalid={!!errors.sex}><option value="">{t.selectSex}</option><option value="Female">{t.female}</option><option value="Male">{t.male}</option><option value="Intersex">{t.intersex}</option><option value="Prefer not to say">{t.preferNot}</option></select></Field>
          <Field label={t.country}><select value={profile.country} onChange={e => { setField('country', e.target.value); setField('phone', '') }}>{countryOptions.map(c => <option value={c.code} key={c.code}>{c.flag} {c.name} ({c.dial})</option>)}</select></Field>
          <Field label={t.phone} hint={t.phoneHelp} error={errors.phone}><div className="phone-control"><span className="dial-code">{selectedCountry.dial}</span><input type="tel" inputMode="numeric" autoComplete="tel-national" value={profile.phone} maxLength={selectedCountry.digits} onChange={e => setField('phone', e.target.value.replace(/\D/g, '').slice(0, selectedCountry.digits))} placeholder={'•'.repeat(selectedCountry.digits)} aria-invalid={!!errors.phone}/><span className="digit-count">{localPhoneDigits.length}/{selectedCountry.digits}</span></div></Field>
        </div>
        <div className="card-bottom"><span className="small-note"><span className="required-dot">*</span> Required information</span><button className="button button-primary" onClick={nextFromPersonal}>{t.continue}<ArrowRight size={17}/></button></div>
      </section>}

      {screen === 'health' && <section className="onboarding-card health-screen">
        <StepTop step={3} total={6} progress={stepProgress} back={() => go('personal', 'back')} t={t}/>
        <div className="section-icon"><HeartPulse size={24}/></div><p className="eyebrow">CARE THAT KNOWS YOUR CONTEXT</p><h1 style={{ fontWeight: 400 }}>{t.healthHistory}</h1><p className="muted">{t.healthHelp}</p><div className="condition-heading"><strong>{t.conditions}</strong><span>{selectedConditionCount} selected</span></div>
        <div className="condition-grid">{conditionData.map(c => { const checked = profile.conditions.includes(c.id); return <button type="button" key={c.id} className={`condition-card ${checked ? 'condition-selected' : ''}`} onClick={() => toggleCondition(c.id)} aria-pressed={checked}><span className="condition-check">{checked && <Check size={13}/>}</span><ConditionArt id={c.id}/><span className="condition-title">{c.title}</span><span className="condition-description">{c.description}</span>{checked && <span className="condition-detail">{c.detail}</span>}</button> })}</div>
        {(profile.conditions.includes('other') || profile.customConditions.length > 0) && <div className="contact-form panel-in custom-condition-form">
          <Field label="Additional health condition" hint="Enter a condition that is not listed above. You can add more than one.">
            <input value={customConditionDraft} onChange={e => setCustomConditionDraft(e.target.value)} placeholder="e.g. Thyroid condition"/>
          </Field>
          <div className="inline-actions"><button type="button" className="button button-primary" onClick={addCustomCondition}><Plus size={16}/>Add condition</button></div>
          {profile.customConditions.map((condition, index) => <div className="saved-contact" key={`${condition}-${index}`}>
            <div className="contact-info"><strong>{condition}</strong></div>
            <button type="button" className="icon-button danger-icon" onClick={() => removeCustomCondition(index)} aria-label={`Remove ${condition}`}><X size={16}/></button>
          </div>)}
        </div>}
        <Field label={t.notes} hint="Optional — only share what you’re comfortable sharing."><textarea rows={3} value={profile.notes} onChange={e => setField('notes', e.target.value)} placeholder={t.notesPlaceholder}/></Field>
        <div className="card-bottom"><span className="small-note">Optional · You can update this later</span><button className="button button-primary" onClick={() => go('contacts')}>{t.continue}<ArrowRight size={17}/></button></div>
      </section>}

      {screen === 'contacts' && <section className="onboarding-card">
        <StepTop step={4} total={6} progress={stepProgress} back={() => go('health', 'back')} t={t}/>
        <div className="section-icon"><Users size={24}/></div><p className="eyebrow">SUPPORT THAT STARTS WITH YOUR PEOPLE</p><h1 style={{fontWeight:400}}>{t.trustedTitle}</h1><p className="muted">{t.trustedHelp}</p>
        <div className="privacy-note"><ShieldCheck size={20}/><span><strong>Your contacts, your choice</strong><small>Iranwo won’t message or call anyone without an action you approve. You can manage these people later.</small></span></div>
        {profile.contacts.map((c, i) => <div className="saved-contact" key={`${c.phone}-${i}`}><div className="contact-avatar">{c.name.trim().slice(0,1).toUpperCase()}</div><div className="contact-info"><strong>{c.name}</strong><small>{c.relationship} · {(countryOptions.find(x => x.code === c.country) ?? countryOptions[0]).dial} {c.phone}</small></div><button className="icon-button danger-icon" onClick={() => setField('contacts', profile.contacts.filter((_, j) => j !== i))} aria-label={`Remove ${c.name}`}><X size={17}/></button></div>)}
        {showContactForm ? <div className="contact-form panel-in"><div className="form-grid"><Field label={t.contactName} required error={errors.contactName}><input value={contactDraft.name} onChange={e => setContactDraft(c => ({...c, name: e.target.value}))} placeholder="e.g. Ada Okafor"/></Field><Field label={t.relationship}><select value={contactDraft.relationship} onChange={e => setContactDraft(c => ({...c, relationship: e.target.value}))}><option>Family</option><option>Friend</option><option>Partner</option><option>Caregiver</option><option>Other</option></select></Field><Field label={t.country}><select value={contactDraft.country} onChange={e => setContactDraft(c => ({...c, country: e.target.value, phone: ''}))}>{countryOptions.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.dial})</option>)}</select></Field><Field label={t.contactPhone} required hint={`${contactCountry.dial} · ${localContactDigits.length}/${contactCountry.digits}`} error={errors.contactPhone}><input type="tel" inputMode="numeric" value={contactDraft.phone} maxLength={contactCountry.digits} onChange={e => setContactDraft(c => ({...c, phone: e.target.value.replace(/\D/g, '').slice(0, contactCountry.digits)}))} placeholder="Phone digits only"/></Field></div><div className="inline-actions"><button className="button button-quiet" onClick={() => {setShowContactForm(false); setErrors({})}}>{t.cancel}</button><button className="button button-primary" onClick={addContact}><Plus size={16}/>{t.addContact}</button></div></div> : <button className="add-contact-button" onClick={() => setShowContactForm(true)}><span className="add-contact-icon"><Plus size={20}/></span><span><strong>{t.addContact}</strong><small>Add their name and phone number</small></span><ChevronRight size={19}/></button>}
        <div className="card-bottom"><span className="small-note">You can add more people later.</span><button className="button button-primary" onClick={() => go('review')}>{t.continue}<ArrowRight size={17}/></button></div>
      </section>}

      {screen === 'review' && <section className="onboarding-card">
        <StepTop step={5} total={6} progress={stepProgress} back={() => go('contacts', 'back')} t={t}/>
        <div className="section-icon"><ShieldCheck size={24}/></div><p className="eyebrow">ALMOST THERE</p><h1 style={{fontWeight: 400}}>{t.reviewTitle}</h1><p className="muted">{t.reviewHelp}</p>
        <div className="review-stack"><ReviewRow icon={<UserRound size={19}/>} label={t.fullName} value={profile.name} onEdit={() => go('personal','back')}/><ReviewRow icon={<Activity size={19}/>} label={`${t.age} · ${t.sex}`} value={`${profile.age} years · ${profile.sex}`} onEdit={() => go('personal','back')}/><ReviewRow icon={<HeartPulse size={19}/>} label={t.conditions} value={selectedConditionCount ? selectedConditionNames.join(', ') : t.none} onEdit={() => go('health','back')}/><ReviewRow icon={<Users size={19}/>} label={t.trustedTitle} value={`${profile.contacts.length} ${t.trustedSaved}`} onEdit={() => go('contacts','back')}/><ReviewRow icon={<Languages size={19}/>} label={t.chooseLanguage} value={languageOptions.find(l => l.id === profile.language)?.name ?? 'English'} onEdit={() => go('language','back')}/></div>
        <div className="privacy-note"><ShieldCheck size={20}/><span><strong>Your information is stored on this device</strong><small>This prototype does not send your profile to a backend. Avoid entering information on a shared device.</small></span></div>
        <div className="card-bottom"><span className="small-note">One last step ✨</span><button className="button button-primary" onClick={finish}>Finish setup<Sparkles size={17}/></button></div>
      </section>}

      {screen === 'complete' && <section className="complete-screen">
        <div className="complete-kicker">YOUR SPACE IS READY</div><h1 style={{ fontWeight: 400 }}>{t.completeTitle}<br/><span>{profile.name.split(' ')[0] ? `${profile.name.split(' ')[0]}.` : ''}</span></h1><p className="complete-copy">{t.completeBody}</p>
        <div className="complete-stats"><div><HeartPulse size={18}/><strong>{selectedConditionCount}</strong><small>{t.conditionsSaved}</small></div><div><Users size={18}/><strong>{profile.contacts.length}</strong><small>{t.trustedSaved}</small></div><div><ShieldCheck size={18}/><strong>100%</strong><small>Yours to control</small></div></div>
        <button className="button button-primary button-large" onClick={continueAfterOnboarding}>{t.enterApp}<ArrowRight size={19}/></button><p className="complete-foot">Made with care, for real life. <span>♥</span></p>
      </section>}

      {screen === 'home' && <section className="dashboard">
        <div className="dashboard-greeting"><div><p className="eyebrow">YOUR HEALTH COMPANION</p><h1 style={{ fontWeight: 400 }}>{t.dashboard}{profile.name ? `, ${profile.name.split(' ')[0]}` : ''}<span className="greeting-spark"> ✦</span></h1><p className="muted">{t.goodDay}</p></div><div className="greeting-avatar">{profile.name ? profile.name.trim().slice(0,1).toUpperCase() : <UserRound/>}</div></div>
        <button className="hero-sos" onClick={openEmergency}><span className="hero-sos-glow"/><span className="hero-sos-icon"><Siren size={28}/></span><span className="hero-sos-text"><strong>{t.emergency}</strong><small>Immediate options for urgent help</small></span><ArrowRight size={20}/></button>
        <div className="section-heading"><div><p className="eyebrow">HERE WHEN YOU NEED IT</p><h2>How can we help today?</h2></div><Sparkles size={21}/></div>
        <div className="action-grid"><button className="action-card chat-action" onClick={() => go('chat')}><span className="action-icon"><MessageCircle size={22}/></span><span className="action-title">{t.talk}</span><span className="action-description">{t.talkBody}</span><span className="action-arrow"><ArrowRight size={16}/></span><span className="card-blob"/></button><button className="action-card clinic-action" onClick={() => go('clinics')}><span className="action-icon"><MapPin size={22}/></span><span className="action-title">{t.nearby}</span><span className="action-description">{t.nearbyBody}</span><span className="action-arrow"><ArrowRight size={16}/></span><span className="card-blob"/></button></div>
        <div className="section-heading snapshot-heading"><div><p className="eyebrow">PERSONAL TO YOU</p><h2>{t.healthSnapshot}</h2></div><button className="text-button" onClick={() => go('profile')}>Edit profile <ArrowRight size={15}/></button></div>
        <div className="snapshot-card"><div className="snapshot-top"><div className="snapshot-icon"><HeartPulse size={21}/></div><div><strong>{selectedConditionCount ? selectedConditionCount : 'No'} {t.conditionsSaved}</strong><small>{selectedConditionCount ? selectedConditionNames.join(' · ') : 'Add conditions whenever you are ready.'}</small></div><ChevronRight size={19}/></div><div className="snapshot-divider"/><div className="snapshot-bottom"><span><Users size={16}/>{profile.contacts.length} {t.trustedSaved}</span><span><ShieldCheck size={16}/>Private on this device</span></div></div>
        <div className="disclaimer-strip"><CircleHelp size={17}/><span>Iranwo supports your health journey but does not replace a qualified clinician.</span></div>
      </section>}

      {screen === 'chat' && <section className="chat-screen">
        <div className="page-title-row"><button className="icon-button" onClick={() => go('home','back')}><ArrowLeft size={19}/></button><div className="chat-avatar"><Stethoscope size={20}/></div><div className="title-grow"><h1>{t.chatTitle}</h1><p><span className="status-dot"/> {t.chatHelp}</p></div></div>
        <div className="chat-safety"><ShieldCheck size={16}/><span>{t.chatDisclaimer} Warning-sign detection is currently a limited prototype; no alert does not mean someone is safe.</span></div>
        {!isCloudAIConfigured() && <p className="ai-cloud-status">DEMO MODE · The AI connection is not configured. No chat messages are sent to an AI provider.</p>}
        {isCloudAIConfigured() && import.meta.env.DEV && <p className="ai-cloud-status">DEVELOPMENT AI · Gemma 4 through Novita · use fictional test cases only.</p>}
        <div className="message-list">{messages.map((m,i) => <div key={i} className={`message-row ${m.role === 'user' ? 'user-row' : ''}`}><div className={`message-bubble ${m.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>{m.text}</div></div>)}{busy && <div className="message-row"><div className="message-bubble assistant-bubble typing"><i/><i/><i/></div></div>}</div>
        {safetyAssessment && <SafetyAlert assessment={safetyAssessment} onConfirmCurrent={confirmSafetyIsCurrent} onNotCurrent={dismissSafetyClarification} onOpenEmergency={openEmergency}/>}
        {aiSuggestedEscalation && <div className="chat-safety-alert is-urgent" role="status"><strong>Consider getting help from a healthcare professional.</strong><p>The AI response identified a possible need for human support. This is not a diagnosis or a confirmed emergency assessment.</p><button type="button" className="chat-safety-alert-primary" onClick={openEmergency}>Open emergency help options</button></div>}
        {import.meta.env.DEV && lastAgentAssessments && <details className="ai-agent-debug"><summary>Inspect six AI roles · development only</summary><pre>{JSON.stringify(lastAgentAssessments, null, 2)}</pre></details>}
        {isCloudAIConfigured() && <div className="ai-consent-group"><label className="ai-cloud-consent"><input type="checkbox" checked={aiProcessingConsent} onChange={event => {setAiProcessingConsent(event.target.checked); if (!event.target.checked) setAiProfileContextConsent(false)}}/><span><strong>Allow AI processing of this conversation.</strong> Your message and up to eight recent chat turns will be sent to Novita AI, which hosts Gemma 4, through this local development server.</span></label><label className="ai-cloud-consent ai-profile-consent"><input type="checkbox" checked={aiProfileContextConsent} disabled={!aiProcessingConsent} onChange={event => setAiProfileContextConsent(event.target.checked)}/><span><strong>Also include my health profile (optional).</strong> This sends your age, sex, saved health conditions and health notes. Your name, phone number and trusted contacts are excluded.</span></label><p className="ai-cloud-status ai-test-warning">Prototype testing only: use fictional names and health scenarios. Do not submit real patient information or another person's personal data. The provider's healthcare-use permission has not yet been confirmed. AI output can be wrong and is not a diagnosis.</p></div>}
        {isCloudAIConfigured() && profile.language !== 'en' && <p className="ai-cloud-status">Cloud AI is temporarily disabled for this selected language until its data-processing notice has been translated and reviewed.</p>}
        <div className="chat-quick-prompts"><button onClick={() => setChatText('I have a headache. What should I know?')}>Headache</button><button onClick={() => setChatText('How can I sleep better?')}>Sleep</button><button onClick={() => setChatText('What are common asthma warning signs?')}>Asthma</button></div>
        <form className="chat-composer" onSubmit={e => {e.preventDefault(); void sendMessage()}}><input value={chatText} onChange={e => setChatText(e.target.value)} placeholder={t.chatPlaceholder}/><button type="submit" className="send-button" disabled={!chatText.trim() || busy} aria-label={t.send}><Send size={18}/></button></form>
      </section>}

      {screen === 'clinics' && <section className="content-page"><div className="page-title-row"><button className="icon-button" onClick={() => go('home','back')}><ArrowLeft size={19}/></button><div className="title-grow"><p className="eyebrow">LOCAL CARE DIRECTORY</p><h1>{t.clinicsTitle}</h1><p className="muted">{t.clinicsHelp}</p></div></div><div className="demo-alert"><MapPin size={18}/><span>These are fictional demo entries, not verified nearby facilities. Call ahead and verify location and services.</span></div><div className="clinic-list">{clinics.map((c,i) => <article className="clinic-card" key={c.name}><div className="clinic-illustration">{c.icon}</div><div className="clinic-info"><strong>{c.name}</strong><small>{c.type}</small><span><MapPin size={13}/>{c.address}</span><span className="clinic-distance"><ArrowDownLeft size={13}/>{c.distance} · illustrative only</span></div><button className="icon-button" onClick={() => setToast('This is a demo listing. Add a verified clinic backend before release.')} aria-label="Clinic details"><ChevronRight size={18}/></button></article>)}</div></section>}

      {screen === 'profile' && <section className="onboarding-card profile-screen"><div className="page-title-row"><button className="icon-button" onClick={() => go('home','back')}><ArrowLeft size={19}/></button><div className="title-grow"><p className="eyebrow">YOUR INFORMATION</p><h1>{t.profileTitle}</h1><p className="muted">Update your details, language, health conditions and trusted contacts.</p></div></div><div className="form-grid"><Field label={t.fullName} required><input value={profile.name} onChange={e => setField('name', e.target.value)}/></Field><Field label={t.age} required><input type="number" min="1" max="120" value={profile.age} onChange={e => setField('age', e.target.value)}/></Field><Field label={t.sex} required><select value={profile.sex} onChange={e => setField('sex', e.target.value as Sex)}><option value="">Select</option><option>Female</option><option>Male</option><option>Intersex</option><option>Prefer not to say</option></select></Field><Field label={t.chooseLanguage}><select value={profile.language} onChange={e => setField('language', e.target.value as Language)}>{languageOptions.map(l => <option value={l.id} key={l.id}>{l.name}</option>)}</select></Field><Field label={t.country}><select value={profile.country} onChange={e => {setField('country',e.target.value);setField('phone','')}}>{countryOptions.map(c=><option key={c.code} value={c.code}>{c.flag} {c.name} ({c.dial})</option>)}</select></Field><Field label={t.phone}><input type="tel" value={profile.phone} maxLength={selectedCountry.digits} onChange={e => setField('phone',e.target.value.replace(/\D/g,'').slice(0,selectedCountry.digits))}/></Field></div><Field label={t.notes}><textarea rows={3} value={profile.notes} onChange={e => setField('notes',e.target.value)}/></Field><div className="profile-conditions"><strong>{t.conditions}</strong><div className="condition-grid">{conditionData.map(c => { const checked = profile.conditions.includes(c.id); return <button type="button" key={c.id} className={`condition-card compact ${checked?'condition-selected':''}`} onClick={() => toggleCondition(c.id)} aria-pressed={checked}><ConditionArt id={c.id}/><span className="condition-title">{c.title}</span><span className="condition-check">{checked&&<Check size={13}/>}</span></button> })}</div>
        {(profile.conditions.includes('other') || profile.customConditions.length > 0) && <div className="contact-form panel-in custom-condition-form">
          <Field label="Additional health condition" hint="Enter a condition that is not listed above. You can add more than one.">
            <input value={customConditionDraft} onChange={e => setCustomConditionDraft(e.target.value)} placeholder="e.g. Thyroid condition"/>
          </Field>
          <div className="inline-actions"><button type="button" className="button button-primary" onClick={addCustomCondition}><Plus size={16}/>Add condition</button></div>
          {profile.customConditions.map((condition, index) => <div className="saved-contact" key={`${condition}-${index}`}>
            <div className="contact-info"><strong>{condition}</strong></div>
            <button type="button" className="icon-button danger-icon" onClick={() => removeCustomCondition(index)} aria-label={`Remove ${condition}`}><X size={16}/></button>
          </div>)}
        </div>}
      </div><div className="profile-contacts"><div className="condition-heading"><strong>{t.trustedTitle}</strong><button className="text-button" onClick={() => setShowContactForm(v=>!v)}><Plus size={15}/> Add</button></div>{profile.contacts.map((c,i)=><div className="saved-contact" key={c.phone+i}><div className="contact-avatar">{c.name[0]}</div><div className="contact-info"><strong>{c.name}</strong><small>{c.relationship} · {c.phone}</small></div><button className="icon-button danger-icon" onClick={()=>setField('contacts',profile.contacts.filter((_,j)=>j!==i))}><X size={16}/></button></div>)}{showContactForm&&<div className="contact-form"><div className="form-grid"><Field label={t.contactName}><input value={contactDraft.name} onChange={e=>setContactDraft(c=>({...c,name:e.target.value}))}/></Field><Field label={t.relationship}><input value={contactDraft.relationship} onChange={e=>setContactDraft(c=>({...c,relationship:e.target.value}))}/></Field><Field label={t.country}><select value={contactDraft.country} onChange={e=>setContactDraft(c=>({...c,country:e.target.value,phone:''}))}>{countryOptions.map(c=><option key={c.code} value={c.code}>{c.name} ({c.dial})</option>)}</select></Field><Field label={t.contactPhone}><input value={contactDraft.phone} maxLength={contactCountry.digits} onChange={e=>setContactDraft(c=>({...c,phone:e.target.value.replace(/\D/g,'').slice(0,contactCountry.digits)}))}/></Field></div><button className="button button-primary" onClick={addContact}>{t.addContact}</button></div>}</div><div className="card-bottom"><span className="small-note"><ShieldCheck size={14}/> Stored on this device</span><button className="button button-primary" onClick={()=>{if(!profile.name.trim()||!profile.age||!profile.sex){setToast('Name, age and sex are required.');return}setToast(t.saved);go('home')}}>{t.save}<Check size={17}/></button></div></section>}

      {screen === 'emergency' && <section className="emergency-screen"><div className="emergency-top"><button className="icon-button" onClick={() => go('home','back')} aria-label={t.cancel}><X size={20}/></button><span className="emergency-label"><span className="pulse-dot"/> EMERGENCY MODE</span><span className="emergency-time"><Clock3 size={14}/> Act now</span></div><div className="emergency-hero"><div className="emergency-icon-wrap"><div className="emergency-ring ring-a"/><div className="emergency-ring ring-b"/><div className="emergency-icon"><Siren size={35}/></div></div><p className="emergency-kicker">IRANWO SOS</p><h1>{t.urgentTitle}</h1><p>{t.urgentBody}</p></div><button className="emergency-call-main" onClick={handleEmergencyCall}><Phone size={21}/><span><strong>{t.callEmergency}</strong><small> {emergencyNumber} · opens your phone dialer</small></span><ArrowRight size={20}/></button>{profile.contacts.length ? <div className="emergency-contact-panel"><div className="emergency-contact-heading"><Users size={18}/><strong>{t.chooseContact}</strong></div><select value={emergencyContactIndex} onChange={e=>setEmergencyContactIndex(e.target.value)}>{profile.contacts.map((c,i)=><option value={i} key={c.phone}>{c.name} · {c.relationship}</option>)}</select><div className="emergency-contact-actions"><a className="emergency-contact-action" href={`tel:${trustedE164}`}><Phone size={18}/><span>{t.callTrusted}<small>{selectedTrusted?.name}</small></span><ChevronRight size={17}/></a><a className="emergency-contact-action" href={emergencySms}><MessageCircle size={18}/><span>{t.messageTrusted}<small>Opens your messaging app; review before sending</small></span><ChevronRight size={17}/></a></div></div> : <div className="no-contact-panel"><Users size={21}/><p>{t.noContacts}</p><button className="button button-secondary" onClick={()=>go('profile')}>{t.settings}<ArrowRight size={16}/></button></div>}<div className="emergency-safety-note"><ShieldCheck size={18}/><p>{t.emergencyNote} If a seizure lasts 5 minutes, repeats without recovery, or breathing is severely impaired, seek emergency help immediately. Follow local dispatcher instructions.</p></div><button className="emergency-close" onClick={()=>go('home','back')}>{t.cancel}</button></section>}
    </main>

    {['home','chat','clinics','profile'].includes(screen) && <nav className="bottom-nav"><button className={screen==='home'?'nav-active':''} onClick={()=>go('home')}><Home size={19}/><span>Home</span></button><button className={screen==='chat'?'nav-active':''} onClick={()=>go('chat')}><MessageCircle size={19}/><span>Talk</span></button><button className={screen==='clinics'?'nav-active':''} onClick={()=>go('clinics')}><MapPin size={19}/><span>Nearby</span></button><button className={screen==='profile'?'nav-active':''} onClick={()=>go('profile')}><UserRound size={19}/><span>Profile</span></button></nav>}
    {toast && <div role="status" className="toast"><CheckCircle2 size={17}/>{toast}</div>}
  </div>
}

function StepTop({step,total,progress,back,t}:{step:number;total:number;progress:number;back:()=>void;t:Record<string,string>}) {
  return <div className="step-top"><button className="back-button" onClick={back}><ArrowLeft size={17}/>{t.back}</button><span className="step-count">STEP {step} <span>/ {total}</span></span><div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div></div>
}
function Field({label,required,hint,error,children}:{label:string;required?:boolean;hint?:string;error?:string;children:React.ReactNode}) {
  return <label className="field"><span className="field-label">{label}{required&&<span className="required-dot"> *</span>}</span>{children}{hint&&!error&&<small className="field-hint">{hint}</small>}{error&&<small className="field-error">{error}</small>}</label>
}
function ReviewRow({icon,label,value,onEdit}:{icon:React.ReactNode;label:string;value:string;onEdit:()=>void}) {
  return <div className="review-row"><span className="review-icon">{icon}</span><span className="review-content"><small>{label}</small><strong>{value||'—'}</strong></span><button className="text-button" onClick={onEdit}>Edit</button></div>
}

export default App
