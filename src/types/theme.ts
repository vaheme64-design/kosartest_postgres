export type ErpLayoutTemplate =
  | 'HUB_WORKSPACE'      // قالب ۱: کارتی و فضای کاری (مطابق تصویر ۱ و ERPNext Workspace)
  | 'TABBED_WORKBENCH'   // قالب ۲: میزکار تب‌بندی یکپارچه (مطابق تصویر ۲)
  | 'ODOO_ENTERPRISE'    // قالب ۳: ماتریس ماژولار و نوار ابزار بالا (الهام‌گرفته از Odoo)
  | 'CLASSIC_COMMAND';   // قالب ۴: مرکز فرماندهی صنعتی (قالب قبلی)

export type ErpColorTheme =
  | 'EMERALD_KOSAR'      // سبز زمردی کوثر (مطابق تصاویر ارسالی ۱ و ۲)
  | 'ODOO_PLUM'          // ارغوانی و فیروزه‌ای (سبک Odoo Enterprise)
  | 'ERPNEXT_BLUE'       // آبی مهندسی و تیتانیومی (سبک ERPNext / SAP Fiori)
  | 'INDUSTRIAL_AMBER';  // سرمه‌ای و کهربایی صنعتی (تم کلاسیک)

export interface LayoutTemplateMeta {
  id: ErpLayoutTemplate;
  title: string;
  subtitle: string;
  badge: string;
  sidebarStyle: 'DARK_RIGHT' | 'WHITE_RIGHT' | 'COMPACT_DRAWER' | 'GROUPED_LIGHT';
  headerStyle: 'WHITE_MINIMAL' | 'DARK_NAVY' | 'BRAND_COLORED' | 'COMMAND_BAR';
  defaultMasterDataMode: 'CARDS_HUB' | 'SEGMENTED_TABS';
  uxStrengths: string[];
  uiCharacteristics: string[];
  referenceImage?: string;
}

export interface ColorThemeMeta {
  id: ErpColorTheme;
  name: string;
  description: string;
  primaryHex: string;
  primaryHoverHex: string;
  primarySoftHex: string;
  sidebarDarkHex: string;
  headerDarkHex: string;
  activeBgClass: string;
  activeTextClass: string;
  softBgClass: string;
  softTextClass: string;
  borderAccentClass: string;
  buttonPrimaryClass: string;
}

export interface UnifiedColorPalette {
  appBackground: string;
  surface: string;
  surfaceMuted: string;
  borderSubtle: string;
  borderDefault: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverted: string;
  tableHeaderBg: string;
  tableHeaderText: string;
  tableHeaderBorder: string;
  tableRowBase: string;
  tableRowStripe: string;
  tableRowHover: string;
  tableRowText: string;
  cardBg: string;
  cardBorder: string;
  accentBrand: string;
  accentBadge: string;
  headerBannerBg: string;
  headerBannerText: string;
  headerBannerSubtext: string;
}

export const UNIFIED_COLOR_CONFIG: UnifiedColorPalette = {
  appBackground: 'bg-slate-50 text-slate-900',
  surface: 'bg-white',
  surfaceMuted: 'bg-slate-50',
  borderSubtle: 'border-slate-100',
  borderDefault: 'border-slate-200/90',
  borderStrong: 'border-slate-300',
  textPrimary: 'text-slate-900',
  textSecondary: 'text-slate-600',
  textMuted: 'text-slate-400',
  textInverted: 'text-white',
  tableHeaderBg: 'bg-slate-50',
  tableHeaderText: 'text-slate-700 font-semibold',
  tableHeaderBorder: 'border-b border-slate-200',
  tableRowBase: 'bg-white',
  tableRowStripe: 'even:bg-slate-50/50',
  tableRowHover: 'hover:bg-amber-50/40 hover:text-slate-950 transition-colors',
  tableRowText: 'text-slate-800',
  cardBg: 'bg-white',
  cardBorder: 'border border-slate-200/90 shadow-2xs',
  accentBrand: 'bg-orange-600 hover:bg-orange-500 text-white',
  accentBadge: 'bg-orange-50 text-orange-900 border border-orange-200 font-bold',
  headerBannerBg: 'bg-white border border-slate-200/90 shadow-2xs',
  headerBannerText: 'text-slate-900 font-bold',
  headerBannerSubtext: 'text-slate-500',
};

