# Propela Ops

A comprehensive nurse recruitment and placement management platform built with React. Propela Ops streamlines the entire recruitment pipeline from candidate acquisition through placement tracking, with integrated communications, document management, analytics, and workflow automation.

## Features

- **Dashboard** - Real-time overview with KPIs, pipeline visualization, and activity feed
- **Nurse Database** - Comprehensive candidate profiles with search, filtering, and status tracking
- **Acquisition Hub** - Multi-channel candidate sourcing and lead management
- **Cohort Manager** - Group candidates into training cohorts with progress tracking
- **Outreach Log** - Track all recruitment outreach activities and follow-ups
- **Placement Tracker** - Manage facility placements with drag-and-drop scheduling
- **Analytics** - Interactive charts and metrics with Recharts visualizations
- **Document Management** - Upload, organize, and track compliance documents
- **Communications** - Integrated messaging with templates and bulk send
- **Reports & Export** - Generate and export reports in multiple formats
- **Integrations & API** - Connect with external systems and third-party services
- **Audit Trail** - Complete activity logging with search and filtering
- **Search & Navigation** - Global search across all modules with keyboard shortcuts
- **Workflow Automation** - Rule-based triggers and automated task assignment
- **Notifications & Alerts** - Real-time notifications with preference management
- **Help & Onboarding** - Interactive guides, tooltips, and knowledge base
- **Mobile & PWA** - Progressive Web App with offline support and responsive design
- **Performance Optimization** - Code splitting, virtualization, and lazy loading
- **Settings** - User preferences, system configuration, and customization
- **Status Page** - System health monitoring and service status

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React 19 |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v4 |
| Routing | react-router-dom 7 |
| Charts | Recharts 3 |
| Drag & Drop | @dnd-kit/core 6 |
| Internationalization | i18next |
| Icons | lucide-react |
| Performance | web-vitals |
| Testing | Vitest + @testing-library/react |
| E2E Testing | Playwright |

## Getting Started

### Prerequisites

- Node.js 22+
- npm 9+

### Installation

```bash
npm install --legacy-peer-deps
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build

```bash
npm run build
```

### Test

```bash
npm run test
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

## Project Structure

```
src/
├── App.jsx                  # Root component with lazy-loaded routes
├── main.jsx                 # Application entry point
├── index.css                # Global styles and Tailwind imports
├── components/
│   ├── ui/                  # Reusable UI components (EmptyState, VirtualList, etc.)
│   ├── layout/              # Layout components (ErrorBoundary, LoadingSpinner)
│   ├── nurses/              # Nurse-specific components
│   ├── placements/          # Placement-specific components
│   ├── dashboard/           # Dashboard widgets
│   ├── acquisition/         # Acquisition hub components
│   ├── analytics/           # Analytics charts and widgets
│   ├── audit/               # Audit trail components
│   ├── automations/         # Workflow automation components
│   ├── cohorts/             # Cohort management components
│   ├── communications/      # Messaging components
│   ├── documents/           # Document management components
│   ├── help/                # Help and onboarding components
│   ├── integrations/        # Integration components
│   ├── notifications/       # Notification components
│   ├── outreach/            # Outreach log components
│   ├── reports/             # Report components
│   ├── search/              # Search and navigation components
│   ├── settings/            # Settings components
│   └── accessibility/       # Accessibility utilities
├── context/
│   └── AppContext.jsx       # Global state with localStorage persistence
├── pages/                   # 17 lazy-loaded page components
├── hooks/                   # Custom React hooks
├── lib/                     # Utilities (storage, formatting, config, etc.)
├── data/                    # Seed data generators
├── i18n/                    # Internationalization configuration
└── test/                    # Test utilities and factories
    ├── utils.jsx            # Custom render with providers
    └── factories/           # Test data factories
docs/
├── ARCHITECTURE.md          # Architecture decision records
├── CHANGELOG.md             # Development history
└── COMPONENTS.md            # Reusable component documentation
tests/
└── e2e/                     # Playwright end-to-end tests
```

## Contributing

1. Follow existing patterns: lazy-loaded pages, AppContext for state, localStorage via `src/lib/storage.js`
2. Use Tailwind CSS for styling and lucide-react for icons
3. Write tests using Vitest and @testing-library/react
4. Use test factories from `src/test/factories/` for generating test data
5. Wrap test components with the custom render from `src/test/utils.jsx`
6. Run `npm run lint` and `npm run format` before committing

## License

Private - All rights reserved.
