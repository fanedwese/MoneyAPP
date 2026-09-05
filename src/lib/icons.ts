import {
  Landmark, CreditCard, Home, Building2, Repeat, Utensils, Car, Fuel,
  ShoppingCart, Gamepad2, Plane, HeartPulse, GraduationCap, Dumbbell,
  Gift, Briefcase, Wallet, PiggyBank, Smartphone, Wrench, BookOpen,
  Coffee, Clapperboard, Target, Calendar, Banknote, type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  "landmark": Landmark,
  "credit-card": CreditCard,
  "home": Home,
  "building": Building2,
  "repeat": Repeat,
  "utensils": Utensils,
  "car": Car,
  "fuel": Fuel,
  "shopping": ShoppingCart,
  "gamepad": Gamepad2,
  "plane": Plane,
  "health": HeartPulse,
  "education": GraduationCap,
  "fitness": Dumbbell,
  "gift": Gift,
  "briefcase": Briefcase,
  "wallet": Wallet,
  "piggy-bank": PiggyBank,
  "smartphone": Smartphone,
  "wrench": Wrench,
  "book": BookOpen,
  "coffee": Coffee,
  "clapperboard": Clapperboard,
  "target": Target,
  "calendar": Calendar,
  "banknote": Banknote,
};

export const ICON_KEYS = Object.keys(ICONS);

export const COLOR_OPTIONS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#a855f7", "#ec4899",
  "#f43f5e", "#84cc16", "#10b981", "#0ea5e9", "#6366f1",
];

export function getIcon(key: string): LucideIcon {
  return ICONS[key] ?? Wallet;
}