export const LAYOUT_TEMPLATES: Record<ErpLayoutTemplate, LayoutTemplateMeta> = {
  HUB_WORKSPACE: {
    id: 'HUB_WORKSPACE',
    title: 'قالب ۱: فضای کاری کارتی (سبک ERPNext / تصویر ۱)',
    subtitle: 'سایدبار تیره در راست + هدر سفید خلوت + صفحه فرود کارتی ماژول‌ها («ورود به بخش ←»)',
    badge: 'پیشنهادی برای تسلط سریع و جلوگیری از شلوغی',
    sidebarStyle: 'DARK_RIGHT',
    headerStyle: 'WHITE_MINIMAL',
    defaultMasterDataMode: 'CARDS_HUB',
    referenceImage: '/assets/aistudio/1_1da4846f.jpg',
    uxStrengths: [
      'کاهش بار ذهنی (Cognitive Load): به جای نمایش چند جدول سنگین زیر هم، هر بخش (قطعات، کویل، BOM، مسیر تولید، شیفت‌ها) یک کارت مستقل با توضیح شفاف دارد.',
      'الگوی Workspace در ERPNext: کاربر ابتدا نمای کلی ماژول را در یک گرید ۴ ستونه می‌بیند و با کلیک روی «ورود به بخش ←» مستقیماً وارد جدول همان زیربخش می‌شود.',
      'تمرکز چشمی عالی: سایدبار سرمه‌ای تیره با دکمه فعال سبز زمردی، مرز مشخصی بین ناوبری و فضای کاری سفید ایجاد می‌کند.',
    ],
    uiCharacteristics: [
      'منوی سمت راست تیره (#111c24) با نشان سبز KP در بالا و کارت پروفایل کاربر در پایین',
      'نوار بالای سفید و مینیمال شامل عنوان بخش فعال در راست و ساعت/تاریخ شمسی در چپ',
      'کارت‌های سفید با آیکون سبز ملایم، توضیح یک‌خطی و لینک «ورود به بخش ←»',
    ],
  },
  TABBED_WORKBENCH: {
    id: 'TABBED_WORKBENCH',
    title: 'قالب ۲: میزکار تب‌بندی یکپارچه (مطابق تصویر ۲)',
    subtitle: 'هدر سرمه‌ای تیره سراسری + سایدبار سفید روشن + نوار تب افقی یکپارچه بالای جداول',
    badge: 'پیشنهادی برای اپراتورها و ورود سریع داده',
    sidebarStyle: 'WHITE_RIGHT',
    headerStyle: 'DARK_NAVY',
    defaultMasterDataMode: 'SEGMENTED_TABS',
    referenceImage: '/assets/aistudio/2_5080a2ed.jpg',
    uxStrengths: [
      'جابجایی تک‌کلیکی بین موجودیت‌ها: تمام زیربخش‌های مرتبط (قطعات | ماده اولیه | عملیات | ماشین‌آلات | قالب‌ها | مسیر تولید | انبارها | مشتریان | سفارشات) در یک نوار کپسولی افقی قرار دارند.',
      'صرفه‌جویی در ارتفاع صفحه: بدون نیاز به اسکرول عمودی یا بازگشت به صفحه قبلی، کاربر بین ورق‌های ST12/ST13، قطعات، قالب‌ها و سفارشات جابجا می‌شود.',
      'کنتراست بالای جدول عملیاتی: جدول تمام‌عرض با نوار سبز عمودی در سمت راست، بج‌های وضعیت «فعال» و دکمه «+ ماده اولیه جدید».',
    ],
    uiCharacteristics: [
      'هدر تیره سراسری (#0f172a) با لوگوی سبز KPIMS در راست و دکمه خروج در چپ',
      'سایدبار سفید تمیز با دکمه فعال کپسولی رنگی و آیکون‌های خطی واضح',
      'نوار تب کپسولی خاکستری ملایم (Segmented Control) و جدول با حاشیه راست رنگی',
    ],
  },
  ODOO_ENTERPRISE: {
    id: 'ODOO_ENTERPRISE',
    title: 'قالب ۳: ماتریس ماژولار و کنترل‌پنل (سبک Odoo)',
    subtitle: 'نوار برند ارغوانی/فیروزه‌ای + کشوی ۹ نقطه‌ای برنامه‌ها + دکمه‌های آماری هوشمند (Smart Buttons)',
    badge: 'الهام‌گرفته از Odoo MRP & Inventory',
    sidebarStyle: 'COMPACT_DRAWER',
    headerStyle: 'BRAND_COLORED',
    defaultMasterDataMode: 'CARDS_HUB',
    uxStrengths: [
      'کنترل‌پنل یکپارچه در بالای هر صفحه: شامل مسیر راهنما (Breadcrumb)، جستجوی چندبعدی، دکمه‌های عملیاتی اصلی و سوییچر نمای کارتی (Kanban) / جدولی (List).',
      'دکمه‌های آماری هوشمند (Smart Stat Buttons): نمایش مستقیم تعداد رول‌های فعال، کسری‌های نقطه سفارش و برنامه‌های تولید در هدر هر فرم.',
      'سوییچر سریع برنامه‌ها (App Switcher): دسترسی فوری به تمام ۱۰ ماژول کارخانه از طریق ماتریس تصویری.',
    ],
    uiCharacteristics: [
      'نوار بالای رنگی متمایز با منوی ماتریسی برنامه‌ها (۹ نقطه) و نشانگرهای زنده',
      'امکان سوییچ آنی بین نمای کانبان/کارتی و نمای لیست متراکم در هر زیرماژول',
      'طراحی فرم‌ها به سبک برگه کاغذی (Sheet) با نوار وضعیت مرحله‌ای (Pipeline Status Bar)',
    ],
  },
  CLASSIC_COMMAND: {
    id: 'CLASSIC_COMMAND',
    title: 'قالب ۴: مرکز فرماندهی صنعتی (قالب استاندارد)',
    subtitle: 'نوار جستجوی فرماندهی (Ctrl+K) + منوی درختی گروه‌بندی‌شده بر اساس نقش',
    badge: 'قالب پیش‌فرض قبلی',
    sidebarStyle: 'GROUPED_LIGHT',
    headerStyle: 'COMMAND_BAR',
    defaultMasterDataMode: 'SEGMENTED_TABS',
    uxStrengths: [
      'منوی درختی ۳ سطحی: تفکیک «هسته موجودی و انبار»، «برنامه‌ریزی و اجرای تولید» و «اطلاعات پایه و گزارش‌ها».',
      'فیلتر هوشمند بر اساس نقش سازمانی (انباردار، مدیر تولید، سرپرست سالن، بازرس QC).',
      'نوار جستجوی سراسری ماژول‌ها، زیرماژول‌ها و عملیات سریع در بالای صفحه.',
    ],
    uiCharacteristics: [
      'پالت خنثی صنعتی (Slate) با تاکیدهای کهربایی و آبی مهندسی',
      'نمایش مستقیم زیرماژول‌های انبار (رول ورق، قراردادها، نقطه سفارش، کاردکس) در سایدبار',
      'نوار اعلان کسری نقطه سفارش و انتخابگر نقش در هدر بالا',
    ],
  },
};

