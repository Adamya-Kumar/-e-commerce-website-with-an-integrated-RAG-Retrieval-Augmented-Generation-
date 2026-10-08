# UI Context: Spark Admin look and feel

## Theme

The entire product (storefront, account area, admin, chatbot drawer) looks and feels like the **Spark Admin** theme in `reference/spark-admin-theme/`. Light mode only. Visual language: soft sage-grey canvas, large pure-white rounded cards with soft shadows and no borders, a very dark forest-green sidebar/accents, and a vivid lime highlight for active states and key CTAs. Typography is friendly, bold and tight (Plus Jakarta Sans). Dark mode is out of scope.

Source of truth for exact values: `reference/spark-admin-theme/assets/css/main.css` (tokens in section 2; sidebar, navbar, cards, tables, forms, buttons, badges in later sections). Port, do not reinterpret.

## Color tokens (CSS variables in `client/src/styles/tokens.css`, mapped in Tailwind)

| Role | CSS variable | Value | Tailwind name |
|---|---|---|---|
| Page canvas | `--bg-canvas` | `#F4F6F5` | `bg-canvas` |
| Card surface | `--card-background` | `#FFFFFF` | `bg-card` |
| Brand dark (sidebar, footer) | `--brand-forest-dark` | `#051C12` | `forest-dark` |
| Brand medium (hero, dark cards, primary button) | `--brand-forest-medium` | `#072F1F` | `forest-medium` |
| Brand light (dark-surface interactive) | `--brand-forest-light` | `#1A3E30` | `forest-light` |
| Accent lime | `--brand-lime` | `#B4F105` | `lime` |
| Accent lime hover | `--brand-lime-hover` | `#C1F824` | `lime-hover` |
| Lime translucent | `--brand-lime-translucent` | `rgba(180,241,5,0.15)` | `lime-soft` |
| Text main | `--text-main` | `#0B130F` | `text-main` |
| Text muted | `--text-muted-green` | `#6C7E75` | `text-muted-green` |
| Sidebar text muted | `--text-sidebar-muted` | `#879A91` | `text-sidebar-muted` |
| Border light | `--border-light` | `#E9EFEF` | `border-light` |
| Border on dark | `--border-dark-green` | `rgba(255,255,255,0.1)` | `border-dark-green` |
| Success / bg | `--sys-green` / `--sys-green-bg` | `#22C55E` / `#DCFCE7` | `sys-green`, `sys-green-bg` |
| Danger / bg | `--sys-red` / `--sys-red-bg` | `#EF4444` / `#FEE2E2` | `sys-red`, `sys-red-bg` |
| Warning / bg | `--sys-orange` / `--sys-orange-bg` | `#F97316` / `#FFEDD5` | `sys-orange`, `sys-orange-bg` |
| Promo sage card | `--bg-promo` | `#E2E8DF` | `bg-promo` |

The hex values appear only in `tokens.css`. Components use token classes.

## Typography

| Role | Font | Variable |
|---|---|---|
| All UI text | Plus Jakarta Sans (weights 300-800, Google Fonts) | `--font-sans` |

Scale from the theme: page title (`.page-title`), card title 1.1rem / 700, stat value 2rem / 800 with letter-spacing -0.03em, stat label 0.875rem / 500 in muted green, body 0.875-0.95rem, table header 0.75rem / 700 uppercase with 0.05em tracking.

## Border radius, shadow, size tokens

| Token | Value | Use |
|---|---|---|
| `rounded-xxl` | 24px | Cards, hero, promo, drawer |
| `rounded-xl` | 18px | Product cards, table cards |
| `rounded-lg` | 14px | Inputs, chat bubbles, image frames |
| `rounded-md` | 10px | Sidebar links, small buttons |
| `rounded-sm` | 6px | Tiny chips |
| `rounded-full` | 9999px | Pill buttons, badges, FAB |
| `shadow-spark-sm` | `0 2px 8px rgba(11,19,15,0.02)` | Subtle |
| `shadow-spark-md` | `0 10px 30px rgba(11,19,15,0.04)` | Cards |
| `shadow-spark-lg` | `0 20px 50px rgba(11,19,15,0.08)` | Drawer, modals, dropdowns |
| `--sidebar-width` | 280px (80px collapsed) | Admin sidebar |
| `--navbar-height` | 80px | Top bars |

