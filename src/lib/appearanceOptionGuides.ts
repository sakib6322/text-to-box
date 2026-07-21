export type AppearanceGuideItem = { title: string; body: string };

export const GUIDE_WEBSITE_UI: AppearanceGuideItem[] = [
  {
    title: "Font family",
    body: "কোথায়: পুরো অ্যাপ (student + admin) — body text, sidebar, header, ফর্ম। Save-এর পর reload/নতুন পেজে দেখবেন।",
  },
  {
    title: "Base font size / Line height",
    body: "কোথায়: `:root` font-size — সব general text। Concept detail typography আলাদা tab-এ।",
  },
  {
    title: "Border radius / Content max width / Density",
    body: "কোথায়: `--radius` → বাটন, input, glass-card। max width → main content column। Density → card/page padding ও gap (comfortable vs compact)।",
  },
  {
    title: "Cards (full chrome)",
    body: "কোথায়: Website UI → Cards — `.glass-card` / shadcn Card। Background, text, border, radius, padding, gap, shadow blur/offset/opacity/color, backdrop blur, hover border/shadow/lift/scale, transition। Phone/Tablet/Computer আলাদা + Set to all।",
  },
  {
    title: "Page padding / Section gap",
    body: "কোথায়: `.app-section-stack`, page shell margins — Cards section-এর সাথে Set to device।",
  },
  {
    title: "Set to Phone / Tablet / Computer / all",
    body: "বর্তমান edit device-এর theme colors/layout/labels অন্য device-এ কপি। Save না করলে শুধু draft — live site-এ যায় Save-এর পর।",
  },
  {
    title: "Theme colors (Primary, Accent, Background…)",
    body: "রঙ picker দিয়ে সিলেক্ট করুন (#hex দেখায়, ভিতরে HSL token সেভ)। কোথায়: `--primary` → বাটন, ring, glow; `--background` → page; `--card` → Cards section; `--border` → borders। Sidebar/header-এর আলাদা override থাকলে সেখানে priority বেশি।",
  },
  {
    title: "Page title gradient",
    body: "কোথায়: `.page-title` class — admin page headings (gradient primary→accent)। বন্ধ = solid foreground।",
  },
  {
    title: "Mesh background",
    body: "কোথায়: `html[data-mesh-bg]` — page shell soft gradient mesh।",
  },
  {
    title: "Animations (no global override)",
    body: "সাইট-wide Global motion সরানো হয়েছে — আর !important remap নেই। Animation শুধু যেখানে দরকার: Sidebar (menu/collapse), Landing Featured/Why, Cards (transition ms — ডিফল্ট 0), Performance → Reduce motion।",
  },
  {
    title: "Card backdrop blur / Sticky bar blur",
    body: "Card blur → Website UI → Cards (`--ui-card-backdrop-blur`)। Sticky bar blur → Theme colors নিচে। Mobile scroll lag হতে পারে। Header blur → Header section।",
  },
  {
    title: "Card shadow / hover",
    body: "কোথায়: Website UI → Cards — shadow blur/offset/opacity/color এবং hover border/lift/scale সব Appearance থেকে। Transition 0 = lag-free।",
  },
  {
    title: "Sidebar style — colors",
    body: "কোথায়: `AdminSidebar` + shadcn Sidebar — `--sidebar-*` tokens। Background/foreground/menu hover/active/brand title। Global theme color override করে না (sidebar নিজস্ব)।",
  },
  {
    title: "Sidebar style — width / brand / menu",
    body: "কোথায়: `--sidebar-width` desktop expanded; icon mode width; mobile sheet `--sb-width-mobile`; brand title/subtitle `AdminSidebar` top; menu font/height/padding/radius `[data-sidebar=menu-button]` ও submenu `[data-sidebar=menu-sub-button]`।",
  },
  {
    title: "Sidebar menu interaction",
    body: "কোথায়: menu/submenu click/hover — slide + press scale (`data-sb-menu-transform`, `--sb-menu-*`)। Sidebar collapse-এর আলাদা।",
  },
  {
    title: "Sidebar open / close",
    body: "কোথায়: toggle ক্লিকে sidebar hide/open — spacer width, panel transform/width, icon inner slide, menu size, group label, edge rail। আগে shadcn hardcode (200ms linear); এখন `data-sb-collapse-*` + `--sb-collapse-duration/easing`। Width animate = lag হতে পারে; Icon inner slide = transform-only।",
  },
  {
    title: "Sidebar page names",
    body: "কোথায়: `AdminSidebar` nav labels — Home, Settings, Question bank, ইত্যাদি। Route/path বদলায় না, শুধু display text।",
  },
  {
    title: "Header style — colors",
    body: "কোথায়: `AppShellHeader` — top sticky bar (page title, search, bell)। `--hdr-*` CSS vars। Sidebar/theme color থেকে আলাদা; header section দিয়ে override।",
  },
  {
    title: "Header style — layout / behavior",
    body: "Height, title size/weight, search box size/radius, padding। Hide on scroll down → scroll down-এ header slide up। Backdrop blur → header-এ glass effect (`data-hdr-blur`)।",
  },
];

