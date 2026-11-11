import { TabKey } from '../components/Sidebar';
import { InventorySubTab } from '../components/inventory/InventoryModuleView';

export type SearchItemType =
  | 'part'
  | 'material'
  | 'coil'
  | 'contract'
  | 'customer_order'
  | 'mo'
  | 'document'
  | 'machine'
  | 'die'
  | 'routing'
  | 'customer'
  | 'warehouse'
  | 'module';

export interface GlobalSearchHit {
  id: string;
  type: SearchItemType;
  title: string;
  subtitle: string;
  code: string;
  badge?: string;
  badgeColor?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate';
  meta?: Record<string, string | number | null>;
  targetTab: TabKey;
  targetSubTab?: InventorySubTab;
  filterParam?: string;
}

export interface GlobalSearchResultGroup {
  type: SearchItemType;
  labelFa: string;
  count: number;
  items: GlobalSearchHit[];
}

export interface GlobalSearchResponse {
  query: string;
  totalHits: number;
  groups: GlobalSearchResultGroup[];
}
