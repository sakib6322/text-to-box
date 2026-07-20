export type AppearanceGuideItem = { title: string; body: string };

export const GUIDE_WEBSITE_UI: AppearanceGuideItem[] = [
  { title: "Font family / Base font size / Line height", body: "পুরো অ্যাপের ডিফল্ট টাইপোগ্রাফি। ছাত্র/অ্যাডমিন পেজের বেস টেক্সট সাইজ ও লাইন স্পেসিং।" },
  { title: "Border radius / Content max width / Density", body: "কার্ড ও বাটনের কোণার গোলত্ব, কন্টেন্টের সর্বোচ্চ প্রস্থ, এবং comfortable/compact ঘনত্ব।" },
  { title: "Card border width / opacity", body: "কার্ড বর্ডারের পুরুত্ব ও স্বচ্ছতা। মোবাইলে 0 দিলে বর্ডার উধাও — device আলাদা করে সেট করা যায়।" },
  { title: "Card / Page padding / Section gap", body: "কার্ডের ভিতরের ফাঁকা জায়গা, পেজ মার্জিন, এবং সেকশনগুলোর মধ্যে ফাঁক।" },
  { title: "Set to Phone / Tablet / Computer / all", body: "বর্তমান ডিভাইসের লেআউট/রঙ/লেবেল অন্য ডিভাইসে কপি করে। Save না করলে শুধু ড্রাফট।" },
  { title: "Colors (Primary, Accent, …)", body: "থিমের মূল রঙ — HSL মান `hsl()` ছাড়া (যেমন `222 47% 11%`)। বাটন, লিংক, ব্যাকগ্রাউন্ড ইত্যাদিতে লাগে।" },
  { title: "Sidebar background / foreground", body: "বাম সাইডবারের ব্যাকগ্রাউন্ড ও টেক্সট রঙ।" },
  { title: "Page title gradient / Mesh background", body: "পেজ টাইটেলে গ্রেডিয়েন্ট এবং পেজ ব্যাকগ্রাউন্ডে soft mesh ইফেক্ট চালু/বন্ধ।" },
  { title: "Card backdrop blur / Sticky bar blur", body: "কার্ড ও sticky হেডারে ব্লার। মোবাইলে স্ক্রল ল্যাগ বাড়াতে পারে — সাবধানে।" },
  { title: "Card shadow / Card hover highlight", body: "কার্ডের ছায়া এবং হোভারে প্রাইমারি-টিন্টেড বর্ডার।" },
  { title: "Sidebar page names", body: "সাইডবারের প্রতিটি মেনু আইটেমের প্রদর্শন নাম (Home, Settings, Appearance ইত্যাদি)।" },
];

export const GUIDE_CONCEPT: AppearanceGuideItem[] = [
  { title: "Font / Body size / Line height / Paragraph spacing", body: "Concept detail (শিক্ষার্থী পড়ার ভিউ) টেক্সটের ফন্ট, সাইজ, লাইন হাইট ও প্যারাগ্রাফ ফাঁক।" },
  { title: "Bold weight / H1–H3 size", body: "বোল্ড কত শক্ত দেখাবে এবং হেডিং লেভেলের ফন্ট সাইজ।" },
  { title: "Bullet size / List indent", body: "তালিকার বুলেট সাইজ ও বাম ইনডেন্ট।" },
  { title: "Paragraph / Heading / Link / Bullet colors", body: "বডি, H1–H3, লিংক ও বুলেটের রঙ।" },
  { title: "Table colors & sizing", body: "টেবিল হেডার ব্যাকগ্রাউন্ড/টেক্সট, বর্ডার, জোড় সারি, ফন্ট সাইজ ও সেল প্যাডিং।" },
  { title: "Code background / Blockquote border", body: "ইনলাইন কোডের ব্যাকগ্রাউন্ড এবং ব্লককোটের বাম বর্ডার রঙ।" },
];

