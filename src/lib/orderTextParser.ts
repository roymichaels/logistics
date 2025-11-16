import { DataStore } from '../data/types';
import { logger } from './logger';

export interface ParsedOrderItem {
  quantity: number;
  unit: string;
  name: string;
  notes?: string;
}

export interface ParsedOrder {
  address: string;
  contact: string;
  phone?: string;
  items: ParsedOrderItem[];
  totalAmount?: number;
  currency: 'ILS' | 'USD' | 'EUR';
  orderTime?: string;
  businessName?: string;
  orderNumber?: string;
  notes?: string;
}

export interface ParsingResult {
  success: boolean;
  confidence: number;
  data: ParsedOrder | null;
  errors: string[];
  warnings: string[];
  originalText: string;
}

export class HebrewOrderParser {
  private static readonly CURRENCY_MAP = {
    'ש"ח': 'ILS',
    'שח': 'ILS',
    'שקל': 'ILS',
    'שקלים': 'ILS',
    'דולר': 'USD',
    'דולרים': 'USD',
    '$': 'USD',
    'יורו': 'EUR',
    '€': 'EUR'
  } as const;

  private static readonly UNIT_NORMALIZATIONS = {
    'ק"ג': 'ק"ג',
    'קג': 'ק"ג',
    'קילו': 'ק"ג',
    'גרם': 'גרם',
    'ג\'': 'גרם',
    'יח': 'יח\'',
    'יחידות': 'יח\'',
    'יחידה': 'יח\'',
    'חבילות': 'חבילות',
    'חבילה': 'חבילות',
    'זוגות': 'זוגות',
    'זוג': 'זוגות',
    'מטר': 'מטר',
    'מ\'': 'מטר',
    'ליטר': 'ליטר',
    'ל\'': 'ליטר'
  };

  private dataStore: DataStore;
  private businessProducts: Map<string, any> = new Map();

  constructor(dataStore: DataStore) {
    this.dataStore = dataStore;
  }

  async loadBusinessProducts(businessId: string): Promise<void> {
    try {
      // In a real implementation, this would load from the database
      // For now, we'll use a mock implementation
      const mockProducts = [
        { name: 'עגבניות', aliases: ['עגבניה', 'עגבנייה', 'עגבניות מיני'] },
        { name: 'מלפפונים', aliases: ['מלפפון', 'מלפפוני מיני'] },
        { name: 'פלפלים', aliases: ['פלפל', 'פלפל ירוק', 'פלפלים ירוקים'] },
        { name: 'חלב', aliases: ['חלב טרי', 'חלב 3%', 'חלב דל שומן'] },
        { name: 'לחם', aliases: ['לחם לבן', 'לחם מלא', 'לחם טוסט'] },
        { name: 'ביצים', aliases: ['ביצה', 'ביצים L', 'ביצים M'] }
      ];

      mockProducts.forEach(product => {
        this.businessProducts.set(product.name, product);
        product.aliases.forEach(alias => {
          this.businessProducts.set(alias, product);
        });
      });
    } catch (error) {
      logger.warn('Failed to load business products', error);
    }
  }

