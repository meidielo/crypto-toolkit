# Lessons Learned

## 2026-04-05 - Initial Build

### Lesson: Don't use require() in ESM/Vite projects
- The RSA manual key calculator initially used `require('@/lib/crypto-math')` inside a function body
- Vite + ESM doesn't support CommonJS require
- Fix: Import at the top of the file like any other ESM import

### Lesson: shadcn init requires Tailwind CSS configured first
- Running `npx shadcn init` before configuring the Tailwind vite plugin and import aliases will fail
- Must set up vite.config.ts with tailwindcss plugin and tsconfig paths FIRST

### Lesson: TypeScript noUnusedLocals catches unused imports
- The strict TS config flags unused imports as errors during `tsc -b`
- Always clean up imports after refactoring (removed unused Textarea, binaryToText, etc.)

### Lesson: Always follow TEST > UPDATE > COMMIT > NEXT PHASE
- User expects verified, documented, committed work before moving forward
- No exceptions. No loose ends.