export const COLOR_THEMES: Record<ErpColorTheme, ColorThemeMeta> = {
  EMERALD_KOSAR: {
    id: 'EMERALD_KOSAR',
    name: 'سبز زمردی کوثر (مطابق تصاویر ۱ و ۲)',
    description: 'سبز صنعتی با طراوت و کنتراست بالا در کنار سرمه‌ای تیره (#10b981 / #059669)',
    primaryHex: '#059669',
    primaryHoverHex: '#047857',
    primarySoftHex: '#ecfdf5',
    sidebarDarkHex: '#111c24',
    headerDarkHex: '#0f172a',
    activeBgClass: 'bg-emerald-600 text-white shadow-xs',
    activeTextClass: 'text-emerald-700',
    softBgClass: 'bg-emerald-50 border-emerald-200',
    softTextClass: 'text-emerald-800',
    borderAccentClass: 'border-r-4 border-r-emerald-500',
    buttonPrimaryClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  ODOO_PLUM: {
    id: 'ODOO_PLUM',
    name: 'ارغوانی و فیروزه‌ای (سبک Odoo)',
    description: 'ترکیب ارغوانی سازمانی Odoo (#714B67) با دکمه‌های عملیاتی فیروزه‌ای (#017E84)',
    primaryHex: '#714B67',
    primaryHoverHex: '#5a3b52',
    primarySoftHex: '#fdf4ff',
    sidebarDarkHex: '#2b1c28',
    headerDarkHex: '#714B67',
    activeBgClass: 'bg-[#714B67] text-white shadow-xs',
    activeTextClass: 'text-[#714B67]',
    softBgClass: 'bg-fuchsia-50/80 border-fuchsia-200',
    softTextClass: 'text-[#714B67]',
    borderAccentClass: 'border-r-4 border-r-[#017E84]',
    buttonPrimaryClass: 'bg-[#017E84] hover:bg-[#016469] text-white',
  },
  ERPNEXT_BLUE: {
    id: 'ERPNEXT_BLUE',
    name: 'آبی مهندسی (سبک ERPNext / SAP)',
    description: 'آبی کبالت مهندسی و تیتانیومی مناسب محیط‌های برنامه‌ریزی و MRP (#2563eb)',
    primaryHex: '#2563eb',
    primaryHoverHex: '#1d4ed8',
    primarySoftHex: '#eff6ff',
    sidebarDarkHex: '#0f172a',
    headerDarkHex: '#1e293b',
    activeBgClass: 'bg-blue-600 text-white shadow-xs',
    activeTextClass: 'text-blue-700',
    softBgClass: 'bg-blue-50 border-blue-200',
    softTextClass: 'text-blue-800',
    borderAccentClass: 'border-r-4 border-r-blue-600',
    buttonPrimaryClass: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  INDUSTRIAL_AMBER: {
    id: 'INDUSTRIAL_AMBER',
    name: 'سرمه‌ای و کهربایی صنعتی (کلاسیک)',
    description: 'سرمه‌ای فولادی تیره با نشانگرهای کهربایی مخصوص کارخانجات پرسکاری (#0f172a)',
    primaryHex: '#0f172a',
    primaryHoverHex: '#1e293b',
    primarySoftHex: '#fffbeb',
    sidebarDarkHex: '#0f172a',
    headerDarkHex: '#0f172a',
    activeBgClass: 'bg-slate-900 text-white shadow-xs',
    activeTextClass: 'text-slate-900',
    softBgClass: 'bg-amber-50 border-amber-200',
    softTextClass: 'text-amber-900',
    borderAccentClass: 'border-r-4 border-r-amber-500',
    buttonPrimaryClass: 'bg-slate-900 hover:bg-slate-800 text-white',
  },
};