export const GUIDE_STORY: AppearanceGuideItem[] = [
  { title: "Button label / Empty message", body: "Story বাটনের লেখা এবং স্টোরি খালি থাকলে যে মেসেজ দেখায়।" },
  { title: "Dialog max width", body: "Story প্যানেল/ডায়ালগ কত চওড়া হবে (md → full)।" },
  { title: "Show button icon", body: "বাটনের পাশে বই আইকন দেখাবে কি না।" },
  { title: "Font / sizes / radius / padding", body: "স্টোরি কন্টেন্টের টাইপোগ্রাফি, বর্ডার রেডিয়াস ও ভিতরের প্যাডিং।" },
  { title: "Title / Body / Heading / Link colors", body: "স্টোরি টাইটেল, বডি, হেডিং ও লিংকের রঙ।" },
  { title: "Background / Panel / Accent / Border", body: "প্যানেলের ব্যাকগ্রাউন্ড, অ্যাকসেন্ট ডট ও বর্ডার রঙ।" },
  { title: "Set to Phone / Tablet / …", body: "এই ডিভাইসের Story ডিজাইন অন্য ডিভাইসে কপি।" },
];

export const GUIDE_QUESTIONS: AppearanceGuideItem[] = [
  { title: "Use sidebar label as title / Custom page title", body: "পেজ টাইটেল সাইডবার লেবেল থেকে নেবে, নাকি নিচের কাস্টম টাইটেল ব্যবহার করবে।" },
  { title: "Empty message / Result badge / Sticky filters", body: "প্রশ্ন না থাকলে মেসেজ, ফলাফল কাউন্ট ব্যাজ, এবং ফিল্টার বার স্ক্রলে আটকে থাকবে কি না।" },
  { title: "List max width / Card gap", body: "প্রশ্ন তালিকার প্রস্থ ও কার্ডগুলোর ফাঁক।" },
  { title: "Paper shell (padding, radius, shadow, colors)", body: "প্রশ্নপত্র কার্ডের চেহারা — প্যাডিং, কোণা, ছায়া, ব্যাকগ্রাউন্ড ও বর্ডার।" },
  { title: "Header · taxonomy · badges", body: "পেপার হেডার, সাবজেক্ট/ট্যাক্সোনমি লাইন এবং T/F বা অপশন ব্যাজের রঙ/বর্ডার।" },
  { title: "Stem / Options / Explanations", body: "প্রশ্ন স্টেম, অপশন/স্টেটমেন্ট এবং Explanation ব্লকের ফন্ট, রঙ ও লেবেল।" },
  { title: "Live paper preview", body: "নিচের নমুনা পেপারে উপরের সেটিংস লাইভ দেখায় — Save করার আগে যাচাই।" },
];

export const GUIDE_LANDING_COLORS: AppearanceGuideItem[] = [
  { title: "Hero background color 1–3", body: "Hero সেকশনের গ্রেডিয়েন্ট তিন রঙ থেকে তৈরি। ব্যাকগ্রাউন্ড ফিক্সড থাকে, কন্টেন্ট স্ক্রল করে।" },
  { title: "Courses / About / FAQ / Footer section bg", body: "প্রতিটি সেকশনের আলাদা sticky ব্যাকগ্রাউন্ড — hex, rgba বা CSS gradient।" },
  { title: "Text / Muted / Accent", body: "ল্যান্ডিংয়ের মূল টেক্সট, মিউটেড টেক্সট ও অ্যাকসেন্ট রঙ।" },
  { title: "Course card / Routine / FAQ card bg", body: "কোর্স কার্ড, রুটিন প্যানেল ও FAQ কার্ডের ব্যাকগ্রাউন্ড/বর্ডার।" },
];

export const GUIDE_LANDING_NAV: AppearanceGuideItem[] = [
  { title: "Brand name", body: "Header ও Hero-তে দেখানো ব্র্যান্ড/প্রোডাক্ট নাম।" },
  { title: "Nav · Courses / About / FAQ", body: "উপরের নেভ মেনু লিংকের লেখা — সংশ্লিষ্ট সেকশনে নিয়ে যায়।" },
  { title: "Login / Register button", body: "লগইন না থাকলে ডানদিকের CTA টেক্সট।" },
  { title: "Go to app button", body: "লগইন থাকলে একই জায়গার CTA — অ্যাপে প্রবেশ।" },
];

export const GUIDE_LANDING_HERO: AppearanceGuideItem[] = [
  { title: "Eyebrow / Headline / Supporting text", body: "Hero-এর ছোট উপরে লেখা, বড় শিরোনাম এবং সাপোর্টিং প্যারাগ্রাফ।" },
  { title: "Explore CTA / Featured label", body: "Explore বাটনের লেখা এবং Featured ট্র্যাক লেবেল।" },
  { title: "Fallback course title / description", body: "কোর্স ডেটা না থাকলে Hero-তে যে নমুনা টাইটেল/বর্ণনা দেখায়।" },
  { title: "Fixed hero overlay", body: "Hero-এর উপর ফিক্সড রঙের ওভারলে — প্রস্থ/উচ্চতা/টপ অফসেট (%) দিয়ে নিয়ন্ত্রণ।" },
];