export const GUIDE_CONCEPT: AppearanceGuideItem[] = [
  {
    title: "Font / Body size / Line height / Paragraph spacing",
    body: "কোথায়: Concept detail read view — `ConceptDetailPage`, `ConceptLearn` Step 1, `ConceptDetailsDialog`, `--cd-*` vars। Editor (CKEditor) typography নয়।",
  },
  {
    title: "Bold weight / H1–H3 size",
    body: "কোথায়: `.concept-detail-body` headings ও `<strong>` weight।",
  },
  {
    title: "Bullet size / List indent",
    body: "কোথায়: concept body `<ul>/<ol>` lists।",
  },
  {
    title: "Background color",
    body: "কোথায়: `.concept-detail-rich` body background (`--cd-bg`)। খালি = transparent (পেজ bg)। রঙ সেট করলে হালকা padding + radius।",
  },
  {
    title: "Unset text color",
    body: "Textbox/HTML-এ font color না দিলে এই রঙ (ডিফল্ট `#ffffff`)। Dark mode-এ Appearance-এর গাঢ় paragraph/heading থাকলেও এটা ব্যবহার হয়। Save to database দিয়ে সেভ হয়।",
  },
  {
    title: "Paragraph / Heading / Link / Bullet colors",
    body: "রঙ picker (#hex)। কোথায়: `.concept-detail-rich` text, h1–h3, a, li markers। Paragraph খালি = Unset text color।",
  },
  {
    title: "Table colors & sizing",
    body: "কোথায়: concept detail HTML tables — header row, borders, even rows, cell padding।",
  },
  {
    title: "Code background / Blockquote border",
    body: "কোথায়: `<code>` inline ও `<blockquote>` left border in concept body।",
  },
  {
    title: "Show key points on details",
    body: "কোথায়: `ConceptDetailPage` — body-র নিচে sorted key points list। Count/board বেশি = আগে।",
  },
  {
    title: "Student action buttons",
    body: "Details → concept header; Questions/Study/Practice → details + learn header; Study & Practice → My Suggestions card; Study → Practice setup back link। বন্ধ = বাটন render হয় না।",
  },
  {
    title: "Admin edit preview — Phone / Tablet / Computer",
    body: "কোথায়: Suggestions → Details inline panel। Browser width দিয়ে device detect (<768 Phone, 768–1023 Tablet, ≥1024 Computer)। Show preview column বন্ধ = শুধু Edit (Preview column নেই)। Preview চালু + slides চালু = HeadingSlideReader + progress। Preview চালু + slides বন্ধ = plain HTML preview।",
  },
];

export const GUIDE_STORY: AppearanceGuideItem[] = [
  { title: "Button label / Empty message", body: "কোথায়: concept pages-এ Story button text; story খালি থাকলে dialog message।" },
  { title: "Dialog max width", body: "কোথায়: Story panel/dialog — `data-sbl-dialog-width` (sm/md/lg/full)।" },
  { title: "Show button icon", body: "কোথায়: Story CTA button-এ book icon।" },
  { title: "Font / sizes / radius / padding", body: "কোথায়: story reader content panel — `--sbl-*` typography ও padding।" },
  { title: "Title / Body / Heading / Link colors", body: "রঙ picker। কোথায়: story dialog/panel text elements।" },
  { title: "Background / Panel / Accent / Border", body: "কোথায়: story panel shell, accent dots, borders।" },
  { title: "Set to Phone / Tablet / …", body: "Story design device间 copy — Save পর্যন্ত draft।" },
];

export const GUIDE_QUESTIONS: AppearanceGuideItem[] = [
  { title: "Use sidebar label as title / Custom page title", body: "কোথায়: All Questions admin page `<h1>` — sidebar label বা custom string।" },
  { title: "Empty message / Result badge / Sticky filters", body: "কোথায়: question list page — no results text, count badge, filter bar sticky top।" },
  { title: "List max width / Card gap", body: "কোথায়: question cards container width ও spacing।" },
  { title: "Paper shell (padding, radius, shadow, colors)", body: "কোথায়: each question paper card — `--aq-paper-*`।" },
  { title: "Header · taxonomy · badges", body: "কোথায়: paper top — subject line, T/F badges, mode/board chips colors।" },
  { title: "Stem / Options / Explanations", body: "কোথায়: question stem text, MCQ options/statements, explanation block labels/fonts/colors।" },
  { title: "Live paper preview", body: "Tab-এর নিচে sample paper — Save-এর আগে verify।" },
];

