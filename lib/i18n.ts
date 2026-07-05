export const locales=["en","fr","es","ar"] as const;
export type Locale=(typeof locales)[number];
export async function getDictionary(locale:Locale){switch(locale){case"fr":return (await import("@/dictionaries/fr.json")).default;case"es":return (await import("@/dictionaries/es.json")).default;case"ar":return (await import("@/dictionaries/ar.json")).default;default:return (await import("@/dictionaries/en.json")).default}}