export const GUIDE_LANDING_FEATURED: AppearanceGuideItem[] = [
  { title: "Autoplay / Interval / Transition", body: "ফিচার্ড স্লাইড অটো ঘুরবে কি না, কত সেকেন্ড পর, এবং fade/slide/scale অ্যানিমেশন।" },
  { title: "Max slides", body: "ফিচার্ড কার্ডে সর্বোচ্চ কতগুলো কোর্স স্লাইড দেখাবে।" },
  { title: "Shine / 3D tilt / Hover lift", body: "চকচকে shine, 3D tilt ও হোভার লিফট — মোবাইলে ল্যাগ করতে পারে, ডিফল্টে সাবধানে ব্যবহার করুন।" },
];

export const GUIDE_LANDING_COURSES: AppearanceGuideItem[] = [
  { title: "Section title / subtitle", body: "Courses সেকশনের শিরোনাম ও সাবটাইটেল।" },
  { title: "Routine / Enroll labels", body: "রুটিন বোতাম ও এনরোল/CTA লেবেলের টেক্সট।" },
];

export const GUIDE_LANDING_ABOUT: AppearanceGuideItem[] = [
  { title: "About title / body", body: "Why/About সেকশনের শিরোনাম ও বর্ণনা।" },
  { title: "Why cards carousel", body: "কার্ডগুলোর অটোপ্লে, ইন্টারভাল এবং প্রতিটি কার্ডের টাইটেল/বডি — ল্যান্ডিংয়ের “কেন এই কোর্স” ক্যারousel।" },
];

export const GUIDE_LANDING_FAQ: AppearanceGuideItem[] = [
  { title: "FAQ title / subtitle", body: "FAQ সেকশনের হেডিং।" },
  { title: "Questions list", body: "প্রশ্ন–উত্তর জোড়া যোগ/সম্পাদনা/মুছে ফেলা। পাবলিক ল্যান্ডিংয়ে অ্যাকর্ডিয়ন হিসেবে দেখায়।" },
];

export const GUIDE_LANDING_FOOTER: AppearanceGuideItem[] = [
  { title: "Footer brand / tagline / copyright", body: "ফুটারের ব্র্যান্ড লাইন, ট্যাগলাইন ও কপিরাইট টেক্সট।" },
  { title: "FAB label", body: "মোবাইল ফ্লোটিং অ্যাকশন বাটনের লেখা (যদি চালু থাকে)।" },
];

export const GUIDE_PROGRESS_STEPS: AppearanceGuideItem[] = [
  { title: "Step bar title", body: "কনসেপ্ট লার্ন পেজের ৪-স্টেপ বারের উপরে দেখানো টাইটেল।" },
  { title: "Prefer Bengali step labels", body: "চালু থাকলে step.labelBn দেখাবে; না হলে ইংরেজি label।" },
  { title: "Step 1–4 English / Bengali labels", body: "প্রতিটি ধাপের নাম (Concept Learning, Key Points, …) দুই ভাষায়।" },
];

export const GUIDE_PROGRESS_COPY: AppearanceGuideItem[] = [
  { title: "Study progress title / subtitle", body: "My progress পেজের শিরোনাম ও সাবটাইটেল।" },
  { title: "Course complete / Progress % suffix", body: "কোর্স শেষ ব্যাজ এবং “42% complete”-এর মতো সাফিক্স।" },
  { title: "Exam Night / Final mock / Review mistakes", body: "প্রোফাইল/প্রগ্রেস কার্ডের টাইটেল, সাবটাইটেল ও বাটন টেক্সট।" },
  { title: "Concept practice intro / Step complete buttons", body: "প্র্যাকটিস ইন্ট্রো এবং Step 1/2 সম্পন্ন বাটনের লেখা।" },
  { title: "Locked steps message", body: "আগের ধাপ শেষ না হলে যে সতর্কবার্তা দেখায়।" },
];