## Component library

Custom Spark UI kit in `client/src/components/ui/` built with Tailwind (no Bootstrap, no MUI). Components: Button (variants below), Card, StatCard, Input/Select/Textarea, Badge/StatusBadge, DataTable, Modal, Drawer, Dropdown, Skeleton, EmptyState, Pagination, Toast, Spinner.

Button variants (from the theme):
- `primary`: forest-medium bg, white text; hover forest-dark (`.btn-custom-primary`).
- `accent`: lime bg, forest-medium text; hover lime-hover (`.btn-custom-secondary`). Use for the single key CTA per view.
- `dark-pill`: text-main bg, white text, fully rounded, 0.875rem / 600 (`.btn-dark-custom`).
- `outline`, `ghost`, `danger`.

Inputs (`.form-control-custom`): white, 1px border `rgba(11,19,15,0.12)`, radius 14px, padding 0.6rem 1rem, 0.875rem / 500; focus border forest-medium + 3px ring `rgba(7,47,31,0.08)`; invalid/valid states use sys-red / sys-green.

Status badges (`.badge-table` with leading dot): success (green), pending (orange), failed (red). Order status mapping: placed/confirmed = pending, packed/shipped/out_for_delivery = pending, delivered = success, cancelled/returned = failed, return_requested = pending.

## Layout patterns

- **Admin:** exact Spark layout: fixed dark sidebar (forest-dark, 280px, collapsible to 80px, section titles, lime left indicator on active link with lime icon), fixed top navbar (80px: search, notification dropdown, profile dropdown), content on canvas with `.page-header` (title + subtitle + action button), stat cards row, ApexCharts cards, `table-card-custom` + `table-custom` tables.
- **Storefront:** same language without the sidebar: 80px top navbar (white, rounded, search pill, cart icon with lime count badge, account dropdown), centered container (max 1280px). Hero = forest-medium rounded-xxl card with a lime badge and a geometric lime/forest shape (like `.alert-green-card`), CTA `accent` button. Category strip as rounded chips. Product grid of white rounded-xl cards: image in rounded-lg frame, title 700, price in the stat-value style, discount as a green trend-badge, `dark-pill` "Add to cart". Filter panel = white card on the left (desktop) or a drawer (mobile). Footer = forest-dark with muted-sidebar text.
- **Auth pages:** follow the theme's login page (`page-login.html`, `.login-wrapper`).
- **Chatbot:** a Start chat action in the storefront navbar and floating action button bottom-right (lime circle, forest icon, 56px) open the same right-side drawer (width 420px, full width on mobile, rounded-xxl on the left edge, shadow-spark-lg). At desktop widths, the drawer reserves space and the storefront narrows beside it; below desktop, it opens over the page with a backdrop. Header forest-dark with lime sparkle icon and title. Bot message = white card bubble; user message = forest-medium bubble with white text; radius lg. Suggested prompts = lime-soft chips. Product cards inside chat = compact versions of storefront cards. Confirmation card = bordered card with total + `accent` Confirm and `outline` Cancel buttons. Typing indicator = three muted dots.
- Responsive: mobile-first; sidebar becomes an off-canvas overlay below 992px (as in the theme); tables scroll horizontally.

## Icons

Bootstrap Icons (`bootstrap-icons`), as used in the theme. Sizes: 1.15rem in nav/sidebar, 1rem inline, 1.25rem in buttons. Active sidebar icon = lime.

## Motion

Transitions 0.2s ease-in-out on hover (as in theme); 0.3s cubic-bezier(0.4,0,0.2,1) for sidebar/drawer. Hover lift `translateY(-1px)` on dark-pill buttons. No other animation in v1.
