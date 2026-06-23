# Component Documentation

This document covers the key reusable components in Propela Ops. These components are designed to be used across multiple pages and feature domains.

## UI Components (`src/components/ui/`)

### EmptyState

A reusable empty-state component for pages or sections that have no data to display.

**Location:** `src/components/ui/EmptyState.jsx`

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `icon` | `LucideIcon` | No | - | A lucide-react icon component to display |
| `title` | `string` | Yes | - | The heading text |
| `description` | `string` | Yes | - | Supporting description text |
| `actionLabel` | `string` | No | - | Optional button label |
| `onAction` | `function` | No | - | Optional button click handler |

**Usage:**

```jsx
import EmptyState from '../components/ui/EmptyState';
import { Users } from 'lucide-react';

<EmptyState
  icon={Users}
  title="No nurses found"
  description="Add your first nurse to get started with the recruitment pipeline."
  actionLabel="Add Nurse"
  onAction={() => setShowAddForm(true)}
/>
```

**Notes:**
- The action button only renders when both `actionLabel` and `onAction` are provided
- Uses the Propela purple brand color for the icon background and button

---

### PageTransition

A lightweight CSS-transition wrapper that animates page entry with an opacity and translateY fade-in using Tailwind animation classes.

**Location:** `src/components/ui/PageTransition.jsx`

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | `ReactNode` | Yes | - | Content to animate |
| `className` | `string` | No | `''` | Additional CSS classes to apply |

**Usage:**

```jsx
import PageTransition from '../components/ui/PageTransition';

<PageTransition>
  <div className="p-6">
    <h1>Page Content</h1>
  </div>
</PageTransition>
```

**Notes:**
- Uses the `animate-page-enter` Tailwind animation class
- Wrap entire page content for a consistent enter animation

---

### VirtualList

A virtualized list component that only renders visible items plus a small overscan buffer, enabling efficient rendering of large data sets.

**Location:** `src/components/ui/VirtualList.jsx`

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `items` | `Array` | Yes | - | Array of items to render |
| `itemHeight` | `number` | No | `60` | Height of each item in pixels |
| `renderItem` | `function` | Yes | - | Render function `(item, index) => ReactNode` |
| `containerHeight` | `string \| number` | No | `'500px'` | Height of the scroll container |
| `keyExtractor` | `function` | No | `(item, index) => index` | Function to extract unique keys |

**Usage:**

```jsx
import VirtualList from '../components/ui/VirtualList';

<VirtualList
  items={nurses}
  itemHeight={72}
  containerHeight="600px"
  keyExtractor={(nurse) => nurse.id}
  renderItem={(nurse, index) => (
    <div className="flex items-center px-4 py-2 border-b">
      <span>{nurse.name}</span>
      <span className="ml-auto text-sm text-gray-500">{nurse.status}</span>
    </div>
  )}
/>
```

**Notes:**
- Uses an overscan of 3 items above and below the visible window
- Absolute positioning ensures smooth scrolling without layout shifts
- Ideal for lists exceeding 100 items where full DOM rendering would be expensive

---

### ResponsiveTable

A table component that renders as a traditional table on desktop and switches to a card-based layout on mobile devices.

**Location:** `src/components/ui/ResponsiveTable.jsx`

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `columns` | `Array<{ key, label, render? }>` | Yes | - | Column definitions |
| `data` | `Array<Object>` | Yes | - | Row data objects |
| `onRowClick` | `function` | No | - | Click handler `(row) => void` |

**Column Object:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `key` | `string` | Yes | Property name to read from data objects |
| `label` | `string` | Yes | Display label for the column header |
| `render` | `function` | No | Custom render function `(value, row) => ReactNode` |

**Usage:**

```jsx
import ResponsiveTable from '../components/ui/ResponsiveTable';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status', render: (val) => <Badge>{val}</Badge> },
  { key: 'facility', label: 'Facility' },
];

<ResponsiveTable
  columns={columns}
  data={placements}
  onRowClick={(row) => navigate(`/placements/${row.id}`)}
/>
```

