import { useState, useEffect, useCallback, useRef } from 'react';

export interface MasterItemOption {
  id: string;
  code: string;
  value: string;
  orderIndex?: number;
  metadata?: any;
}

export interface MasterCategoryInfo {
  id?: string;
  code: string;
  name: string;
  description?: string;
}

export interface UseMasterDataResult {
  data: MasterItemOption[];
  loading: boolean;
  error: string | null;
  categoryInfo: MasterCategoryInfo | null;
  refetch: () => Promise<void>;
  addItem: (code: string, value: string, orderIndex?: number) => Promise<boolean>;
}

// In-memory cache across hook instances
const masterDataCache: Record<
  string,
  {
    category: MasterCategoryInfo | null;
    items: MasterItemOption[];
    timestamp: number;
  }
> = {};

// Fallback items in case server is loading or offline
const FALLBACK_CATEGORIES: Record<string, { name: string; items: MasterItemOption[] }> = {
  DOWNTIME_REASON: {
    name: 'علل توقف خطوط و ماشین‌آلات',
    items: [
      { id: 'dt-1', code: 'DIE_BREAKDOWN', value: 'شکستگی یا گیر سنبه و ماتریس قالب (نیاز به قالب‌سازی)', orderIndex: 1 },
      { id: 'dt-2', code: 'COIL_REPLACE', value: 'تعویض کلاف ورق و ستاپ فیدر', orderIndex: 2 },
      { id: 'dt-3', code: 'PRESS_MECHANICAL', value: 'نقص فنی مکانیکی، نشتی روغن هیدرولیک یا افت فشار باد پرس', orderIndex: 3 },
      { id: 'dt-4', code: 'MAINTENANCE_PM', value: 'سرویس دوره‌ای و روان‌کاری برنامه‌ریزی‌شده (PM)', orderIndex: 4 },
      { id: 'dt-5', code: 'NO_MATERIAL', value: 'کسری رول ورق، عدم تطابق ابعاد نوار یا اتمام مهره جوشی', orderIndex: 5 },
      { id: 'dt-6', code: 'QC_DEFECT_STOP', value: 'توقف کیفی توسط بازرس خط (پلیسه بیش از حد / عدم انطباق ابعادی)', orderIndex: 6 },
      { id: 'dt-7', code: 'WAITING_ISIR', value: 'توقف در انتظار تایید قطعه اول توسط آزمایشگاه (ISIR / First Piece)', orderIndex: 7 },
      { id: 'dt-8', code: 'PLANNED_SMED', value: 'توقف برنامه‌ریزی‌شده تعویض قالب و ستاپ فیکسچر (SMED)', orderIndex: 8 },
      { id: 'dt-9', code: 'POWER_FACILITY', value: 'قطعی برق سراسری، افت فشار باد مرکزی کمپرسور یا عیب چیلر', orderIndex: 9 },
    ],
  },
  SCRAP_REASON: {
    name: 'دلایل ایجاد ضایعات فلزی',
    items: [
      { id: 'sc-1', code: 'TEAR_CRACK', value: 'پارگی و ترک‌خوردگی در کشش عمیق', orderIndex: 1 },
      { id: 'sc-2', code: 'WRINKLING', value: 'چروک‌افتادگی در بلنک یا لبه ورق', orderIndex: 2 },
      { id: 'sc-3', code: 'BURR_HIGH', value: 'پلیسه بیش از حد مجاز برش گیوتین و سنبه', orderIndex: 3 },
      { id: 'sc-4', code: 'SURFACE_DEFECT', value: 'خط و خش، زدگی یا ناخالصی متالورژیکی', orderIndex: 4 },
      { id: 'sc-5', code: 'DIMENSION_OUT', value: 'انحراف ابعادی خارج از تلرانس نقشه مهندسی', orderIndex: 5 },
      { id: 'sc-6', code: 'SETUP_SCRAP', value: 'ضایعات ستاپ و تنظیم قالب در شروع تولید', orderIndex: 6 },
    ],
  },
  UNIT_OF_MEASURE: {
    name: 'واحدهای سنجش و اندازه‌گیری',
    items: [
      { id: 'u-1', code: 'KG', value: 'کیلوگرم (وزن ورق و کویل)', orderIndex: 1 },
      { id: 'u-2', code: 'PCS', value: 'عدد (قطعه شمارشی)', orderIndex: 2 },
      { id: 'u-3', code: 'TON', value: 'تن (محموله‌های سنگین)', orderIndex: 3 },
      { id: 'u-4', code: 'M', value: 'متر (طول نوار ورق)', orderIndex: 4 },
      { id: 'u-5', code: 'PALLET', value: 'پالت فلزی ساپکو', orderIndex: 5 },
    ],
  },
  QUALITY_CLASS: {
    name: 'کلاس‌های کیفی بازرسی',
    items: [
      { id: 'q-1', code: 'GRADE_A', value: 'تایید کامل استاندارد (کیفیت ممتاز)', orderIndex: 1 },
      { id: 'q-2', code: 'GRADE_B', value: 'تایید مشروط / نیازمند دوباره‌کاری جزیی', orderIndex: 2 },
      { id: 'q-3', code: 'REJECTED', value: 'عدم انطباق قطعی (اسقاط و بازیافت)', orderIndex: 3 },
    ],
  },
};

