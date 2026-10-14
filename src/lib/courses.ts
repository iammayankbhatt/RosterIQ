import type { Department, Staff } from '../data/types'

/** The demo's "today": the first day of the roster. Sample date, not the real clock. */
export const TODAY = '2026-10-13'
export const TODAY_MONTH = '2026-10'

export interface Course {
  id: string
  title: { en: string; hi: string }
  /** the skill label added to a person's profile on completion (English, as stored) */
  skill: string
  lessons: number
  minutes: number
  /** limits the course to these departments; omitted means everyone */
  depts?: Department[]
  /** does an existing skill label already cover this course? (label is lowercased) */
  covers: (label: string) => boolean
}

export const COURSES: Course[] = [
  {
    id: 'first-aid',
    title: { en: 'First aid', hi: 'प्राथमिक चिकित्सा' },
    skill: 'First-aid trained',
    lessons: 4,
    minutes: 25,
    covers: (l) => l.includes('first-aid'),
  },
  {
    id: 'front-desk',
    title: { en: 'Front-desk basics', hi: 'फ्रंट डेस्क की बुनियादी बातें' },
    skill: 'Front-desk certified',
    lessons: 5,
    minutes: 30,
    covers: (l) => l.includes('front-desk certified'),
  },
  {
    id: 'fssai-2',
    title: { en: 'Food safety, level 2', hi: 'खाद्य सुरक्षा, स्तर 2' },
    skill: 'Food-safety (FSSAI) level 2',
    lessons: 4,
    minutes: 30,
    depts: ['Kitchen', 'F&B Service'],
    covers: (l) => l.includes('level 2'),
  },
  {
    id: 'grill',
    title: { en: 'Continental grill station', hi: 'कॉन्टिनेंटल ग्रिल स्टेशन' },
    skill: 'Continental grill',
    lessons: 5,
    minutes: 35,
    depts: ['Kitchen'],
    covers: (l) => l.includes('grill'),
  },
  {
    id: 'floor-supervisor',
    title: { en: 'Floor-supervisor basics', hi: 'फ़्लोर सुपरवाइज़र की बुनियाद' },
    skill: 'Supervisor training',
    lessons: 4,
    minutes: 25,
    depts: ['Housekeeping'],
    covers: (l) => l.includes('supervisor'),
  },
  {
    id: 'laundry-chem',
    title: { en: 'Laundry chemistry', hi: 'कपड़ा धुलाई का रसायन' },
    skill: 'Laundry chemistry',
    lessons: 3,
    minutes: 20,
    depts: ['Housekeeping'],
    covers: (l) => l.includes('laundry chemistry'),
  },
  {
    id: 'channel-manager',
    title: { en: 'Channel-manager basics', hi: 'चैनल-मैनेजर की बुनियाद' },
    skill: 'OTA channel manager',
    lessons: 4,
    minutes: 30,
    depts: ['Front Desk'],
    covers: (l) => l.includes('channel manager'),
  },
  {
    id: 'barista',
    title: { en: 'Barista and mocktails', hi: 'बरिस्ता और मॉकटेल' },
    skill: 'Barista',
    lessons: 4,
    minutes: 25,
    depts: ['F&B Service'],
    covers: (l) => l.includes('barista'),
  },
  {
    id: 'boiler',
    title: { en: 'Boiler and solar servicing', hi: 'बॉयलर और सोलर की सर्विसिंग' },
    skill: 'Geyser & boiler servicing',
    lessons: 4,
    minutes: 30,
    depts: ['Maintenance'],
    covers: (l) => l.includes('boiler'),
  },
  {
    id: 'fire-cctv',
    title: { en: 'Fire safety and CCTV', hi: 'अग्नि-सुरक्षा और सीसीटीवी' },
    skill: 'CCTV monitoring',
    lessons: 4,
    minutes: 25,
    depts: ['Security'],
    covers: (l) => l.includes('cctv'),
  },
]

export const COURSE_BY_ID = new Map(COURSES.map((c) => [c.id, c]))

export const holdsCourseSkill = (p: Staff, c: Course): boolean => p.skills.some((s) => c.covers(s.label.toLowerCase()))

/** Courses open to this person, specialities first. */
export function coursesFor(p: Staff): Course[] {
  return COURSES.filter((c) => !c.depts || c.depts.includes(p.department)).sort((a, b) => Number(!!b.depts) - Number(!!a.depts))
}
