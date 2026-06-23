# Architecture Decision Records

This document captures key architectural decisions made during the development of Propela Ops, along with the rationale behind each choice.

## ADR-001: React Single Page Application with Client-Side Routing

**Status:** Accepted

**Context:** The application needs to manage complex state across multiple views for nurse recruitment workflows. Users expect fast navigation and the ability to work offline in areas with poor connectivity.

**Decision:** Build as a React SPA using react-router-dom for client-side routing with lazy-loaded page components.

**Rationale:**
- Fast navigation between views without full page reloads
- Enables offline capability through service workers (PWA)
- Simplifies deployment as static assets
- Rich component ecosystem for complex UI interactions
- Code splitting with React.lazy keeps initial bundle size manageable

**Consequences:**
- SEO is not a priority for this internal tool
- Initial load includes the router and shell, but lazy loading minimizes this
- All 17 pages are lazy-loaded to optimize the critical rendering path

---

## ADR-002: localStorage for Data Persistence

**Status:** Accepted

**Context:** The MVP needs to demonstrate full functionality without requiring backend infrastructure. The application should work entirely offline.

**Decision:** Use localStorage as the primary persistence layer, abstracted through `src/lib/storage.js`.

**Rationale:**
- No backend setup required for development or demos
- Enables offline-first architecture from day one
- Simple synchronous API reduces complexity
- Data persists across browser sessions
- Easy to migrate to a backend API later (swap storage adapter)

**Consequences:**
- Limited to approximately 5-10 MB of data per origin
- No multi-user or real-time collaboration
- No server-side validation or authorization
- Storage adapter pattern makes future backend integration straightforward

---

## ADR-003: Tailwind CSS v4 for Styling

**Status:** Accepted

**Context:** The application has 17 pages with consistent design patterns. Rapid development speed is critical, and the design should be maintainable by developers without deep CSS expertise.

**Decision:** Use Tailwind CSS v4 with the Vite plugin for utility-first styling.

**Rationale:**
- Utility-first approach eliminates naming debates and style conflicts
- JIT compilation produces minimal CSS bundles
- Consistent spacing, color, and typography scales
- Responsive design with built-in breakpoint utilities
- v4 offers improved performance and simplified configuration

**Consequences:**
- HTML can become verbose with many utility classes
- Developers need familiarity with Tailwind class names
- Custom design tokens defined in CSS variables for brand colors

---

## ADR-004: Vite for Build Tooling

**Status:** Accepted

**Context:** Developer experience is a priority. The project has 17 pages with many components, requiring fast rebuild times during development.

**Decision:** Use Vite 8 as the build tool with the React plugin.

**Rationale:**
- Near-instant Hot Module Replacement (HMR) during development
- Native ES module support eliminates bundling during dev
- Rollup-based production builds produce optimized output
- Built-in code splitting and asset optimization
- Plugin ecosystem for Tailwind, React Fast Refresh, and bundle analysis

**Consequences:**
- Requires modern browsers for development (ES module support)
- Production builds use Rollup under the hood
- Bundle analysis available via `npm run build:analyze`

---

## ADR-005: AppContext for Global State Management

**Status:** Accepted

**Context:** Multiple pages share state (nurses, placements, notifications, preferences). The team needs a state management solution that balances simplicity with capability.

**Decision:** Use React Context (AppContext) with useReducer pattern for global state, integrated with localStorage persistence.

**Rationale:**
- Built into React with no additional dependencies
- Simpler mental model than Redux for a team-scale application
- Direct integration with localStorage via storage adapter
- Sufficient for the data volumes in this application
- Toast notifications, user preferences, and entity state in one provider

**Consequences:**
- All context consumers re-render on any state change (mitigated with memoization)
- Not suitable for very high-frequency updates (not needed here)
- State shape is defined in a single file for easy reference

---

## ADR-006: Code Splitting with React.lazy and Suspense

**Status:** Accepted

**Context:** With 17 pages and numerous domain-specific components, the initial bundle size would be prohibitive without splitting.

**Decision:** All page-level components are loaded via React.lazy with Suspense fallbacks using LoadingSpinner.

**Rationale:**
- Reduces initial JavaScript payload by approximately 70%
- Each route loads only the code it needs
- Suspense provides a consistent loading experience
- Vite automatically creates optimal chunk boundaries
- Users on slow connections see content faster

**Consequences:**
- Brief loading state visible on first navigation to each page
- Prefetching could be added for predictive loading
- Error boundaries catch chunk-loading failures gracefully

---

## ADR-007: i18next for Internationalization

**Status:** Accepted

**Context:** The platform may need to support multiple languages in the future as the organization expands internationally. Adding i18n retroactively is expensive.

**Decision:** Integrate i18next with react-i18next from the start, with browser language detection.

**Rationale:**
- Industry-standard i18n library with proven React integration
- Browser language detection via i18next-browser-languagedetector
- Namespace support for organizing translations by module
- Interpolation and pluralization built in
- Adding new languages requires only translation files, no code changes

**Consequences:**
- Slight overhead wrapping strings in `t()` calls
- Translation keys need to be maintained alongside UI changes
- Currently shipping with English only; structure supports easy addition of more

---

## ADR-008: Component Architecture and Domain Organization

**Status:** Accepted

**Context:** With 17+ feature domains, component organization must prevent chaos while enabling discoverability.

**Decision:** Organize components by domain under `src/components/`, with shared UI components in `src/components/ui/` and layout components in `src/components/layout/`.

**Rationale:**
- Domain grouping keeps related components together (nurses/, placements/, etc.)
- Shared components in `ui/` are easily discoverable
- Layout components (ErrorBoundary, LoadingSpinner) are separate from feature components
- Flat structure within each domain folder avoids deep nesting
- Easy to locate components by feature area

**Consequences:**
- Some components may span domains (resolved by placing in the primary domain)
- Import paths are slightly longer but explicit
- New developers can find relevant code by feature area

---

## ADR-009: Vitest with Testing Library for Unit and Integration Testing

**Status:** Accepted

**Context:** The application needs comprehensive test coverage with fast feedback loops. Tests should validate behavior from the user's perspective.

**Decision:** Use Vitest as the test runner with @testing-library/react for component testing, supplemented by Playwright for E2E.

**Rationale:**
- Vitest integrates natively with Vite configuration
- Faster than Jest due to native ES module support
- @testing-library encourages testing user behavior over implementation details
- Custom render utility wraps components in necessary providers (Router, AppContext)
- Factory functions generate realistic test data consistently

**Consequences:**
- jsdom environment for unit tests (not full browser)
- Integration tests validate multi-component workflows
- E2E tests with Playwright cover critical paths in a real browser

---

## ADR-010: Progressive Web App with Service Worker

**Status:** Accepted

**Context:** Users in healthcare environments may have unreliable network connectivity. The application should remain functional offline and feel like a native app.

**Decision:** Implement PWA capabilities with a service worker, web app manifest, and offline support.

**Rationale:**
- Install-to-home-screen provides native-like experience
- Service worker caches assets for offline access
- Background sync can queue changes made offline
- Push notifications capability for alerts
- No app store deployment required for updates

**Consequences:**
- Service worker lifecycle must be managed carefully
- Cache invalidation strategy needed for updates
- Offline data writes are limited to localStorage capacity
