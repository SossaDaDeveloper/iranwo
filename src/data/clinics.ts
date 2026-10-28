export type Clinic = {
  id: string
  name: string
  type: 'Hospital' | 'Primary care' | 'Community clinic' | 'Pharmacy'
  area: string
  description: string
  hours: string
  phone?: string
  isDemo: true
}

// Clearly fictional demo data. Replace with reviewed clinic records before real-world use.
export const DEMO_CLINICS: Clinic[] = [
  { id: 'demo-1', name: 'Epe Community Care Centre (Demo)', type: 'Community clinic', area: 'Epe, Lagos', description: 'Illustrative community care listing for interface testing.', hours: 'Demo hours: 8:00 AM–5:00 PM', isDemo: true },
  { id: 'demo-2', name: 'Lakeside Primary Health Centre (Demo)', type: 'Primary care', area: 'Epe, Lagos', description: 'Illustrative primary care listing. Services are not verified.', hours: 'Demo hours: 8:00 AM–4:00 PM', isDemo: true },
  { id: 'demo-3', name: 'Community General Hospital (Demo)', type: 'Hospital', area: 'Epe, Lagos', description: 'Illustrative hospital listing. Not a verified facility record.', hours: 'Demo hours: all-day placeholder', isDemo: true },
  { id: 'demo-4', name: 'Neighbourhood Pharmacy (Demo)', type: 'Pharmacy', area: 'Epe, Lagos', description: 'Illustrative pharmacy listing. Do not rely on this for care.', hours: 'Demo hours: 9:00 AM–7:00 PM', isDemo: true },
  { id: 'demo-5', name: 'Student Wellness Unit (Demo)', type: 'Primary care', area: 'Epe, Lagos', description: 'Illustrative student health listing.', hours: 'Demo hours: weekdays only', isDemo: true },
]
