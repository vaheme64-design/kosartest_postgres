import { AiActionPayload, AiSettings } from '../types/ai';
import { Part, WarehouseDefinition } from '../types/inventory';

// Persian digit to English converter
export function convertPersianDigitsToEnglish(str: string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(persianDigits[i], 'g'), i.toString());
    res = res.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
  }
  return res;
}

/**
 * Intelligent Local Offline NLP Rule Engine
 * Works 100% offline without external servers.
 */
export function processLocalNlpCommand(
  promptText: string,
  partsCatalog: Part[],
  _warehouses: WarehouseDefinition[]
): AiActionPayload {
  const rawText = promptText.trim();
  const normalizedText = convertPersianDigitsToEnglish(rawText).toLowerCase();

  // 1. Detect Intent with strict priority
  const isCreateMo = /دستور\s*تولید|دستور\s*ساخت|برنامه\s*تولید|صدور\s*mo|ساخت\s*قطعه|تولید\s*جدید|تولید\s*بیار|بچ\s*تولید|mo-[0-9]+/i.test(rawText);
  const isTrackOrder = /پیگیری|ردیابی\s*دستور|وضعیت\s*دستور|کد\s*پیگیری|ارسال\s*به\s*خط/i.test(rawText) && !isCreateMo;
  const isHeatTrace = /شماره\s*ذوب|ذوب|هیت|heat|شجره\s*نامه|ذوب\s*ساپکو/i.test(rawText) && !isCreateMo;

  const isExplicitReceipt = /رسید\s*انبار|رسید\s*کالا|ورود\s*ورق|ورود\s*کالا|پذیرش\s*انبار|خرید\s*ورق|تحویل\s*به\s*انبار/i.test(rawText) || (/رسید|ورود/i.test(rawText) && !isCreateMo);
  const isExplicitIssue = /حواله\s*خروج|خروج\s*از\s*انبار|مصرف\s*ورق|تحویل\s*به\s*پرس|ارسال\s*به\s*ساپکو/i.test(rawText) || (/حواله|خروج/i.test(rawText) && !isCreateMo);
  const isReorderCheck = /کسری|نقطه\s*سفارش|کمبود|سفارش\s*گذاری|بحرانی|آلارم/i.test(rawText);
  const isStockQuery = /موجودی|چقدر\s*داریم|استعلام|موجود/i.test(rawText) && !isExplicitReceipt && !isExplicitIssue;
  const isNavigate = /برو\s*به|باز\s*کن|نمایش\s*بده|صفحه|ماژول/i.test(rawText);

  // 2. Extract Numbers (Quantity / Weight)
  let extractedQuantity: number | undefined;
  const qtyMatch = normalizedText.match(/(?:وزن\s*[:=]?\s*|تعداد\s*[:=]?\s*|تیراژ\s*[:=]?\s*)?([0-9]+(?:[.,][0-9]+)?)\s*(?:کیلوگرم|کیلو|تن|عدد|kg|pcs)?/i);
  if (qtyMatch && qtyMatch[1]) {
    const parsed = parseFloat(qtyMatch[1].replace(/,/g, ''));
    if (!isNaN(parsed) && parsed > 0) {
      if (/تن/i.test(rawText) && parsed < 100) {
        extractedQuantity = parsed * 1000;
      } else {
        extractedQuantity = parsed;
      }
    }
  }

  // 3. Extract Coil Pack Number (کویل پک, CP-1234, رول)
  let extractedCoilPack: string | undefined;
  const coilPackMatch = normalizedText.match(/(?:کویل\s*پک|کویلپک|پک|coil\s*pack|cp)\s*[:=]?\s*([a-z0-9\-_]+)/i);
  if (coilPackMatch && coilPackMatch[1]) {
    extractedCoilPack = coilPackMatch[1].toUpperCase();
    if (!extractedCoilPack.startsWith('CP-') && /^[0-9]/.test(extractedCoilPack)) {
      extractedCoilPack = `CP-${extractedCoilPack}`;
    }
  } else {
    const directCp = normalizedText.match(/\b(cp-[a-z0-9-]+)\b/i);
    if (directCp) extractedCoilPack = directCp[1].toUpperCase();
  }

  // 4. Extract Heat Number (شماره ذوب / هیت)
  let extractedHeatNumber: string | undefined;
  const heatMatch = normalizedText.match(/(?:ذوب|شماره\s*ذوب|هیت|heat)\s*[:=]?\s*([a-z0-9\-_]+)/i);
  if (heatMatch && heatMatch[1]) {
    extractedHeatNumber = heatMatch[1].toUpperCase();
  }

  // 5. Match Part from Catalog
  let matchedPart: Part | undefined;
  for (const part of partsCatalog) {
    const codeMatch = normalizedText.includes(part.code.toLowerCase());
    const nameMatch = normalizedText.includes(part.name.toLowerCase());
    const gradeMatch = part.materialGrade && normalizedText.includes(part.materialGrade.toLowerCase());
    if (codeMatch || nameMatch || gradeMatch) {
      matchedPart = part;
      break;
    }
  }

  if (!matchedPart) {
    const commonGrades = ['dc01a', 'dc01', 'm6'];
    for (const g of commonGrades) {
      if (normalizedText.includes(g)) {
        matchedPart = partsCatalog.find(
          p => (p.materialGrade && p.materialGrade.toLowerCase().includes(g)) || p.code.toLowerCase().includes(g)
        );
        if (matchedPart) break;
      }
    }
  }

  // 6. Detect Warehouse & Ownership
  const isSapco = /ساپکو|sapco/i.test(rawText);
  const isCustomer = /مشتری|ایران خودرو|سایپا/i.test(rawText);
  const ownership = isCustomer ? 'CUSTOMER_SUPPLIED' : isSapco ? 'SAPCO_SUPPLIER_OWNED' : 'COMPANY_OWNED';

  // 7. Route to Actions based on exact user intent
  if (isCreateMo) {
    const partName = matchedPart ? matchedPart.name : 'مجموعه براکت ضدسرقت رایانه موتور';
    const qtyText = extractedQuantity ? `${extractedQuantity.toLocaleString('fa-IR')} عدد` : 'تیراژ مشخص‌شده';
    return {
      actionType: 'OPEN_CREATE_MO',
      targetTab: 'production',
      targetSubTab: 'MULTI_PART_SCHEDULER',
      message: `دستور تولید جدید (MO) برای «${partName}» با تیراژ ${qtyText} شناسایی شد. انتقال به فرم صدور دستور تولید...`,
    };
  }

  if (isTrackOrder) {
    return {
      actionType: 'OPEN_TRACK_ORDER',
      targetTab: 'production',
      message: 'هدایت به پیشخوان تولید جهت پیگیری زنجیره کامل دستور ساخت براکت ضدسرقت.',
    };
  }

  if (isHeatTrace) {
    return {
      actionType: 'OPEN_HEAT_TRACEABILITY',
      targetTab: 'sapco',
      message: `هدایت به ماژول شجره‌نامه شماره ذوب (${extractedHeatNumber || 'کلاف‌های ساپکو'}).`,
    };
  }

  if (isExplicitReceipt) {
    const partName = matchedPart ? matchedPart.name : 'رول ورق روغنی DC01A';
    const qtyText = extractedQuantity ? `${extractedQuantity.toLocaleString('fa-IR')} ${matchedPart?.unit || 'کیلوگرم'}` : 'مشخص‌نشده';
    return {
      actionType: 'OPEN_RECEIPT',
      targetTab: 'inventory',
      targetSubTab: 'MOVEMENTS',
      message: `فرم رسید کالا برای «${partName}» با مقدار ${qtyText} آماده شد. لطفاً اطلاعات را بازبینی و تایید فرمایید.`,
      prefillReceipt: {
        subType: isSapco ? 'SAPCO_MATERIAL' : isCustomer ? 'CUSTOMER_SUPPLIED' : 'SUPPLIER_PURCHASE',
        partId: matchedPart?.id,
        partCode: matchedPart?.code,
        partName: matchedPart?.name,
        quantity: extractedQuantity || 1000,
        unit: matchedPart?.unit || 'KG',
        coilPackNumber: extractedCoilPack || `CP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        physicalCoilCode: `COIL-${Math.floor(100 + Math.random() * 900)}`,
        heatNumber: extractedHeatNumber || `HT-${Math.floor(10000 + Math.random() * 90000)}`,
        warehouseId: 'WH-RAW',
        locationCode: 'LOC-RAW-A1',
        ownership: ownership as any,
        referenceNumber: `REC-${Date.now().toString().slice(-4)}`,
        notes: `ایجاد شده با دستیار هوشمند: «${rawText}»`,
      },
    };
  }

  if (isExplicitIssue) {
    const partName = matchedPart ? matchedPart.name : 'رول ورق روغنی DC01A';
    const qtyText = extractedQuantity ? `${extractedQuantity.toLocaleString('fa-IR')} ${matchedPart?.unit || 'کیلوگرم'}` : 'مشخص‌نشده';
    return {
      actionType: 'OPEN_ISSUE',
      targetTab: 'inventory',
      targetSubTab: 'MOVEMENTS',
      message: `فرم حواله خروج برای «${partName}» با مقدار ${qtyText} آماده شد. لطفاً انبار مقصد را بررسی و تایید فرمایید.`,
      prefillIssue: {
        partId: matchedPart?.id,
        partCode: matchedPart?.code,
        partName: matchedPart?.name,
        quantity: extractedQuantity || 500,
        unit: matchedPart?.unit || 'KG',
        warehouseId: 'WH-RAW',
        targetWarehouseId: 'WH-WIP-STAMP',
        issuePurpose: 'PRODUCTION_LINE',
        notes: `حواله با دستیار هوشمند: «${rawText}»`,
      },
    };
  }

  if (isReorderCheck) {
    return {
      actionType: 'CHECK_REORDER',
      targetTab: 'inventory',
      targetSubTab: 'REORDER_ALERTS',
      message: 'هدایت به بخش هشدارهای نقطه سفارش و کسری موجودی کالاها.',
    };
  }

  if (isStockQuery) {
    const partName = matchedPart ? matchedPart.name : 'مجموعه براکت ضدسرقت رایانه موتور';
    return {
      actionType: 'QUERY_STOCK',
      targetTab: 'inventory',
      targetSubTab: 'BALANCES',
      message: `استعلام موجودی برای کالا «${partName}».`,
      queryResults: {
        summary: `اطلاعات موجودی کالا در انبارها و خطوط تولید آماده گردید.`,
        items: matchedPart ? [{ code: matchedPart.code, name: matchedPart.name, stock: matchedPart.minStock || 0, unit: matchedPart.unit }] : [],
      },
    };
  }

  if (isNavigate) {
    if (/ماشین|دستگاه|پرس/i.test(rawText)) {
      return { actionType: 'NAVIGATE', targetTab: 'machines', message: 'انتقال به بخش ماشین‌آلات، پرس‌ها و ظرفیت سنجی.' };
    }
    if (/برنامه|تولید|برنامه ریزی/i.test(rawText)) {
      return { actionType: 'NAVIGATE', targetTab: 'planning', message: 'انتقال به بخش برنامه‌ریزی تولید و سفارشات.' };
    }
    if (/گزارش|کاردکس/i.test(rawText)) {
      return { actionType: 'NAVIGATE', targetTab: 'reports', message: 'انتقال به بخش گزارشات مدیریتی و کاردکس.' };
    }
    if (/پایه|کاتالوگ|اطلاعات پایه/i.test(rawText)) {
      return { actionType: 'NAVIGATE', targetTab: 'master_data', message: 'انتقال به هاب تعاریف و اطلاعات پایه.' };
    }
    if (/ساپکو/i.test(rawText)) {
      return { actionType: 'NAVIGATE', targetTab: 'sapco', message: 'انتقال به بخش قراردادها و حساب امانی ساپکو.' };
    }
  }

  return {
    actionType: 'UNKNOWN',
    message: `دستور دریافت شد: «${rawText}». می‌توانید بگویید: «رسید ۵ تن ورق DC01A با کویل پک CP-101» یا «صدور دستور تولید براکت ضدسرقت رایانه موتور» یا «مشاهده کسری و نقطه سفارش».`,
  };
}

/**
 * Factory ERP Command Dispatcher
 * Uses built-in deterministic NLP or server-configured Gemini API.
 */
export async function executeAiCommand(
  prompt: string,
  settings: AiSettings,
  partsCatalog: Part[],
  warehouses: WarehouseDefinition[]
): Promise<AiActionPayload> {
  const provider = settings?.provider || 'LOCAL_NLP';

  if (provider === 'LOCAL_NLP' || !process.env.GEMINI_API_KEY) {
    return processLocalNlpCommand(prompt, partsCatalog, warehouses);
  }

  try {
    const catalogSummary = partsCatalog.slice(0, 20).map(p => ({
      id: p.id,
      code: p.code,
      name: p.name,
      unit: p.unit,
      grade: p.materialGrade || '',
      category: p.category,
    }));

    const systemPrompt = `You are KPIMS ERP Assistant for an automotive stamping factory.
Understand Persian operator instructions and return valid JSON matching AiActionPayload for parts: ${JSON.stringify(catalogSummary)}`;

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${systemPrompt}\n\nUser command: ${prompt}`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text.trim()) as AiActionPayload;
      if (parsed && parsed.actionType) {
        return parsed;
      }
    }
  } catch {
    // Fallback to deterministic local NLP engine
  }

  return processLocalNlpCommand(prompt, partsCatalog, warehouses);
}