/**
 * useMasterData
 * Custom hook to dynamically fetch, manage, and cache master items from database
 */
export function useMasterData(categoryCode: string): UseMasterDataResult {
  const normalizedKey = categoryCode ? categoryCode.trim().toUpperCase() : '';
  const fallback = FALLBACK_CATEGORIES[normalizedKey];

  const [data, setData] = useState<MasterItemOption[]>(() => {
    if (masterDataCache[normalizedKey]?.items) {
      return masterDataCache[normalizedKey].items;
    }
    return fallback?.items || [];
  });

  const [categoryInfo, setCategoryInfo] = useState<MasterCategoryInfo | null>(() => {
    if (masterDataCache[normalizedKey]?.category) {
      return masterDataCache[normalizedKey].category;
    }
    return fallback ? { code: normalizedKey, name: fallback.name } : null;
  });

  const [loading, setLoading] = useState<boolean>(!masterDataCache[normalizedKey]);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!normalizedKey) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/master-data/${encodeURIComponent(normalizedKey)}`);
      if (!res.ok) {
        throw new Error(`خطا در ارتباط با سرور (${res.status})`);
      }

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'خطا در دریافت اطلاعات دسته‌بندی پایه');
      }

      const items: MasterItemOption[] = json.data || [];
      const cat: MasterCategoryInfo = json.category || { code: normalizedKey, name: normalizedKey };

      // Update cache
      masterDataCache[normalizedKey] = {
        category: cat,
        items,
        timestamp: Date.now(),
      };

      if (isMountedRef.current) {
        setData(items);
        setCategoryInfo(cat);
      }
    } catch (err: any) {
      console.warn(`[useMasterData] Failed to fetch category ${normalizedKey}:`, err?.message);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'خطا در واکشی داده‌ها');
        // If cache exists or fallback exists, retain data
        if (!masterDataCache[normalizedKey]?.items && fallback?.items) {
          setData(fallback.items);
          setCategoryInfo({ code: normalizedKey, name: fallback.name });
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [normalizedKey, fallback]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addItem = useCallback(
    async (code: string, value: string, orderIndex: number = 0): Promise<boolean> => {
      try {
        const res = await fetch(`/api/master-data/${encodeURIComponent(normalizedKey)}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, value, orderIndex }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'خطا در افزودن مقدار جدید');
        }

        // Invalidate cache and refetch
        delete masterDataCache[normalizedKey];
        await fetchData();
        return true;
      } catch (e) {
        console.error('Failed to add master item:', e);
        return false;
      }
    },
    [normalizedKey, fetchData]
  );

  return {
    data,
    loading,
    error,
    categoryInfo,
    refetch: fetchData,
    addItem,
  };
}
