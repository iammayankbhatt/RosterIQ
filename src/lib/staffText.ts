import type { Department } from '../data/types'
import type { EngineShift } from '../engine'

export type Lang = 'en' | 'hi'

const EN = {
  tabShifts: 'Shifts',
  tabSwap: 'Swap',
  tabMood: 'Mood',
  tabGrow: 'Grow',
  tabSeasons: 'Seasons',
  hello: 'Namaste, {name}',
  today: 'Today',
  /* shifts */
  shiftsTitle: 'My shifts',
  nextShift: 'Your next shift',
  startsIn: 'Starts in',
  nothingNext: 'No shift coming up. Enjoy the rest.',
  thisWeek: 'This week',
  nextWeek: 'Next week',
  dayOff: 'Day off',
  fixedOff: 'Fixed weekly off',
  fixedOffNote: 'Every {day} is yours.',
  onLeave: 'Approved leave',
  swapped: 'Swapped',
  updatedTag: 'Updated by your manager',
  updatesNext: 'Changes in your next week',
  updatesThis: 'Changes in this week',
  seeIt: 'See',
  update: 'From your manager',
  updWeeklyOff: 'Your weekly off is now fixed on {day}s.',
  updCovered: '{names} will cover your shifts.',
  updPattern: 'From now on you get at least 11 hours between shifts, and no more than 2 late nights in a row.',
  updLeave: 'Your leave request is kept.',
  updCourse: 'Your manager picked a course for you: {course}.',
  updRecognition: 'Your manager would like a quick chat to say thank you.',
  sampleClock: 'Sample time: {when}',
  /* swap */
  swapTitle: 'Swap a shift',
  swapIntro: 'Trade a shift with a coworker who does the same work. We check it is fair for both of you.',
  stepMine: '1. Which of your shifts?',
  stepWho: '2. Swap with',
  stepTheirs: '3. Take which of theirs?',
  sameSkill: 'Same skill: {skill}',
  noPeers: 'Nobody else shares your skills in this team.',
  noShiftsToSwap: 'You have no shifts to swap yet.',
  fairness: 'Fairness check',
  chooseAbove: 'Pick a shift, a coworker and their shift to see the check.',
  restKeptYou: 'This keeps your 11-hour rest (shortest gap: {h} hours)',
  restBrokenYou: 'This would leave you only {h} hours of rest',
  restKeptThem: '{name} keeps their 11-hour rest too ({h} hours)',
  restBrokenThem: '{name} would get only {h} hours of rest',
  offKeptYou: 'You keep your weekly off',
  offBrokenYou: 'You would work too many days in a row',
  offKeptThem: '{name} keeps their weekly off',
  offBrokenThem: '{name} would work too many days in a row',
  skillOk: 'The skill each shift needs is covered',
  skillBad: 'One shift would lose the skill it needs',
  otOk: 'No extra overtime for either of you',
  otBad: 'This adds overtime for {name}',
  leaveBad: '{name} has approved leave that day',
  leaveBadYou: 'You have approved leave that day',
  busy: '{name} already works that day',
  busyYou: 'You already work that day',
  otBadYou: 'This adds overtime for you',
  mineLabel: 'You',
  fairYes: 'Fair for both',
  fairNo: 'Not fair yet',
  noFairSwap: 'No fair swap with {name} in the next two weeks. Try someone else.',
  ask: 'Ask {name} to swap',
  waiting: 'Waiting for {name}…',
  approved: 'Done. You now work {theirs}, and {name} takes your {mine}.',
  demoAccept: 'Demo: the coworker accepts automatically.',
  yourSwaps: 'Your swaps',
  undo: 'Undo',
  swapLine: '{mine} for {theirs}, with {name}',
  /* mood */
  moodTitle: 'How are you this week?',
  moodSub: 'Ten seconds. Tap the face that fits.',
  mood1: 'Really tough',
  mood2: 'A bit heavy',
  mood3: 'Okay',
  mood4: 'Good',
  mood5: 'Great',
  moodSave: 'Save my check-in',
  moodSaved: 'Thank you, {name}. Saved for this week.',
  moodChange: 'Change my answer',
  moodPrivacy: 'Only you and your manager’s wellbeing view can see this. It is never used for discipline.',
  moodPurpose: 'It helps us notice when someone needs support, and it is one of the signals behind the stagnation check.',
  /* grow */
  growTitle: 'Grow your skills',
  growSub: 'Short lessons. Finish one and it joins your profile.',
  lessonOf: 'Lesson {n} of {m}',
  minutes: '{n} min',
  start: 'Start',
  cont: 'Continue',
  earned: 'Certificate earned',
  newSkill: 'New skill added to your profile: {skill}',
  suggested: 'Suggested by your manager',
  yourSkills: 'Skills you hold',
  inProgress: 'In progress',
  /* seasons */
  seasonsTitle: 'Your seasons with Deodar Heights',
  seasonsSub: '{n} seasons together, since {year}.',
  summer: 'Summer',
  autumn: 'Autumn',
  thisSeason: 'This season',
  skillsEarned: 'Skills earned',
  nothingNew: 'A steady season.',
  earlier: '{n} earlier seasons',
  hideEarlier: 'Hide earlier seasons',
  welcomeTitle: 'Welcome back next season',
  welcomeBody: 'Your place is kept for {season} ({months}). We remember you like {pref} shifts.',
  welcomeSkills: 'You come back with {n} skills.',
  prefO: 'early-morning',
  prefD: 'day',
  prefE: 'evening',
  prefC: 'late',
  months47: 'April to June',
  months1011: 'October to November',
} as const

