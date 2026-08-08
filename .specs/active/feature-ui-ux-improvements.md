# Feature Plan: UI/UX Improvements - Webapp

**Status:** Planning  
**Priority:** Medium  
**Complexity:** Medium  
**Estimated Time:** 3-5 days (incremental)

---

## Objective

Migliorare l'esperienza utente della webapp attraverso:

- Migliore contrast e readability
- Responsive design per mobile/tablet
- Animazioni smooth
- Accessibility (a11y)
- Loading states più chiari
- Better error messages
- Consistent spacing/padding

---

## Issues to Address

### 1. Contrast Issues

- Testo su background scuri in dark mode a volte illeggibile
- Bottoni insufficientemente visibili
- Link non sempre distinguibili

### 2. Responsive Design

- Sidebar sidebar troppo wide su mobile
- Toolbar buttons sovrapposti su mobile
- Dialog modali non ottimizzate per small screens
- Header controls non accessible su dispositivi piccoli

### 3. Accessibility (a11y)

- Missing ARIA labels su bottoni icon-only
- Focus states non evidenti
- Keyboard navigation incompleto
- Color non è l'unico indicatore dello stato

### 4. Animations

- Transizioni tra pagine troppo instant
- Hover states troppo subtili
- Loading spinners assenti in alcuni posti

### 5. Spacing & Layout

- Padding incoerente tra componenti
- Line-height troppo piccolo in alcuni testi
- Modal dialogs con contenuto non scrollabile

---

## Solution

### Phase 1: Design System Audit (0.5 day)

Documenta gli standard da seguire:

- **Color palette**: Contrast ratio WCAG AA minimum (4.5:1)
- **Typography**: Consistent font sizes, weights
- **Spacing scale**: 4px, 8px, 12px, 16px, 24px, 32px
- **Breakpoints**: `sm: 640px`, `md: 768px`, `lg: 1024px`

### Phase 2: Component Improvements (2 days)

#### A. Sidebar (mobile-friendly)

```tsx
// frontend/src/app/components/Sidebar.tsx
// Add responsive behavior:
// - Collapsible on md and below
// - Hamburger menu icon
// - Smooth slide-in/out animation
// - Touch-friendly button sizes

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      className={`
      transition-all duration-300 ease-in-out
      ${isOpen ? "w-64" : "w-0 hidden md:w-64"}
    `}
    >
      {/* content */}
    </div>
  );
}
```

#### B. Toolbar (responsive)

```tsx
// frontend/src/app/components/Toolbar.tsx
// - Wrap buttons in flex-wrap
// - Reduce button padding on small screens
// - Use icon-only on mobile, text on desktop
// - Add ARIA labels
```

#### C. Modal Dialogs (scrollable, accessible)

```tsx
// All dialogs should:
// - Have max-height with scrollable content
// - Include close button (X) top-right
// - Support Escape key to close
// - Trap focus inside modal
// - Have proper ARIA attributes
```

#### D. Dark Mode Improvements

```tsx
// Ensure all text in dark mode:
// - Text: text-gray-900 dark:text-gray-100
// - Labels: text-gray-700 dark:text-gray-300
// - Disabled: text-gray-500 dark:text-gray-600
// - Increase font-size in dark mode if needed
```

### Phase 3: Animations & Transitions (1 day)

```tsx
// Page transitions
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.2 }}
>
  {children}
</motion.div>

// Hover states
className="transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"

// Loading spinners (use Tailwind CSS spinner or framer-motion)
<div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full" />
```

### Phase 4: Accessibility (a11y) Audit (1 day)

```tsx
// Audit checklist:
// - All interactive elements keyboard accessible (Tab, Enter, Space)
// - Focus visible with ring or outline
// - ARIA labels on icon-only buttons
// - Form labels properly associated (<label htmlFor>)
// - Headings use semantic h1-h6 (no skips)
// - Color contrast tested with WCAG Color Contrast Checker
// - Icons have aria-label or <title> inside <svg>
// - Tables have <thead>, <tbody>, proper <th>

// Example fixes:
<button
  aria-label={t("closeDialog")}
  onClick={onClose}
  className="focus:outline-none focus:ring-2 focus:ring-offset-2"
>
  ✕
</button>
```

### Phase 5: Error Messages & Validation (1 day)

```tsx
// Better error states:
// - Show inline validation errors under inputs
// - Use red color + icon for errors
// - Highlight invalid inputs with red border
// - Include helpful messages (not just "Error")

// Example:
{
  errors.email && (
    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
      <AlertIcon size={16} />
      {errors.email}
    </p>
  );
}
```

---

## Implementation Checklist

### General

- [ ] Install `framer-motion` for animations (optional)
- [ ] Create CSS utility classes for consistent spacing
- [ ] Document color palette + contrast ratios
- [ ] Setup responsive design breakpoints

### Sidebar

- [ ] Add collapse/expand toggle
- [ ] Test on mobile (320px - 640px)
- [ ] Smooth animations

### Toolbar

- [ ] Responsive button layout
- [ ] Icon-only labels on mobile
- [ ] Accessibility (aria-label)

### Dialogs

- [ ] Add max-height + scroll
- [ ] Escape key handler
- [ ] Focus trap
- [ ] Proper z-index stacking

### Forms

- [ ] Inline validation errors
- [ ] Focus indicators
- [ ] Proper labeling

### Header/Navigation

- [ ] Better contrast on text
- [ ] Mobile hamburger menu
- [ ] Sticky positioning

### Loading States

- [ ] Add spinners where needed
- [ ] Disabled button states clear
- [ ] Loading text ("Saving...", "Loading...")

---

## Testing

- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Responsive testing (DevTools emulation)
- [ ] Accessibility test with axe DevTools
- [ ] Keyboard navigation test (Tab through all pages)
- [ ] Dark mode verification on all components

---

## Performance Considerations

- Use CSS transitions instead of JS where possible (better perf)
- Lazy load heavy components
- Optimize animations (60fps target)
- Memoize expensive components

---

## Future Enhancements

- [ ] Custom theme selector (light/dark/auto)
- [ ] Font size adjustment for accessibility
- [ ] High contrast mode
- [ ] Reduced motion preference support
- [ ] RTL language support (if needed)

---

## References

- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Tailwind responsive: https://tailwindcss.com/docs/responsive-design
- Framer Motion: https://www.framer.com/motion/
- axe DevTools: https://www.deque.com/axe/devtools/
