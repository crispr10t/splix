import {
  Car,
  Hotel,
  Package2,
  ShoppingCart,
  Ticket,
  Utensils,
  Zap
} from "lucide-react";

export const CATEGORIES = [
  {
    id: "food",
    label: "Food & Dining",
    shortLabel: "Food",
    icon: Utensils,
    color: "emerald",
    bgClass: "bg-leaf-50 text-leaf-700 border-leaf-200",
    badgeClass: "bg-leaf-100 text-leaf-800"
  },
  {
    id: "transport",
    label: "Transport & Cabs",
    shortLabel: "Transport",
    icon: Car,
    color: "blue",
    bgClass: "bg-blue-50 text-blue-700 border-blue-200",
    badgeClass: "bg-blue-100 text-blue-800"
  },
  {
    id: "stay",
    label: "Stay & Hotel",
    shortLabel: "Stay",
    icon: Hotel,
    color: "indigo",
    bgClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    badgeClass: "bg-indigo-100 text-indigo-800"
  },
  {
    id: "groceries",
    label: "Groceries & Supplies",
    shortLabel: "Groceries",
    icon: ShoppingCart,
    color: "amber",
    bgClass: "bg-amber-50 text-amber-800 border-amber-200",
    badgeClass: "bg-amber-100 text-amber-800"
  },
  {
    id: "entertainment",
    label: "Entertainment & Fun",
    shortLabel: "Entertainment",
    icon: Ticket,
    color: "purple",
    bgClass: "bg-purple-50 text-purple-700 border-purple-200",
    badgeClass: "bg-purple-100 text-purple-800"
  },
  {
    id: "utilities",
    label: "Utilities & Bills",
    shortLabel: "Utilities",
    icon: Zap,
    color: "orange",
    bgClass: "bg-orange-50 text-orange-800 border-orange-200",
    badgeClass: "bg-orange-100 text-orange-800"
  },
  {
    id: "general",
    label: "General / Other",
    shortLabel: "General",
    icon: Package2,
    color: "zinc",
    bgClass: "bg-ink-50 text-ink-700 border-ink-200",
    badgeClass: "bg-ink-100 text-ink-800"
  }
];

export const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id) {
  return CATEGORY_MAP.get(id) || CATEGORY_MAP.get("general");
}
