import { PackingRule, ActivityType } from '../types';

export const DEFAULT_RULES: PackingRule[] = [
  // Clothes
  { itemName: 'T-Shirt', category: 'clothes', perDay: 1, base: 1 },
  { itemName: 'Shirt', category: 'clothes', perDay: 0.5, base: 0 },
  { itemName: 'Shorts', category: 'clothes', perDay: 0.5, base: 1 },
  { itemName: 'Underwear', category: 'clothes', perDay: 1, base: 1 },
  { itemName: 'Vest / Undershirt', category: 'clothes', perDay: 1, base: 0 },
  { itemName: 'Socks', category: 'clothes', perDay: 1, base: 1 },
  { itemName: 'Jeans / Pants', category: 'clothes', perDay: 0.3, base: 1 },
  { itemName: 'Hoodie / Jacket', category: 'clothes', perDay: 0, base: 1 },
  { itemName: 'Sleepwear', category: 'clothes', perDay: 0, base: 1 },

  // Activity specific
  { itemName: 'Swim Trunks', category: 'activity', perDay: 0, base: 0, activityBonus: { swimming: 1 } },
  { itemName: 'Towel (swim)', category: 'activity', perDay: 0, base: 0, activityBonus: { swimming: 1 } },
  { itemName: 'Badminton Racket', category: 'activity', perDay: 0, base: 0, activityBonus: { badminton: 1 } },
  { itemName: 'Shuttlecocks', category: 'activity', perDay: 0, base: 0, activityBonus: { badminton: 3 } },
  { itemName: 'Tennis Racket', category: 'activity', perDay: 0, base: 0, activityBonus: { tennis: 1 } },
  { itemName: 'Tennis Balls', category: 'activity', perDay: 0, base: 0, activityBonus: { tennis: 3 } },
  { itemName: 'Squash Racket', category: 'activity', perDay: 0, base: 0, activityBonus: { squash: 1 } },
  { itemName: 'Running Shoes', category: 'activity', perDay: 0, base: 0, activityBonus: { running: 1, gym: 1 } },
  { itemName: 'Gym Clothes', category: 'activity', perDay: 0, base: 0, activityBonus: { gym: 1, running: 1 } },
  { itemName: 'Sports Bottle', category: 'activity', perDay: 0, base: 0, activityBonus: { swimming: 1, badminton: 1, tennis: 1, squash: 1, running: 1, gym: 1 } },

  // Misc essentials
  { itemName: 'Toothbrush', category: 'misc', perDay: 0, base: 1 },
  { itemName: 'Toothpaste', category: 'misc', perDay: 0, base: 1 },
  { itemName: 'Charger / Cable', category: 'misc', perDay: 0, base: 1 },
  { itemName: 'Power Bank', category: 'misc', perDay: 0, base: 0 },
  { itemName: 'Earphones', category: 'misc', perDay: 0, base: 0 },
];

export function calculateSuggestions(
  days: number,
  activities: ActivityType[],
  inventory: { name: string; quantity: number }[]
): import('../types').PackingSuggestion[] {
  const suggestions: import('../types').PackingSuggestion[] = [];

  for (const rule of DEFAULT_RULES) {
    let needed = Math.ceil(rule.base + rule.perDay * days);

    // Add activity bonuses
    if (rule.activityBonus) {
      for (const act of activities) {
        if (act !== 'none' && rule.activityBonus[act]) {
          needed += rule.activityBonus[act]!;
        }
      }
    }

    if (needed <= 0) continue;

    const found = inventory.find(i => i.name.toLowerCase() === rule.itemName.toLowerCase());
    const alreadyThere = found ? found.quantity : 0;
    const toBring = Math.max(0, needed - alreadyThere);

    let reason = '';
    if (toBring === 0) {
      reason = `Already have ${alreadyThere} at studio`;
    } else if (alreadyThere > 0) {
      reason = `Need ${needed}, have ${alreadyThere} → bring ${toBring}`;
    } else {
      reason = `Need ${needed}, nothing at studio → bring ${toBring}`;
    }

    suggestions.push({
      itemName: rule.itemName,
      category: rule.category,
      needed,
      alreadyThere,
      toBring,
      reason,
    });
  }

  // Sort: toBring > 0 first, then by category
  return suggestions.sort((a, b) => {
    if (a.toBring > 0 && b.toBring === 0) return -1;
    if (a.toBring === 0 && b.toBring > 0) return 1;
    return a.category.localeCompare(b.category);
  });
}