export const GUIDE_LANDING_COLORS: AppearanceGuideItem[] = [
  { title: "Hero background color 1–3", body: "কোথায়: public `/` landing hero gradient (`CourseLanding`) — fixed background layer।" },
  { title: "Courses / About / FAQ / Footer section bg", body: "কোথায়: respective landing sections sticky backgrounds — hex/rgba/gradient string।" },
  { title: "Text / Muted / Accent", body: "কোথায়: landing global text colors — nav, hero, sections।" },
  { title: "Course card / Routine / FAQ card bg", body: "কোথায়: course grid cards, routine panel, FAQ accordion items।" },
];

export const GUIDE_LANDING_NAV: AppearanceGuideItem[] = [
  { title: "Brand name", body: "কোথায়: landing header logo text + hero brand line।" },
  { title: "Nav · Courses / About / FAQ", body: "কোথায়: top nav anchor links → scroll to section ids।" },
  { title: "Login / Register button", body: "কোথায়: logged-out header CTA → `/login`।" },
  { title: "Go to app button", body: "কোথায়: logged-in header CTA → app entry route।" },
];

export const GUIDE_LANDING_HERO: AppearanceGuideItem[] = [
  { title: "Eyebrow / Headline / Supporting text", body: "কোথায়: hero section copy blocks।" },
  { title: "Explore CTA / Featured label", body: "কোথায়: hero primary button + featured carousel label।" },
  { title: "Fallback course title / description", body: "কোথায়: hero when no featured course API data।" },
  { title: "Fixed hero overlay", body: "কোথায়: hero decorative overlay div — position/size %।" },
];

export const GUIDE_LANDING_FEATURED: AppearanceGuideItem[] = [
  {
    title: "Slide rotation",
    body: "কোথায়: landing hero Featured Track card — autoplay, interval, max slides, pause on hover। Off-screen/tab hidden হলে timer চলে না।",
  },
  {
    title: "Slide transition",
    body: "কোথায়: slide change enter anim — enable, style (fade/slide/scale/none), duration, easing, slide distance, scale-from। শুধু opacity/transform (GPU); layout width animate নেই → lag কম।",
  },
  {
    title: "Card effects",
    body: "Hover lift = translateY (safe)। Shine = continuous paint; 3D tilt = perspective — heavier, default off।",
  },
];

export const GUIDE_LANDING_COURSES: AppearanceGuideItem[] = [
  { title: "Section title / subtitle", body: "কোথায়: `#courses` section heading।" },
  { title: "Routine / Enroll labels", body: "কোথায়: course card buttons — routine modal, enroll CTA text।" },
];

export const GUIDE_LANDING_ABOUT: AppearanceGuideItem[] = [
  { title: "About title / body", body: "কোথায়: About/Why section intro text।" },
  { title: "Why cards carousel", body: "কোথায়: `.pg-why-*` carousel — card title/body, autoplay interval।" },
];

export const GUIDE_LANDING_FAQ: AppearanceGuideItem[] = [
  { title: "FAQ title / subtitle", body: "কোথায়: FAQ section header on landing।" },
  { title: "Questions list", body: "কোথায়: public landing FAQ accordion items (Q/A pairs)।" },
];

export const GUIDE_LANDING_FOOTER: AppearanceGuideItem[] = [
  { title: "Footer brand / tagline / copyright", body: "কোথায়: landing page footer block।" },
  { title: "FAB label", body: "কোথায়: mobile floating action button text (if enabled)।" },
];

export const GUIDE_PROGRESS_STEPS: AppearanceGuideItem[] = [
  { title: "Step bar title", body: "কোথায়: `ConceptLearn` 4-step progress bar heading।" },
  { title: "Prefer Bengali step labels", body: "কোথায়: step bar — `labelBn` vs English `label`।" },
  { title: "Step 1–4 English / Bengali labels", body: "কোথায়: each step name in concept learn flow UI।" },
];

export const GUIDE_PROGRESS_COPY: AppearanceGuideItem[] = [
  { title: "Study progress title / subtitle", body: "কোথায়: `/study/progress` (My progress) page header।" },
  { title: "Course complete / Progress % suffix", body: "কোথায়: course cards — completion badge & percentage text।" },
  { title: "Exam Night / Final mock / Review mistakes", body: "কোথায়: profile/progress page feature cards — titles, subtitles, buttons।" },
  { title: "Concept practice intro / Step complete buttons", body: "কোথায়: practice setup intro; Step 1/2 complete button labels in learn flow।" },
  { title: "Locked steps message", body: "কোথায়: learn flow when user tries locked step।" },
];

