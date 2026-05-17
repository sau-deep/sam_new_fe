// English translation imports
import commonEN from './locales/en.json'
import householdEN from './household/en.json'
import biannualEN from './biannual/en.json'
import FollowupEN from './followup/en.json'
import routineEN from './routine/en.json'

// Hindi translation imports
import commonHI from './locales/hi.json'
import householdHI from './household/hi.json'
import biannualHI from './biannual/hi.json'
import FollowupHI from './followup/hi.json'
import routineHI from './routine/hi.json'

// Odyia translation imports
import commonODI from './locales/odi.json'
import householdODI from './household/odi.json'
import biannualODI from './biannual/odi.json'
import FollowupODI from './followup/odi.json'
import routineODI from './routine/odi.json'

// Telagu translation imports
import commonTEL from './locales/tel.json'
import householdTEL from './household/tel.json'
import biannualTEL from './biannual/tel.json'
import FollowupTEL from './followup/tel.json'
import routineTEL from './routine/tel.json'

// Merged translations (for backward compatibility)
const translationEN = {...commonEN, ...householdEN, ...FollowupEN, ...biannualEN, ...routineEN}
const translationHI = {...commonHI, ...householdHI, ...FollowupHI, ...biannualHI, ...routineHI}
const translationODI = {...commonODI, ...householdODI, ...FollowupODI, ...biannualODI, ...routineODI}
const translationTEL = {...commonTEL, ...householdTEL, ...FollowupTEL, ...biannualTEL, ...routineTEL}

// Form-specific translations
const formTranslations = {
  biannual: {
    en: {...commonEN, ...biannualEN},
    hi: {...commonHI, ...biannualHI},
    odi: {...commonODI, ...biannualODI},
    tel: {...commonTEL, ...biannualTEL}
  },
  followup: {
    en: {...commonEN, ...FollowupEN},
    hi: {...commonHI, ...FollowupHI},
    odi: {...commonODI, ...FollowupODI},
    tel: {...commonTEL, ...FollowupTEL}
  },
  household: {
    en: {...commonEN, ...householdEN},
    hi: {...commonHI, ...householdHI},
    odi: {...commonODI, ...householdODI},
    tel: {...commonTEL, ...householdTEL}
  },
  routine: {
    en: {...commonEN, ...routineEN},
    hi: {...commonHI, ...routineHI},
    odi: {...commonODI, ...routineODI},
    tel: {...commonTEL, ...routineTEL}
  }
};

export { 
  translationEN, 
  translationHI, 
  translationODI, 
  translationTEL,
  formTranslations
};