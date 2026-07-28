# KotaKata.AI — Phase 1: Project Scaffolding & Foundation

## Objective
Initialize the Expo + TypeScript project with Clean Architecture & Feature-First folder structure, tooling, navigation, and screen skeletons.

## Steps
1. Run `npx create-expo-app kotakata --template blank-typescript`
2. Set `"strict": true` in tsconfig.json
3. Install dependencies: `@react-navigation/native`, `@react-navigation/native-stack`, `react-native-screens`, `react-native-safe-area-context`, `zustand`, `react-native-reanimated`, `react-native-gesture-handler`
4. Create folder structure per plan
5. Set up ESLint + Prettier config
6. Create ThemeProvider with light/dark context
7. Create ErrorBoundary component
8. Create screen skeletons: MainMenu, Game, History, Profile, Settings
9. Set up native-stack navigator

## Key Files to Create
- `src/app/App.tsx` — Entry point with providers
- `src/presentation/navigation/RootNavigator.tsx`
- `src/presentation/components/providers/ThemeProvider.tsx`
- `src/presentation/components/common/ErrorBoundary.tsx`
- `src/utils/logger.ts`

## Conventions
- TypeScript strict mode, no `any`
- 2-space indent, max 120 chars
- PascalCase for components, camelCase for hooks/functions
- Feature-First folder structure under `src/features/`