export type TextKey = keyof typeof EN
export const TEXT_KEYS = Object.keys(EN) as TextKey[]

const HI: Record<TextKey, string> = {
  tabShifts: 'शिफ्ट',
  tabSwap: 'अदला-बदली',
  tabMood: 'मन',
  tabGrow: 'सीखें',
  tabSeasons: 'मौसम',
  hello: 'नमस्ते, {name}',
  today: 'आज',
  shiftsTitle: 'मेरी शिफ्ट',
  nextShift: 'आपकी अगली शिफ्ट',
  startsIn: 'शुरू होने में',
  nothingNext: 'अभी कोई शिफ्ट नहीं है। आराम कीजिए।',
  thisWeek: 'इस हफ़्ते',
  nextWeek: 'अगले हफ़्ते',
  dayOff: 'छुट्टी का दिन',
  fixedOff: 'तय साप्ताहिक अवकाश',
  fixedOffNote: 'हर {day} आपका अपना दिन है।',
  onLeave: 'स्वीकृत छुट्टी',
  swapped: 'बदली हुई',
  updatedTag: 'मैनेजर ने बदला',
  updatesNext: 'अगले हफ़्ते में बदलाव',
  updatesThis: 'इस हफ़्ते में बदलाव',
  seeIt: 'देखें',
  update: 'आपके मैनेजर की ओर से',
  updWeeklyOff: 'आपका साप्ताहिक अवकाश अब हर {day} को तय है।',
  updCovered: 'आपकी शिफ्ट {names} संभाल लेंगे।',
  updPattern: 'अब से दो शिफ्टों के बीच कम से कम 11 घंटे का आराम मिलेगा, और लगातार 2 से ज़्यादा देर रात की शिफ्ट नहीं होंगी।',
  updLeave: 'आपकी छुट्टी की अर्ज़ी मान ली गई है।',
  updCourse: 'आपके मैनेजर ने आपके लिए एक कोर्स चुना है: {course}।',
  updRecognition: 'आपके मैनेजर आपसे थोड़ी बात करके धन्यवाद कहना चाहते हैं।',
  sampleClock: 'नमूना समय: {when}',
  swapTitle: 'शिफ्ट की अदला-बदली',
  swapIntro: 'अपने जैसे काम वाले साथी से शिफ्ट बदलें। हम जाँचते हैं कि यह आप दोनों के लिए ठीक रहे।',
  stepMine: '1. आपकी कौन-सी शिफ्ट?',
  stepWho: '2. किसके साथ बदलें?',
  stepTheirs: '3. उनकी कौन-सी शिफ्ट लेंगे?',
  sameSkill: 'वही हुनर: {skill}',
  noPeers: 'इस टीम में आपके हुनर वाला कोई और नहीं है।',
  noShiftsToSwap: 'अभी बदलने के लिए आपकी कोई शिफ्ट नहीं है।',
  fairness: 'निष्पक्षता की जाँच',
  chooseAbove: 'जाँच देखने के लिए शिफ्ट, साथी और उनकी शिफ्ट चुनें।',
  restKeptYou: 'इससे आपका 11 घंटे का आराम बना रहता है (सबसे कम अंतर: {h} घंटे)',
  restBrokenYou: 'इससे आपको सिर्फ़ {h} घंटे का आराम मिलेगा',
  restKeptThem: '{name} का भी 11 घंटे का आराम बना रहता है ({h} घंटे)',
  restBrokenThem: '{name} को सिर्फ़ {h} घंटे का आराम मिलेगा',
  offKeptYou: 'आपका साप्ताहिक अवकाश बना रहता है',
  offBrokenYou: 'आपको लगातार बहुत दिन काम करना पड़ेगा',
  offKeptThem: '{name} का साप्ताहिक अवकाश बना रहता है',
  offBrokenThem: '{name} को लगातार बहुत दिन काम करना पड़ेगा',
  skillOk: 'दोनों शिफ्ट में ज़रूरी हुनर मौजूद है',
  skillBad: 'एक शिफ्ट में ज़रूरी हुनर नहीं रहेगा',
  otOk: 'किसी का भी ओवरटाइम नहीं बढ़ता',
  otBad: 'इससे {name} का ओवरटाइम बढ़ेगा',
  leaveBad: '{name} की उस दिन स्वीकृत छुट्टी है',
  leaveBadYou: 'उस दिन आपकी स्वीकृत छुट्टी है',
  busy: '{name} उस दिन पहले से काम पर हैं',
  busyYou: 'आप उस दिन पहले से काम पर हैं',
  otBadYou: 'इससे आपका ओवरटाइम बढ़ेगा',
  mineLabel: 'आप',
  fairYes: 'दोनों के लिए ठीक',
  fairNo: 'अभी ठीक नहीं',
  noFairSwap: 'अगले दो हफ़्तों में {name} के साथ कोई ठीक बदली नहीं मिली। किसी और को चुनें।',
  ask: '{name} से बदली माँगें',
  waiting: '{name} के जवाब का इंतज़ार…',
  approved: 'हो गया। अब आपकी शिफ्ट है {theirs}, और {name} आपकी {mine} संभालेंगे।',
  demoAccept: 'डेमो: साथी अपने आप मान लेते हैं।',
  yourSwaps: 'आपकी बदलियाँ',
  undo: 'वापस करें',
  swapLine: '{name} के साथ: {mine} की जगह {theirs}',
  moodTitle: 'इस हफ़्ते आप कैसे हैं?',
  moodSub: 'सिर्फ़ दस सेकंड। जो चेहरा आपके जैसा लगे, उसे छुएँ।',
  mood1: 'बहुत मुश्किल',
  mood2: 'थोड़ा भारी',
  mood3: 'ठीक-ठाक',
  mood4: 'अच्छा',
  mood5: 'बहुत बढ़िया',
  moodSave: 'मेरा जवाब सहेजें',
  moodSaved: 'धन्यवाद, {name}। इस हफ़्ते का जवाब सहेज लिया गया।',
  moodChange: 'जवाब बदलें',
  moodPrivacy: 'इसे सिर्फ़ आप और आपके मैनेजर का कल्याण-दृश्य देख सकता है। इसका इस्तेमाल कभी सज़ा के लिए नहीं होता।',
  moodPurpose: 'इससे हम समझ पाते हैं कि किसे सहारे की ज़रूरत है। यह ठहराव की जाँच के संकेतों में से एक है।',
  growTitle: 'अपना हुनर बढ़ाएँ',
  growSub: 'छोटे-छोटे पाठ। पूरा करते ही यह आपकी प्रोफ़ाइल में जुड़ जाता है।',
  lessonOf: 'पाठ {n} / {m}',
  minutes: '{n} मिनट',
  start: 'शुरू करें',
  cont: 'आगे बढ़ें',
  earned: 'प्रमाणपत्र मिल गया',
  newSkill: 'आपकी प्रोफ़ाइल में नया हुनर जुड़ा: {skill}',
  suggested: 'आपके मैनेजर का सुझाव',
  yourSkills: 'आपके हुनर',
  inProgress: 'जारी है',
  seasonsTitle: 'डियोडार हाइट्स में आपके मौसम',
  seasonsSub: '{year} से अब तक {n} मौसम साथ में।',
  summer: 'गर्मी',
  autumn: 'पतझड़',
  thisSeason: 'यह मौसम',
  skillsEarned: 'सीखे हुए हुनर',
  nothingNew: 'एक शांत मौसम।',
  earlier: '{n} पिछले मौसम',
  hideEarlier: 'पिछले मौसम छिपाएँ',
  welcomeTitle: 'अगले मौसम में फिर स्वागत है',
  welcomeBody: '{season} ({months}) के लिए आपकी जगह सुरक्षित है। हमें याद है कि आपको {pref} शिफ्ट पसंद हैं।',
  welcomeSkills: 'आप {n} हुनर के साथ लौटेंगे।',
  prefO: 'तड़के की',
  prefD: 'दिन की',
  prefE: 'शाम की',
  prefC: 'देर रात की',
  months47: 'अप्रैल से जून',
  months1011: 'अक्टूबर से नवंबर',
}

