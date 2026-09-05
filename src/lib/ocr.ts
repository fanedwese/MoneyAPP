// src/lib/ocr.ts
import Tesseract from 'tesseract.js';

export interface ScannedReceipt {
  date: string;
  total: number;
  store: string;
  suggestedCategoryName: string;
  confidence: number;
}

interface StoreMatch {
  patterns: string[];
  category: string;
}

const STORE_MATCHES: StoreMatch[] = [
  { patterns: ["монетка", "пятерочка", "пятёрочка", "магнит", "перекресток", "ашан", "лента", "вкусвилл"], category: "Еда" },
  { patterns: ["газпромнефть", "лукойл", "роснефть", "shell", "тнс", "башнефть"], category: "Бензин" },
  { patterns: ["ростелеком", "яндекс плюс", "яндекс.плюс", "netflix", "spotify", "ivi", "кинопоиск"], category: "Подписки" },
  { patterns: ["сбер", "втб", "альфа", "тинькофф", "т-банк", "ozon card"], category: "Кредитные карты" },
  { patterns: ["жкх", "управляющая", "тсж", "водоканал", "энергосбыт"], category: "Коммунальные услуги" },
];

export function guessCategory(store: string): string {
  const lower = store.toLowerCase();
  for (const m of STORE_MATCHES) {
    if (m.patterns.some((p) => lower.includes(p))) return m.category;
  }
  return "Еда";
}

// --- УМНЫЙ ПАРСИНГ СУММЫ ---

function findTotalSmart(text: string): number {
  // 1. Чистим текст от мусора
  let cleanText = text.replace(/\[[^\]]+\]\s*\d+/g, ' ');
  cleanText = cleanText.replace(/\*{4,}\s*\d{4,}/g, ' ');
  cleanText = cleanText.replace(/(КАРТА|CARD)[^\d]*(\d{4,})/gi, ' ');
  cleanText = cleanText.replace(/\b\d{4}\b/g, ' ');
  cleanText = cleanText.replace(/\d{4}\s*\d{4}\s*\d{4}\s*\d{4}/g, ' ');

  console.log('Текст после очистки:', cleanText);

  // 2. Ищем сумму ТОЛЬКО после ключевых слов
  const patterns = [
    /ИТОГ[О]?\s*[:\-]?\s*([\d.,]+)/i,
    /БЕЗНАЛИЧНЫЙ\s*([\d.,]+)/i,
    /БЕЗНАЛИЧНЫМИ\s*([\d.,]+)/i,
    /ОПЛАТА\s*[:\-]?\s*([\d.,]+)/i,
    /К ОПЛАТЕ\s*[:\-]?\s*([\d.,]+)/i,
  ];

  for (const pattern of patterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const num = parseFloat(match[1].replace(',', '.'));
      if (num > 0 && num < 1000000) {
        console.log('Найдена сумма по паттерну:', num);
        return num;
      }
    }
  }

  // 3. Если ничего не нашли — ищем "СУММА", но только если рядом нет "НАС"
  const sumMatch = cleanText.match(/СУММА\s*[\(РУБ\)]?\s*[:\-]?\s*([\d.,]+)/i);
  if (sumMatch) {
    // Проверяем, что перед "СУММА" нет "НАС"
    const before = cleanText.slice(Math.max(0, sumMatch.index! - 20), sumMatch.index!);
    if (!before.match(/НАС/i)) {
      const num = parseFloat(sumMatch[1].replace(',', '.'));
      if (num > 0 && num < 1000000) {
        console.log('Найдена сумма по "СУММА":', num);
        return num;
      }
    }
  }

  // 4. Если ничего не нашли — возвращаем 0
  console.log('Сумма не найдена');
  return 0;
}

function findDate(text: string): string {
  const today = new Date().toISOString().split('T')[0];
  
  const patterns = [
    /(\d{2})[.\/](\d{2})[.\/](\d{4})/,
    /(\d{2})[.\/](\d{2})[.\/](\d{2})/,
    /(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let day, month, year;
      if (pattern === patterns[0] || pattern === patterns[1]) {
        day = match[1];
        month = match[2];
        year = match[3];
        if (year.length === 2) year = `20${year}`;
      } else if (pattern === patterns[2]) {
        day = match[2];
        month = match[1];
        year = new Date().getFullYear().toString();
      }
      
      if (day && month && year) {
        const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return dateStr;
      }
    }
  }
  return today;
}

// --- ПАРСИНГ ТЕКСТА ЧЕКА ---

function parseReceiptText(text: string): ScannedReceipt {
  const lines = text.split('\n').filter(line => line.trim());
  
  let store = lines[0]?.trim() || 'Чек';
  if (store.length < 2 || store.match(/^[\d\s]+$/)) {
    store = lines[1]?.trim() || 'Чек';
  }

  const total = findTotalSmart(text);
  const date = findDate(text);
  const category = guessCategory(store);

  return {
    date,
    total,
    store,
    suggestedCategoryName: category,
    confidence: total > 0 ? 0.9 : 0.5,
  };
}

// --- ОСНОВНАЯ ФУНКЦИЯ СКАНИРОВАНИЯ ---

export async function scanReceipt(imageBase64: string): Promise<ScannedReceipt> {
  try {
    const Tesseract = (await import('tesseract.js')).default;
    
    const result = await Tesseract.recognize(imageBase64, 'rus+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    const text = result.data.text;
    console.log('RAW TEXT:', text);
    
    if (!text || text.length < 10) {
      throw new Error('Текст не распознан');
    }

    return parseReceiptText(text);
  } catch (error) {
    console.warn('OCR не сработал, просим ввести вручную');
    return {
      date: new Date().toISOString().split('T')[0],
      total: 0,
      store: '',
      suggestedCategoryName: 'Еда',
      confidence: 0,
    };
  }
}