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
  return value in CURRENCY_UNITS;
}

/** مبالغ در دیتابیس همیشه به تومان ذخیره می‌شوند */
export function formatAmount(
  amountInToman: number,
  unit: CurrencyUnit = DEFAULT_CURRENCY_UNIT
): string {
  const { label, factor } = CURRENCY_UNITS[unit];
  const display = Math.round(amountInToman * factor);
  return new Intl.NumberFormat("fa-IR").format(display) + " " + label;
}

export function getCurrencyLabel(unit: CurrencyUnit = DEFAULT_CURRENCY_UNIT): string {
  return CURRENCY_UNITS[unit].label;
}

export function parseRawNumber(value: string): number {
  const cleaned = value
    .replace(/[,\s]/g, "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  return parseInt(cleaned, 10) || 0;
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

export function setClientCurrency(unit: CurrencyUnit) {
  clientCurrency = unit;
}

export function getClientCurrency(): CurrencyUnit {
  return clientCurrency;
}

export function formatToman(amount: number): string {
  return formatAmount(amount, clientCurrency);
}

export function parseTomanInput(value: string): number {
  return parseAmountInput(value, clientCurrency);
}
