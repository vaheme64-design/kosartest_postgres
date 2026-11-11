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
 * Works 100% offline without any internet connection, API keys, or external servers.
 */
export function processLocalNlpCommand(
  promptText: string,
  partsCatalog: Part[],
  warehouses: WarehouseDefinition[]
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
  const qtyMatch = normalizedText.match(/(?:وزن\s*[:=]?\s*|تعداد\s*[:=]?\s*|تیراژ\s*[:=]?\s*)?([0-9]+(?:[\.,][0-9]+)?)\s*(?:کیلوگرم|کیلو|تن|عدد|kg|pcs)?/i);
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
    const directCp = normalizedText.match(/\b(cp-[a-z0-9\-]+)\b/i);
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
    const commonGrades = ['st12', 'dc04', 'st14', 'st37', 'dx51d', 'st52'];
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

  // A. Create Work Order (MO) Intent
  if (isCreateMo) {
    const partName = matchedPart ? matchedPart.name : 'قطعه انتخابی';
    const qtyText = extractedQuantity ? `${extractedQuantity.toLocaleString('fa-IR')} عدد` : 'تیراژ مشخص‌شده';
    return {
      actionType: 'OPEN_CREATE_MO',
      targetTab: 'production',
      targetSubTab: 'MULTI_PART_SCHEDULER',
      message: `دستور تولید جدید (MO) برای «${partName}» با تیراژ ${qtyText} شناسایی شد. انتقال به فرم صدور دستور تولید...`,
    };
  }

  // B. Track Order Intent
  if (isTrackOrder) {
    return {
      actionType: 'OPEN_TRACK_ORDER',
      targetTab: 'production',
      message: 'هدایت به پیشخوان تولید جهت پیگیری زنجیره کامل دستور ساخت.',
    };
  }

  // C. Heat Traceability Intent
  if (isHeatTrace) {
    return {
      actionType: 'OPEN_HEAT_TRACEABILITY',
      targetTab: 'sapco',
      message: `هدایت به ماژول شجره‌نامه شماره ذوب (${extractedHeatNumber || 'کلاف‌های ساپکو'}).`,
    };
  }

  // D. Explicit Goods Receipt
  if (isExplicitReceipt) {
    const partName = matchedPart ? matchedPart.name : 'ورق فولادی';
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
        notes: `ایجاد شده خودکار با دستور دستیار هوش مصنوعی: «${rawText}»`,
      },
    };
  }

  // E. Explicit Goods Issue
  if (isExplicitIssue) {
    const partName = matchedPart ? matchedPart.name : 'کالای انتخابی';
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
        notes: `حواله با دستیار هوش مصنوعی: «${rawText}»`,
      },
    };
  }

  // F. Reorder / Safety Stock Check
  if (isReorderCheck) {
    return {
      actionType: 'CHECK_REORDER',
      targetTab: 'inventory',
      targetSubTab: 'REORDER_ALERTS',
      message: 'هدایت به بخش هشدارهای نقطه سفارش و کسری موجودی کالاها.',
    };
  }

  // G. Stock Inquiry
  if (isStockQuery) {
    const partName = matchedPart ? matchedPart.name : 'کالای انتخابی';
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

  // Navigation
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

  // Default fallback to receipt or general guidance
  return {
    actionType: 'UNKNOWN',
    message: `دستور دریافت شد: «${rawText}». می‌توانید بگویید: «رسید ۵ تن ورق ST12 با کویل پک CP-101» یا «حواله خروج ۴۰۰ کیلوگرم DC04» یا «مشاهده کسری و نقطه سفارش».`,
  };
}

/**
 * Universal AI Command Dispatcher
 * Dispatches to Ollama (local), Groq, OpenRouter, Gemini, or fallback local NLP
 */