export function makeT(lang: Lang) {
  const table: Record<TextKey, string> = lang === 'hi' ? HI : EN
  return (key: TextKey, vars?: Record<string, string | number>): string => {
    let s = table[key]
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
    return s
  }
}
export type T = ReturnType<typeof makeT>

/* ---------------- Dates and shifts ---------------- */

const HI_DAY_SHORT = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि']
const HI_DAY_FULL = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार']
const EN_DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const EN_DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const HI_MONTH = ['जन॰', 'फ़र॰', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुल॰', 'अग॰', 'सित॰', 'अक्टू॰', 'नव॰', 'दिस॰']
const EN_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const weekdayIdx = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay()

export const dayShort = (iso: string, lang: Lang) => (lang === 'hi' ? HI_DAY_SHORT : EN_DAY_SHORT)[weekdayIdx(iso)]
export const dayFull = (iso: string, lang: Lang) => (lang === 'hi' ? HI_DAY_FULL : EN_DAY_FULL)[weekdayIdx(iso)]
export const dayFullByIndex = (i: number, lang: Lang) => (lang === 'hi' ? HI_DAY_FULL : EN_DAY_FULL)[i]
export const dayNumber = (iso: string) => Number(iso.slice(8, 10))
export const monthShort = (iso: string, lang: Lang) => (lang === 'hi' ? HI_MONTH : EN_MONTH)[Number(iso.slice(5, 7)) - 1]

/** "Tue 13 Oct" · "मंगल 13 अक्टू॰" */
export const dateLabel = (iso: string, lang: Lang) => `${dayShort(iso, lang)} ${dayNumber(iso)} ${monthShort(iso, lang)}`

const SHIFT_NAME: Record<Lang, Record<EngineShift, string>> = {
  en: { M: 'Morning', E: 'Evening', N: 'Night' },
  hi: { M: 'सुबह की शिफ्ट', E: 'शाम की शिफ्ट', N: 'रात की शिफ्ट' },
}
export const shiftName = (s: EngineShift, lang: Lang) => SHIFT_NAME[lang][s]

const SHIFT_TIME: Record<Lang, Record<EngineShift, string>> = {
  en: { M: '6 am to 2 pm', E: '2 pm to 10 pm', N: '10 pm to 6 am' },
  hi: { M: 'सुबह 6 से दोपहर 2', E: 'दोपहर 2 से रात 10', N: 'रात 10 से सुबह 6' },
}
export const shiftTime = (s: EngineShift, lang: Lang) => SHIFT_TIME[lang][s]

/** "Morning, Tue 13 Oct" */
export const shiftOn = (s: EngineShift, iso: string, lang: Lang) => `${shiftName(s, lang)}, ${dateLabel(iso, lang)}`

export function countdown(ms: number, lang: Lang): string {
  const mins = Math.max(0, Math.round(ms / 60_000))
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  if (lang === 'hi') return [d ? `${d} दिन` : '', h ? `${h} घंटे` : '', !d && (m || !h) ? `${m} मिनट` : ''].filter(Boolean).join(' ')
  return [d ? `${d} day${d === 1 ? '' : 's'}` : '', h ? `${h} h` : '', !d && (m || !h) ? `${m} min` : ''].filter(Boolean).join(' ')
}

/* ---------------- Names, departments, skills ---------------- */

const NAME_HI: Record<string, string> = {
  'Meena Rawat': 'मीना रावत',
  'Karan Negi': 'करण नेगी',
  'Pooja Bisht': 'पूजा बिष्ट',
  'Aditya Joshi': 'आदित्य जोशी',
  'Ravi Kumar': 'रवि कुमार',
  'Sunita Devi': 'सुनीता देवी',
  'Kavita Panwar': 'कविता पंवार',
  'Bimla Gusain': 'बिमला गुसाईं',
  'Deepak Tamang': 'दीपक तमांग',
  'Arjun Thakur': 'अर्जुन ठाकुर',
  'Mohan Bhandari': 'मोहन भंडारी',
  'Rekha Rana': 'रेखा राणा',
  'Sanjay Gurung': 'संजय गुरुंग',
  'Neha Uniyal': 'नेहा उनियाल',
  'Imran Qureshi': 'इमरान क़ुरैशी',
  'Priya Semwal': 'प्रिया सेमवाल',
  'Dev Nautiyal': 'देव नौटियाल',
  'Suresh Kandari': 'सुरेश कंडारी',
  'Bahadur Thapa': 'बहादुर थापा',
  'Ramesh Khanduri': 'रमेश खंडूड़ी',
}
export const nameL = (name: string, lang: Lang) => (lang === 'hi' ? (NAME_HI[name] ?? name) : name)
export const firstNameL = (name: string, lang: Lang) => nameL(name, lang).split(' ')[0]

const ROLE_HI: Record<string, string> = {
  'Room Attendant': 'रूम अटेंडेंट',
  'Front Desk Executive': 'फ्रंट डेस्क एग्ज़िक्यूटिव',
  'Commis Chef (Tandoor & Grill)': 'कमी शेफ (तंदूर और ग्रिल)',
}
export const roleL = (role: string, lang: Lang) => (lang === 'hi' ? (ROLE_HI[role] ?? role) : role)

const DEPT_HI: Record<Department, string> = {
  'Front Desk': 'फ्रंट डेस्क',
  Housekeeping: 'हाउसकीपिंग',
  Kitchen: 'रसोई',
  'F&B Service': 'रेस्तरां सेवा',
  Maintenance: 'रखरखाव',
  Security: 'सुरक्षा',
}
export const deptL = (d: Department, lang: Lang) => (lang === 'hi' ? DEPT_HI[d] : d)

const SKILL_HI: Record<string, string> = {
  'Front-desk certified': 'फ्रंट डेस्क प्रमाणित',
  'Hindi / English / Garhwali': 'हिंदी / अंग्रेज़ी / गढ़वाली',
  'Property-management software': 'प्रॉपर्टी-मैनेजमेंट सॉफ़्टवेयर',
  'Night audit': 'नाइट ऑडिट',
  'OTA channel manager': 'ओटीए चैनल मैनेजर',
  'First-aid': 'प्राथमिक चिकित्सा',
  'First-aid trained': 'प्राथमिक चिकित्सा प्रशिक्षित',
  'Room turnaround': 'कमरा तैयार करना',
  'Laundry operations': 'लॉन्ड्री संचालन',
  'Laundry chemistry': 'धुलाई का रसायन',
  'Supervisor training': 'सुपरवाइज़र प्रशिक्षण',
  'Public-area care': 'सार्वजनिक जगहों की देखभाल',
  Cook: 'रसोइया',
  Tandoor: 'तंदूर',
  'Continental grill': 'कॉन्टिनेंटल ग्रिल',
  'Food-safety (FSSAI) level 1': 'खाद्य सुरक्षा (FSSAI) स्तर 1',
  'Food-safety (FSSAI) level 2': 'खाद्य सुरक्षा (FSSAI) स्तर 2',
  'Menu costing': 'मेन्यू की लागत',
  'Pahadi regional menu': 'पहाड़ी क्षेत्रीय मेन्यू',
  'Prep & hygiene': 'तैयारी और स्वच्छता',
  'Fine-dining service': 'फ़ाइन-डाइनिंग सेवा',
  Barista: 'बरिस्ता',
  'Wine & mocktail service': 'वाइन और मॉकटेल सेवा',
  'Banquet service': 'बैंक्वेट सेवा',
  'Room service': 'रूम सर्विस',
  'Electrical (ITI)': 'इलेक्ट्रिकल (आईटीआई)',
  Plumbing: 'प्लंबिंग',
  'Geyser & boiler servicing': 'गीज़र और बॉयलर सर्विसिंग',
  'Solar water-heater maintenance': 'सोलर वॉटर-हीटर रखरखाव',
  'Basic electrical': 'बुनियादी बिजली का काम',
  'Garden & grounds': 'बाग़ और परिसर',
  'PSARA guard licence': 'PSARA गार्ड लाइसेंस',
  'Fire-safety & first-aid': 'अग्नि-सुरक्षा और प्राथमिक चिकित्सा',
  'CCTV monitoring': 'सीसीटीवी निगरानी',
}
export const skillL = (label: string, lang: Lang) => (lang === 'hi' ? (SKILL_HI[label] ?? label) : label)

export const SEASON_MONTHS = { summer: 'months47', autumn: 'months1011' } as const
