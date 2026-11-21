import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Atomic design boundaries (see AGENTS.md, "Project structure").
// A tier may import lower tiers only, and shared components never import features.
// Outside a feature, import it only through its public index: @/features/<name>.
const tiers = ['atoms', 'molecules', 'organisms', 'templates']
const tierPattern = (tier) => [`@/components/${tier}`, `@/components/${tier}/**`, `**/${tier}`, `**/${tier}/**`]
const featurePattern = ['@/features', '@/features/**', '**/features', '**/features/**']
const deepFeaturePattern = ['@/features/*/*', '@/features/*/**/*']

const restrict = (...groups) => ({
  'no-restricted-imports': ['error', { patterns: groups }],
})

const tierBoundaries = tiers.map((tier, index) => ({
  files: [`src/components/${tier}/**/*.{ts,tsx}`],
  rules: restrict(
    ...tiers.slice(index + 1).map((higher) => ({
      group: tierPattern(higher),
      message: `${tier} must not import ${higher}. A tier imports lower tiers only.`,
    })),
    {
      group: featurePattern,
      message: 'Shared components must stay feature-neutral and never import a feature.',
    },
  ),
}))

export default defineConfig([
  // src/components/reui is vendor code installed by the ReUI CLI and is never edited.
  globalIgnores(['dist', 'src-tauri', 'src/components/reui', 'src/routeTree.gen.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/components/**', 'src/features/**', 'src/workspace/**'],
    rules: restrict({
      group: deepFeaturePattern,
      message: 'Import a feature through its public index: @/features/<name>.',
    }),
  },
  {
    files: ['src/workspace/**/*.{ts,tsx}'],
    rules: restrict({
      group: featurePattern,
      message:
        'The workspace is feature-neutral. Features register through the DocumentType contract in src/app.',
    }),
  },
  ...tierBoundaries,
])
