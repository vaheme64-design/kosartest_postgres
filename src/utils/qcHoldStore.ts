import { Part } from '../types/inventory';

export const QC_HOLD_STORAGE_KEY = 'kpims_qc_hold_map_v1';
export const VIP_PARTS_STORAGE_KEY = 'kpims_vip_parts_map_v1';

export interface QcHoldRecord {
  key: string; // e.g. balance.id, coil.id, coil.coilId, or partId
  partId?: string;
  partCode?: string;
  partName?: string;
  lotNumber?: string;
  warehouseName?: string;
  isHeld: boolean;
  heldQty: number;
  heldWeightKg: number;
  unit: 'PCS' | 'KG';
  reasonFa: string;
  updatedAt: string;
  actor: string;
}

export function loadQcHoldMap(): Record<string, QcHoldRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(QC_HOLD_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveQcHoldMap(map: Record<string, QcHoldRecord>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(QC_HOLD_STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('kpims-qc-hold-changed', { detail: map }));
  } catch {
    // ignore storage errors
  }
}

export function loadVipPartsMap(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(VIP_PARTS_STORAGE_KEY);
    if (!raw) {
      // Seed default VIP key parts so user immediately sees VIP prioritization in action
      const initial: Record<string, boolean> = {
        'PRT-ECU-BRK-01': true,
        'SAPCO-ASY-ECU-BRK-01': true,
        'PRT-PEDAL-01': true,
        'SAPCO-998120': true,
        'RM-COIL-DC04-08': true,
      };
      window.localStorage.setItem(VIP_PARTS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveVipPartsMap(map: Record<string, boolean>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VIP_PARTS_STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('kpims-vip-parts-changed', { detail: map }));
  } catch {
    // ignore
  }
}

export function isPartVip(
  partOrId?: Partial<Part> | string | null,
  vipMapOrCode?: Record<string, boolean> | string,
  partsList?: Part[],
  explicitVipMap?: Record<string, boolean>
): boolean {
  if (!partOrId) return false;

  if (typeof partOrId === 'string') {
    const partId = partOrId;
    const partCode = typeof vipMapOrCode === 'string' ? vipMapOrCode : undefined;
    const map =
      explicitVipMap ||
      (vipMapOrCode && typeof vipMapOrCode === 'object' ? vipMapOrCode : loadVipPartsMap());
    if (partId && map[partId] !== undefined) return Boolean(map[partId]);
    if (partCode && map[partCode] !== undefined) return Boolean(map[partCode]);
    if (partsList) {
      const matched = partsList.find(p => p.id === partId || (partCode && p.code === partCode));
      if (matched) {
        if (matched.isVIP !== undefined) return Boolean(matched.isVIP);
        if (matched.isPinned !== undefined) return Boolean(matched.isPinned);
      }
    }
    return false;
  }

  const part = partOrId;
  const map =
    vipMapOrCode && typeof vipMapOrCode === 'object' ? vipMapOrCode : loadVipPartsMap();
  if (part.id && map[part.id] !== undefined) return Boolean(map[part.id]);
  if (part.code && map[part.code] !== undefined) return Boolean(map[part.code]);
  if (part.isVIP !== undefined) return Boolean(part.isVIP);
  if (part.isPinned !== undefined) return Boolean(part.isPinned);
  return false;
}
