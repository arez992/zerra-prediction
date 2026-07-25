const fs=require("fs");
function patch(p,fn){let s=fs.readFileSync(p,"utf8");let n=fn(s);if(n===s){console.log("NOOP:",p);return}fs.writeFileSync(p,n,"utf8");console.log("PATCHED:",p)}
patch("app/api/admin/ai-ceo/seo-pages/route.ts",s=>s.replace(/const\s+language\s*=\s*body\.language\s*===\s*"ku"\s*\?\s*"ku"\s*:\s*"en"\s*;/m,'const language = "en" as const;'));
patch("lib/ai-ceo/internalLinkValidation.ts",s=>s.replace(/\(en\|ku\)/g,"(en|fr|es|ar)").replace("Link is missing an /en or /ku locale prefix.","Link is missing a supported locale prefix (/en, /fr, /es, or /ar)."));
patch("lib/ai-ceo/seoContentWriter.ts",s=>s.replace(/const\s+languageInstruction\s*=\s*input\.language\s*===\s*"ku"[\s\S]*?:\s*"Write in professional, natural English\.";/m,'const languageInstruction =\n    "Write in professional, natural English.";'));
console.log("KU_PHASE1_RECOVERY_DONE");
