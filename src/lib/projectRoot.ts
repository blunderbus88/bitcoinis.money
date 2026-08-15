// Resolves the project root at runtime.
//
// Deliberately NOT derived from import.meta.url: Vite bundles src/lib/*.ts
// into dist/server/chunks/*.mjs during build, which changes how many
// directories "up" the real project root is relative to the compiled file.
// process.cwd() is stable across `astro dev`, `astro preview`, and
// `node dist/server/entry.mjs`, all of which are documented (README, the
// Dockerfile CMD) to run from the project root.
export const PROJECT_ROOT = process.cwd();