export const GUIDE_PROGRESS_FEATURES: AppearanceGuideItem[] = [
  { title: "Progress Plan enabled", body: "কোথায়: global progress plan UI on/off (`data-progress-plan-enabled`)।" },
  { title: "Show concept step bar / % on browse", body: "কোথায়: concept learn header bar; course browse progress % badges।" },
  { title: "Exam Night / Final Mock / Review Mistakes cards", body: "কোথায়: profile page — show/hide each card type।" },
  { title: "Default pass %", body: "কোথায়: fallback when admin set lacks pass_percent threshold।" },
  { title: "Exam Night unlock (hours)", body: "কোথায়: hours before final mock when Exam Night card unlocks।" },
];

export const GUIDE_PROGRESS_COLORS: AppearanceGuideItem[] = [
  { title: "Progress bar / Complete badge", body: "রং picker। কোথায়: `--pg-progress-bar`, `--pg-complete-badge` — My progress bars, course complete chips।" },
  { title: "Exam Night / Final mock card colors", body: "কোথায়: profile feature cards bg/border/icon (`--pg-exam-night-*`, `--pg-final-mock-*`)।" },
  { title: "Mistake accent", body: "কোথায়: Review mistakes highlights — `--pg-mistake-accent`।" },
];

export const GUIDE_HEADING_SLIDES: AppearanceGuideItem[] = [
  { title: "Enable on Concept details", body: "কোথায়: Concept read views with `HeadingSlideReader` — Learn Step 1, details page, dialog।" },
  { title: "Enable on Story-based learning", body: "কোথায়: story reader/preview same slide UI।" },
  { title: "Split H1–H6", body: "কোথায়: which heading levels start a new slide (Word paste H1 default)।" },
  { title: "Content before first heading", body: "কোথায়: intro slide vs merge into first content slide।" },
  { title: "Show Next after scroll %", body: "কোথায়: scroll threshold before Next button appears।" },
  { title: "Min chars per slide", body: "কোথায়: tiny slides merged into previous (0 = off)।" },
  { title: "Scroll mode (Page / Nested)", body: "Page: whole page scrolls (Concept Learn recommended)। Nested: inner scroll box — mobile trap risk।" },
  { title: "Trap scroll inside nested box", body: "Nested only — scroll chaining to page on/off at box edge।" },
  { title: "Require scroll to end before Next", body: "কোথায়: must reach slide bottom before Next shows।" },
  { title: "Show next heading below button (card)", body: "কোথায়: heading preview card under Next button (`{heading}` template)।" },
  { title: "Show Previous / Show slide counter", body: "কোথায়: Previous button & `1 / N` counter in slide reader।" },
  {
    title: "Progress indicator (bar / dots)",
    body: "কোথায়: counter-এর নিচে visual progress — bar, dots, বা দুটো। Track/fill color, height, dot size Appearance থেকে। Concept details + Story heading slides।",
  },
  {
    title: "Progress label template",
    body: "কোথায়: bar/dots-এর পাশে label — `{percent}%`, `{current} of {total}`। Show progress label চালু থাকলে দেখায়।",
  },
  { title: "Sticky Next bar", body: "Nested mode — Next bar overlays scroll box footer।" },
  { title: "Next / Previous / Counter / Last slide labels", body: "কোথায়: button & counter text in `HeadingSlideReader`।" },
  { title: "Next bar background / text color", body: "রঙ picker। কোথায়: `--hs-next-bar-bg/fg` sticky Next bar।" },
  { title: "Live preview", body: "Sample HTML slide behavior before Save।" },
];

export const GUIDE_PERFORMANCE: AppearanceGuideItem[] = [
  { title: "Smooth scroll", body: "কোথায়: `html` scroll-behavior — shared; lag হলে Off রাখুন।" },
  {
    title: "Reduce motion",
    body: "কোথায়: `html[data-reduce-motion=1]` — সব animation/transition instant। Global motion আর নেই; Sidebar/Featured/Cards নিজের অপশন দিয়ে চলে।",
  },
];

export const GUIDE_RICH_EDITOR: AppearanceGuideItem[] = [
  { title: "Image lazy loading", body: "কোথায়: read views — `RichHtmlContent` img loading=lazy when near viewport।" },
  { title: "Direct image upload", body: "কোথায়: CKEditor toolbar upload — embeds base64 in saved HTML।" },
  { title: "Image compression", body: "কোথায়: upload pipeline resize/JPEG before embed (needs direct upload on)।" },
  { title: "Google Drive link → image", body: "কোথায়: paste Drive/public URL in Image dropdown → `/api/gdrive-image` proxy in HTML।" },
];

export const GUIDE_PREVIEW: AppearanceGuideItem[] = [
  { title: "Combined preview tab", body: "Website + Concept + Story sample একসাথে — Save-এর আগে quick check। Device tab (Phone/Tablet/Computer) বদলালে draft theme সেই device-এর জন্য apply হয় preview-তে।" },
];