export const GUIDE_PROGRESS_FEATURES: AppearanceGuideItem[] = [
  { title: "Progress Plan enabled", body: "পুরো প্রগ্রেস প্ল্যান ফিচার চালু/বন্ধ।" },
  { title: "Show concept step bar / % on browse", body: "কনসেপ্ট পেজে স্টেপ বার এবং কোর্স ব্রাউজে % দেখাবে কি না।" },
  { title: "Exam Night / Final Mock / Review Mistakes cards", body: "প্রোফাইলে সংশ্লিষ্ট কার্ড দেখাবে কি না।" },
  { title: "Default pass %", body: "অ্যাডমিন সেটে pass_percent না থাকলে ব্যবহৃত পাস মার্ক।" },
  { title: "Exam Night unlock (hours)", body: "ফাইনাল মক-এর কত ঘণ্টা আগে Exam Night আনলক হবে।" },
];

export const GUIDE_PROGRESS_COLORS: AppearanceGuideItem[] = [
  { title: "Progress bar / Complete badge", body: "প্রগ্রেস বার ও “complete” ব্যাজের রঙ।" },
  { title: "Exam Night / Final mock card colors", body: "কার্ড ব্যাকগ্রাউন্ড, বর্ডার ও আইকন রঙ।" },
  { title: "Mistake accent", body: "Review mistakes হাইলাইট অ্যাকসেন্ট রঙ।" },
];

export const GUIDE_HEADING_SLIDES: AppearanceGuideItem[] = [
  { title: "Enable on Concept details", body: "কনসেপ্ট ডিটেইলস পড়ার ভিউতে (Learn Step 1, ডায়ালগ, পেজ) heading অনুযায়ী স্লাইড চালু।" },
  { title: "Enable on Story-based learning", body: "স্টোরি রিড/প্রিভিউতে একই স্লাইড UI চালু।" },
  { title: "Split H1 / H2 / H3", body: "কোন হেডিং লেভেলে নতুন স্লাইড শুরু হবে। ডিফল্ট শুধু H1।" },
  { title: "Content before first heading", body: "প্রথম স্প্লিট হেডিংয়ের আগের কন্টেন্ট আলাদা Intro স্লাইড হবে, নাকি প্রথম স্লাইডে মিলবে।" },
  { title: "Show Next after scroll %", body: "স্ক্রল কত % হলে Next দেখাবে (যেমন 85)।" },
  { title: "Min chars per slide", body: "খুব ছোট স্লাইড আগেরটার সাথে মার্জ — 0 মানে বন্ধ।" },
  { title: "Require scroll to end before Next", body: "চালু থাকলে নিচে না গেলে Next দেখাবে না।" },
  { title: "Show next heading below button (card)", body: "Next বাটনে heading না — বাটনের নিচের কার্ডে পরের স্লাইডের heading।" },
  { title: "Show Previous / Show slide counter", body: "Previous বাটন এবং “1 / N” কাউন্টার দেখাবে কি না।" },
  { title: "Sticky Next bar", body: "Next বার স্ক্রল বক্সের নিচে ওভারলে থাকবে — লেআউট জাম্প/ওভারল্যাপ কমবে।" },
  { title: "Next / Previous / Counter / Last slide labels", body: "বাটন ও কাউন্টার টেক্সট। Heading card template-এ `{heading}` ব্যবহার করুন।" },
  { title: "Next bar background / text color", body: "Next বারের ব্যাকগ্রাউন্ড ও টেক্সট রঙ (CSS color)।" },
  { title: "Live preview", body: "নমুনা HTML দিয়ে স্লাইড আচরণ এখানেই টেস্ট — Save করার আগে দেখুন।" },
];

export const GUIDE_PERFORMANCE: AppearanceGuideItem[] = [
  { title: "Smooth scroll", body: "পেজ স্মুথ স্ক্রল। সব ডিভাইসে শেয়ারড — অনেক সময় ল্যাগ বাড়ায়।" },
  { title: "Reduce motion", body: "অ্যানিমেশন কমায় (অ্যাক্সেসিবিলিটি / পারফরম্যান্স)।" },
];

export const GUIDE_PREVIEW: AppearanceGuideItem[] = [
  { title: "Live preview panel", body: "বর্তমান ভিউপোর্ট ডিভাইসের থিম দিয়ে নমুনা UI দেখায়। উপরে যে ডিভাইস এডিট করছেন সেটা আলাদা হতে পারে।" },
  { title: "Load defaults into draft", body: "সব অপশন ডিফল্টে রিসেট করে ড্রাফটে — ডাটাবেজে যায় না যতক্ষণ Save না করেন।" },
];