  async parseOrder(text: string, businessId?: string): Promise<ParsingResult> {
    if (businessId) {
      await this.loadBusinessProducts(businessId);
    }

    const result: ParsingResult = {
      success: false,
      confidence: 0,
      data: null,
      errors: [],
      warnings: [],
      originalText: text
    };

    try {
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

      let parsedOrder: Partial<ParsedOrder> = {
        currency: 'ILS',
        items: []
      };

      let confidence = 0;
      let totalFields = 0;
      let parsedFields = 0;

      // Parse each line
      for (const line of lines) {
        totalFields++;

        // Parse address
        if (this.isAddressLine(line)) {
          const address = this.parseAddress(line);
          if (address) {
            parsedOrder.address = address;
            parsedFields++;
          }
        }

        // Parse contact person
        else if (this.isContactLine(line)) {
          const contactInfo = this.parseContact(line);
          if (contactInfo) {
            parsedOrder.contact = contactInfo.name;
            if (contactInfo.phone) {
              parsedOrder.phone = contactInfo.phone;
            }
            parsedFields++;
          }
        }

        // Parse order items
        else if (this.isOrderItemLine(line)) {
          const item = this.parseOrderItem(line);
          if (item) {
            parsedOrder.items!.push(item);
            parsedFields++;
          }
        }

        // Parse payment amount
        else if (this.isPaymentLine(line)) {
          const paymentInfo = this.parsePayment(line);
          if (paymentInfo) {
            parsedOrder.totalAmount = paymentInfo.amount;
            parsedOrder.currency = paymentInfo.currency;
            parsedFields++;
          }
        }

        // Parse order time
        else if (this.isOrderTimeLine(line)) {
          const time = this.parseOrderTime(line);
          if (time) {
            parsedOrder.orderTime = time;
            parsedFields++;
          }
        }

        // Parse business name
        else if (this.isBusinessNameLine(line)) {
          const businessName = this.parseBusinessName(line);
          if (businessName) {
            parsedOrder.businessName = businessName;
            parsedFields++;
          }
        }

        // Parse order number
        else if (this.isOrderNumberLine(line)) {
          const orderNumber = this.parseOrderNumber(line);
          if (orderNumber) {
            parsedOrder.orderNumber = orderNumber;
            parsedFields++;
          }
        }
      }

      // Validate required fields
      if (!parsedOrder.address) {
        result.errors.push('חסרה כתובת משלוח');
      }

      if (!parsedOrder.contact) {
        result.errors.push('חסר שם איש קשר');
      }

      if (!parsedOrder.items || parsedOrder.items.length === 0) {
        result.errors.push('לא נמצאו פריטים בהזמנה');
      }

      // Add warnings for missing optional fields
      if (!parsedOrder.phone) {
        result.warnings.push('חסר מספר טלפון');
      }

      if (!parsedOrder.totalAmount) {
        result.warnings.push('חסר סכום תשלום');
      }

      // Calculate confidence based on parsed fields vs total fields
      confidence = totalFields > 0 ? (parsedFields / totalFields) : 0;

      // Boost confidence for having required fields
      if (parsedOrder.address && parsedOrder.contact && parsedOrder.items!.length > 0) {
        confidence += 0.2;
      }

      // Reduce confidence for errors
      confidence -= result.errors.length * 0.1;

      result.confidence = Math.max(0, Math.min(1, confidence));
      result.success = result.errors.length === 0;
      result.data = parsedOrder as ParsedOrder;

      return result;

    } catch (error) {
      result.errors.push(`שגיאה בעיבוד הטקסט: ${error}`);
      return result;
    }
  }

  private isAddressLine(line: string): boolean {
    return /^כתובת\s*:/i.test(line) || /^מען\s*:/i.test(line);
  }

  private parseAddress(line: string): string | null {
    const match = line.match(/^(?:כתובת|מען)\s*:\s*(.+)/i);
    return match ? match[1].trim() : null;
  }

  private isContactLine(line: string): boolean {
    return /^איש קשר\s*:/i.test(line) || /^שם\s*:/i.test(line) || /^ללקוח\s*:/i.test(line);
  }

  private parseContact(line: string): { name: string; phone?: string } | null {
    const match = line.match(/^(?:איש קשר|שם|ללקוח)\s*:\s*(.+)/i);
    if (!match) return null;

    const contactInfo = match[1].trim();
    const phoneMatch = contactInfo.match(/([\d\-]{9,})/);

    if (phoneMatch) {
      const name = contactInfo.replace(phoneMatch[0], '').trim();
      return {
        name,
        phone: phoneMatch[0].replace(/-/g, '')
      };
    }

    return { name: contactInfo };
  }

  private isOrderItemLine(line: string): boolean {
    return /^\d+\.\s/.test(line);
  }

