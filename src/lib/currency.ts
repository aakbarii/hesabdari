export type CurrencyUnit = "toman" | "rial";

export const DEFAULT_CURRENCY_UNIT: CurrencyUnit = "toman";

export const CURRENCY_UNITS: Record<
  CurrencyUnit,
  { label: string; factor: number; description: string }
> = {
  toman: {
    label: "تومان",
    factor: 1,
    description: "واحد پیش‌فرض — مبالغ به تومان",
  },
  rial: {
    label: "ریال",
    factor: 10,
    description: "هر ۱ تومان = ۱۰ ریال",
  },
};

export function isCurrencyUnit(value: string): value is CurrencyUnit {
  return value === "toman" || value === "rial";
}

/** مبالغ در دیتابیس همیشه به تومان ذخیره می‌شوند */
export function formatAmount(
  amountInToman: number,
  unit: CurrencyUnit = DEFAULT_CURRENCY_UNIT
): string {
  const { factor } = CURRENCY_UNITS[unit];
  const display = Math.round(amountInToman * factor);
  return new Intl.NumberFormat(moneyLocale()).format(display) + " " + moneyLabel(unit);
}

export function getCurrencyLabel(unit: CurrencyUnit = DEFAULT_CURRENCY_UNIT): string {
  return moneyLabel(unit);
}

export function parseRawNumber(value: string): number {
  const cleaned = value
    .replace(/[,٬\s]/g, "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  if (!/^-?\d+$/.test(cleaned)) return 0;
  const number = Number(cleaned);
  return Number.isSafeInteger(number) ? number : 0;
}

export function parseAmountInput(
  value: string,
  unit: CurrencyUnit = DEFAULT_CURRENCY_UNIT
): number {
  const raw = parseRawNumber(value);
  const { factor } = CURRENCY_UNITS[unit];
  return Math.round(raw / factor);
}

let clientCurrency: CurrencyUnit = DEFAULT_CURRENCY_UNIT;
let clientLocale: "fa" | "en" = "fa";

export function setClientLocale(locale: "fa" | "en") {
  clientLocale = locale;
}

function moneyLocale() {
  return clientLocale === "en" ? "en-US" : "fa-IR";
}

function moneyLabel(unit: CurrencyUnit) {
  if (clientLocale !== "en") return CURRENCY_UNITS[unit].label;
  return unit === "rial" ? "Rial" : "Toman";
}

export function setClientCurrency(unit: CurrencyUnit) {
  clientCurrency = unit;
}

export function getClientCurrency(): CurrencyUnit {
  return clientCurrency;
}

export function formatToman(amount: number): string {
  return formatAmount(amount, clientCurrency);
}

/** Short axis labels for charts, e.g. «۴۵ میلیون». */
export function formatCompactAmount(amount: number): string {
  const { factor } = CURRENCY_UNITS[clientCurrency];
  return new Intl.NumberFormat(moneyLocale(), { notation: "compact", maximumFractionDigits: 1 }).format(
    Math.round(amount * factor)
  );
}

export function parseTomanInput(value: string): number {
  return parseAmountInput(value, clientCurrency);
}
