export type Category = 'clothes' | 'kitchen' | 'misc' | 'activity';

export interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  quantity: number;
  minQuantity?: number; // for low-stock alerts
  notes?: string;
  lastUpdated: number;
  photoUrl?: string;
}

export type ActivityType = 'none' | 'swimming' | 'badminton' | 'tennis' | 'squash' | 'running' | 'gym';

export interface PackingRule {
  itemName: string;
  category: Category;
  perDay: number;       // how many needed per day
  base: number;         // always bring at least this many
  activityBonus?: Partial<Record<ActivityType, number>>; // extra if activity selected
}

export interface PackingSuggestion {
  itemName: string;
  category: Category;
  needed: number;
  alreadyThere: number;
  toBring: number;
  reason: string;
}

export interface AIProposal {
  name: string;
  quantity: number;
  category: Category;
  confidence: number;
}