**Notes:**
- Breakpoint at 768px (md) determines table vs. card layout
- Rows have minimum touch target size (44px) when `onRowClick` is provided
- Custom `render` functions receive both the cell value and the full row object

---

### ResponsiveModal

A modal dialog that renders as a centered overlay on desktop and as a fullscreen panel on mobile. Includes focus trap, Escape key handling, and scroll lock.

**Location:** `src/components/ui/ResponsiveModal.jsx`

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | `boolean` | Yes | - | Controls visibility |
| `onClose` | `function` | Yes | - | Close handler |
| `title` | `string` | Yes | - | Modal heading |
| `children` | `ReactNode` | Yes | - | Modal body content |
| `size` | `'sm' \| 'md' \| 'lg' \| 'full'` | No | `'md'` | Width on desktop |

**Usage:**

```jsx
import ResponsiveModal from '../components/ui/ResponsiveModal';

<ResponsiveModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Add New Nurse"
  size="lg"
>
  <NurseForm onSubmit={handleSubmit} />
</ResponsiveModal>
```

**Notes:**
- Automatically locks body scroll when open
- Traps focus within the modal (Tab/Shift+Tab cycling)
- Closes on Escape key press
- Closes on backdrop click
- Restores focus to the previously focused element on close
- Uses `role="dialog"` and `aria-modal="true"` for accessibility

---

### CollapsibleFilter

A filter panel that displays expanded on desktop and collapses into a toggleable section on mobile.

**Location:** `src/components/ui/CollapsibleFilter.jsx`

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | No | `'Filters'` | Section heading / toggle button label |
| `children` | `ReactNode` | Yes | - | Filter controls to render |
| `defaultOpen` | `boolean` | No | `false` | Whether the panel starts expanded on mobile |

**Usage:**

```jsx
import CollapsibleFilter from '../components/ui/CollapsibleFilter';

<CollapsibleFilter title="Filter Nurses" defaultOpen={false}>
  <select value={status} onChange={handleStatusChange}>
    <option value="">All Statuses</option>
    <option value="active">Active</option>
    <option value="placed">Placed</option>
  </select>
  <input
    type="text"
    placeholder="Search by name..."
    value={search}
    onChange={handleSearchChange}
  />
</CollapsibleFilter>
```

**Notes:**
- On desktop (768px+), always renders children without the toggle button
- On mobile, renders as a collapsible section with animated expand/collapse
- Uses CSS max-height transition for smooth open/close animation
- Touch target meets 44px minimum for the toggle button

---

## Layout Components (`src/components/layout/`)

### LoadingSpinner

A centered loading indicator using the Loader2 icon with a spin animation.

**Location:** `src/components/layout/LoadingSpinner.jsx`

**Props:** None

**Usage:**

```jsx
import LoadingSpinner from '../components/layout/LoadingSpinner';

// As a Suspense fallback
<Suspense fallback={<LoadingSpinner />}>
  <LazyPage />
</Suspense>

// Inline loading state
{isLoading ? <LoadingSpinner /> : <Content />}
```

**Notes:**
- Renders centered with minimum height of 200px
- Uses the Propela purple brand color
- Used as the default Suspense fallback for lazy-loaded pages

---

### ErrorBoundary

A class-based React error boundary that catches rendering errors and displays a user-friendly fallback UI with recovery options.

**Location:** `src/components/layout/ErrorBoundary.jsx`

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | `ReactNode` | Yes | - | Components to wrap |
| `severity` | `'fatal' \| 'recoverable'` | No | `'fatal'` | Error severity level |

**Usage:**

```jsx
import ErrorBoundary from '../components/layout/ErrorBoundary';

// Wrap the entire app
<ErrorBoundary>
  <App />
</ErrorBoundary>

// Wrap a specific section with recovery option
<ErrorBoundary severity="recoverable">
  <RiskyComponent />
</ErrorBoundary>
```

**Notes:**
- Severity `'fatal'` shows reload and go-home buttons
- Severity `'recoverable'` adds a "Try Again" button that resets the error state
- In development mode, displays expandable error details (stack trace, component stack)
- Reports errors via `captureException` from the error reporting infrastructure
- Uses `role="alert"` for accessibility
