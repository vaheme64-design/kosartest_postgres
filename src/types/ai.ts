export type AiProvider = 'LOCAL_NLP' | 'OLLAMA' | 'GROQ' | 'OPENROUTER' | 'GEMINI';

export interface AiSettings {
  provider: AiProvider;
  ollamaEndpoint: string; // default: 'http://localhost:11434'
  ollamaModel: string; // default: 'qwen2.5:7b' or 'llama3.2'
  groqApiKey: string;
  groqModel: string; // default: 'llama-3.3-70b-versatile'
  openRouterApiKey: string;
  openRouterModel: string; // default: 'meta-llama/llama-3.2-3b-instruct:free'
  geminiApiKey: string;
  geminiModel: string; // default: 'gemini-2.5-flash'
}

export type AiActionType =
  | 'OPEN_RECEIPT'
  | 'OPEN_ISSUE'
  | 'OPEN_TRANSFER'
  | 'OPEN_RETURN'
  | 'OPEN_CREATE_MO'
  | 'OPEN_TRACK_ORDER'
  | 'OPEN_HEAT_TRACEABILITY'
  | 'NAVIGATE'
  | 'CHECK_REORDER'
  | 'QUERY_STOCK'
  | 'UNKNOWN';

export interface AiActionPayload {
  actionType: AiActionType;
  message: string;
  targetTab?: string;
  targetSubTab?: string;
  prefillReceipt?: {
    subType?: 'SAPCO_MATERIAL' | 'CUSTOMER_SUPPLIED' | 'SUPPLIER_PURCHASE' | 'OPENING_BALANCE' | 'FINISHED_PRODUCT';
    partId?: string;
    partCode?: string;
    partName?: string;
    quantity?: number;
    unit?: string;
    coilPackNumber?: string;
    physicalCoilCode?: string;
    heatNumber?: string;
    warehouseId?: string;
    locationCode?: string;
    ownership?: 'SAPCO_SUPPLIER_OWNED' | 'COMPANY_OWNED' | 'CUSTOMER_SUPPLIED';
    referenceNumber?: string;
    notes?: string;
  };
  prefillIssue?: {
    partId?: string;
    partCode?: string;
    partName?: string;
    quantity?: number;
    unit?: string;
    warehouseId?: string;
    targetWarehouseId?: string;
    issuePurpose?: string;
    lotNumber?: string;
    notes?: string;
  };
  queryResults?: {
    summary: string;
    items?: Array<{ code: string; name: string; stock: number; unit: string; status?: string }>;
  };
}