export async function executeAiCommand(
  prompt: string,
  settings: AiSettings,
  partsCatalog: Part[],
  warehouses: WarehouseDefinition[]
): Promise<AiActionPayload> {
  const provider = settings.provider || 'LOCAL_NLP';

  // 1. If Local NLP Engine is chosen, execute instantly
  if (provider === 'LOCAL_NLP') {
    return processLocalNlpCommand(prompt, partsCatalog, warehouses);
  }

  // Prepare system context with current parts catalog
  const catalogSummary = partsCatalog.slice(0, 40).map(p => ({
    id: p.id,
    code: p.code,
    name: p.name,
    unit: p.unit,
    grade: p.materialGrade || '',
    category: p.category,
  }));

  const systemPrompt = `You are KPIMS AI, an expert industrial ERP assistant for Kosar Automotive Metal Parts Stamping Factory.
Your job is to understand factory operator Persian natural language instructions and output a single JSON action payload to pre-fill ERP forms or navigate.
User may say:
- "یک ورق روغنی ST12 با وزن ۴۵۰۰ کیلوگرم و کویل پک CP-882 رسید شد"
- "حواله خروج ۶۰۰ کیلو ورق DC04 برای سالن پرس صادر کن"
- "کسری موجودی و نقطه سفارش را نشان بده"
- "برو به ماشین‌آلات"

Available Parts Catalog:
${JSON.stringify(catalogSummary)}

Output MUST BE STRICT VALID JSON (without markdown fences if possible, or inside \`\`\`json \`\`\`) with schema:
{
  "actionType": "OPEN_RECEIPT" | "OPEN_ISSUE" | "OPEN_TRANSFER" | "NAVIGATE" | "CHECK_REORDER" | "QUERY_STOCK" | "UNKNOWN",
  "message": "Persian message explaining what was prepared and asking user to review and confirm",
  "targetTab": "inventory" | "production" | "planning" | "master_data" | "machines" | "reports" | "sapco" | "settings",
  "targetSubTab": "DASHBOARD" | "MOVEMENTS" | "BALANCES" | "REORDER_ALERTS" | "CONTRACTS" | "PHYSICAL_COILS",
  "prefillReceipt": {
    "subType": "SAPCO_MATERIAL" | "CUSTOMER_SUPPLIED" | "SUPPLIER_PURCHASE" | "FINISHED_PRODUCT",
    "partId": "part id from catalog",
    "partCode": "part code",
    "partName": "part name",
    "quantity": number,
    "unit": "KG" | "PCS",
    "coilPackNumber": "string",
    "physicalCoilCode": "string",
    "heatNumber": "string",
    "warehouseId": "WH-RAW",
    "locationCode": "LOC-RAW-A1",
    "ownership": "SAPCO_SUPPLIER_OWNED" | "COMPANY_OWNED" | "CUSTOMER_SUPPLIED",
    "referenceNumber": "string",
    "notes": "string"
  },
  "prefillIssue": {
    "partId": "part id",
    "partCode": "part code",
    "partName": "part name",
    "quantity": number,
    "unit": "KG" | "PCS",
    "warehouseId": "WH-RAW",
    "targetWarehouseId": "WH-WIP-STAMP",
    "issuePurpose": "PRODUCTION_LINE",
    "notes": "string"
  }
}`;

  try {
    let rawJsonResponse = '';

    // 2. Ollama (100% Free & Local in Iran - Default: http://localhost:11434)
    if (provider === 'OLLAMA') {
      const endpoint = settings.ollamaEndpoint || 'http://localhost:11434';
      const model = settings.ollamaModel || 'qwen2.5:7b';
      const res = await fetch(`${endpoint.replace(/\/+$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          stream: false,
          format: 'json',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (!res.ok) {
        throw new Error(`Ollama error HTTP ${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      rawJsonResponse = data?.message?.content || '';
    }

    // 3. Groq Cloud (Free Tier - api.groq.com)
    else if (provider === 'GROQ') {
      const apiKey = settings.groqApiKey;
      if (!apiKey) throw new Error('کلید API سرویس Groq وارد نشده است.');

      const groqCandidates = Array.from(
        new Set([
          settings.groqModel || 'llama-3.1-8b-instant',
          'llama-3.3-70b-versatile',
          'llama-3.1-8b-instant',
          'llama3-70b-8192',
          'llama3-8b-8192',
          'mixtral-8x7b-32768',
        ])
      );

      let lastErrText = '';
      for (const modelCandidate of groqCandidates) {
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: modelCandidate,
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
              ],
            }),
          });

          if (res.ok) {
            const data = await res.json();
            rawJsonResponse = data?.choices?.[0]?.message?.content || '';
            if (rawJsonResponse) break;
          } else {
            lastErrText = await res.text();
          }
        } catch (err: any) {
          lastErrText = err.message;
        }
      }

      if (!rawJsonResponse) {
        throw new Error(`Groq API error: ${lastErrText}`);
      }
    }

    // 4. OpenRouter (Free Tier - openrouter.ai)
    else if (provider === 'OPENROUTER') {
      const apiKey = settings.openRouterApiKey;
      if (!apiKey) throw new Error('کلید API سرویس OpenRouter وارد نشده است.');
      const openRouterCandidates = Array.from(
        new Set([
          settings.openRouterModel || 'gpt-4o-mini',
          'gpt-4o-mini',
          'google/gemini-flash-1.5',
          'google/gemini-2.5-flash:free',
          'meta-llama/llama-3.3-70b-instruct:free',
        ])
      );
      let lastOpenRouterErr = '';
      for (const modelCandidate of openRouterCandidates) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
              'HTTP-Referer': 'https://kpims.local',
              'X-Title': 'KPIMS Industrial ERP',
            },
            body: JSON.stringify({
              model: modelCandidate,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
              ],
            }),
          });
          if (res.ok) {
            const data = await res.json();
            rawJsonResponse = data?.choices?.[0]?.message?.content || '';
            if (rawJsonResponse) break;
          } else {
            lastOpenRouterErr = await res.text();
          }
        } catch (err: any) {
          lastOpenRouterErr = err.message;
        }
      }
      if (!rawJsonResponse) {
        throw new Error(`OpenRouter API error: ${lastOpenRouterErr}`);
      }
    }

    // 5. Google Gemini API (@google/genai)
    else if (provider === 'GEMINI') {
      const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('کلید API سرویس Gemini تنظیم نشده است.');
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const geminiCandidates = Array.from(
        new Set([
          settings.geminiModel || 'gemini-1.5-flash',
          'gemini-1.5-flash',
          'gemini-2.5-flash',
          'gemini-1.5-pro',
        ])
      );
      let lastGeminiErr = '';
      for (const gemModel of geminiCandidates) {
        try {
          const response = await ai.models.generateContent({
            model: gemModel,
            contents: `${systemPrompt}\n\nUser command: ${prompt}`,
            config: {
              responseMimeType: 'application/json',
            },
          });
          if (response.text) {
            rawJsonResponse = response.text;
            break;
          }
        } catch (err: any) {
          lastGeminiErr = err.message;
        }
      }
      if (!rawJsonResponse) {
        throw new Error(`Gemini API error: ${lastGeminiErr}`);
      }
    }

    // Clean JSON response
    const cleanJson = rawJsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return parsed;
  } catch (err: any) {
    console.warn(`[AI Dispatcher] Fallback to Local NLP due to error: ${err.message}`);
    // Graceful fallback to offline local rule engine
    const fallback = processLocalNlpCommand(prompt, partsCatalog, warehouses);
    fallback.message = `${fallback.message} (پردازش‌شده با موتور پشتیبان داخلی)`;
    return fallback;
  }
}