  private parseOrderItem(line: string): ParsedOrderItem | null {
    // Patterns for different item formats:
    // 1. 2 ק"ג עגבניות
    // 2. 5 יח פלפלים ירוקים
    // 3. 1 חבילת חלב 3% הערה מיוחדת

    const patterns = [
      // Pattern: number unit product [notes]
      /^\d+\.\s*(\d+(?:\.\d+)?)\s*([א-ת"\']+)\s+([א-ת\s]+?)(?:\s+(.+))?$/,
      // Pattern: number product unit [notes]
      /^\d+\.\s*(\d+(?:\.\d+)?)\s+([א-ת\s]+?)\s+([א-ת"\']+)(?:\s+(.+))?$/,
      // Pattern: just number and product (assume יח')
      /^\d+\.\s*(\d+(?:\.\d+)?)\s+([א-ת\s]+?)(?:\s+(.+))?$/
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        let quantity, unit, name, notes;

        if (match.length === 5) {
          // Full match with unit
          quantity = parseFloat(match[1]);
          unit = this.normalizeUnit(match[2]) || match[2];
          name = this.normalizeProductName(match[3]) || match[3];
          notes = match[4];
        } else if (match.length === 4) {
          // Match without explicit unit
          quantity = parseFloat(match[1]);
          unit = 'יח\'';
          name = this.normalizeProductName(match[2]) || match[2];
          notes = match[3];
        } else {
          continue;
        }

        return {
          quantity,
          unit: unit.trim(),
          name: name.trim(),
          notes: notes?.trim()
        };
      }
    }

    return null;
  }

  private normalizeUnit(unit: string): string | null {
    const normalized = unit.trim().toLowerCase();
    return HebrewOrderParser.UNIT_NORMALIZATIONS[normalized] || null;
  }

  private normalizeProductName(name: string): string | null {
    const trimmed = name.trim();
    const product = this.businessProducts.get(trimmed);
    return product ? product.name : null;
  }

  private isPaymentLine(line: string): boolean {
    return /^לתשלום\s*:/i.test(line) || /^סך הכל\s*:/i.test(line) || /^סה"כ\s*:/i.test(line);
  }

  private parsePayment(line: string): { amount: number; currency: 'ILS' | 'USD' | 'EUR' } | null {
    const match = line.match(/^(?:לתשלום|סך הכל|סה"כ)\s*:\s*(\d+(?:\.\d+)?)\s*([א-ת$€"\']+)?/i);
    if (!match) return null;

    const amount = parseFloat(match[1]);
    const currencyText = match[2]?.trim() || 'ש"ח';

    let currency: 'ILS' | 'USD' | 'EUR' = 'ILS';

    for (const [key, value] of Object.entries(HebrewOrderParser.CURRENCY_MAP)) {
      if (currencyText.includes(key)) {
        currency = value;
        break;
      }
    }

    return { amount, currency };
  }

  private isOrderTimeLine(line: string): boolean {
    return /^שעת ההזמנה\s*:/i.test(line) || /^זמן\s*:/i.test(line);
  }

  private parseOrderTime(line: string): string | null {
    const match = line.match(/^(?:שעת ההזמנה|זמן)\s*:\s*(\d{1,2}:\d{2})/i);
    return match ? match[1] : null;
  }

  private isBusinessNameLine(line: string): boolean {
    return /^בון של\s+/i.test(line) || /^מ\s*:/i.test(line);
  }

  private parseBusinessName(line: string): string | null {
    let match = line.match(/^בון של\s+(.+)/i);
    if (match) return match[1].trim();

    match = line.match(/^מ\s*:\s*(.+)/i);
    return match ? match[1].trim() : null;
  }

  private isOrderNumberLine(line: string): boolean {
    return /מספר הזמנה\s*:/i.test(line) || /#\d+/.test(line);
  }

  private parseOrderNumber(line: string): string | null {
    let match = line.match(/מספר הזמנה\s*:\s*#?(\d+)/i);
    if (match) return match[1];

    match = line.match(/#(\d+)/);
    return match ? match[1] : null;
  }

  // Helper method to suggest corrections for common mistakes
  static suggestCorrections(originalText: string): string[] {
    const suggestions: string[] = [];

    // Check for common missing patterns
    if (!originalText.includes('כתובת:')) {
      suggestions.push('הוסף "כתובת:" לפני כתובת המשלוח');
    }

    if (!originalText.includes('איש קשר:')) {
      suggestions.push('הוסף "איש קשר:" לפני שם הלקוח');
    }

    if (!originalText.includes('הזמנה:') && /^\d+\./.test(originalText)) {
      suggestions.push('הוסף כותרת "הזמנה:" לפני רשימת הפריטים');
    }

    if (!originalText.includes('לתשלום:') && /\d+\s*ש"ח/.test(originalText)) {
      suggestions.push('הוסף "לתשלום:" לפני הסכום');
    }

    return suggestions;
  }

  // Method to calculate order total from items (if not provided)
  static calculateOrderTotal(items: ParsedOrderItem[], businessProducts?: Map<string, any>): number {
    if (!businessProducts) return 0;

    return items.reduce((total, item) => {
      const product = businessProducts.get(item.name);
      if (product && product.price) {
        return total + (item.quantity * product.price);
      }
      return total;
    }, 0);
  }
}

// Utility function for external use
export async function parseHebrewOrder(
  text: string,
  dataStore: DataStore,
  businessId?: string
): Promise<ParsingResult> {
  const parser = new HebrewOrderParser(dataStore);
  return await parser.parseOrder(text, businessId);
}