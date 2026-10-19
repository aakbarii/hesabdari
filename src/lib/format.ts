import moment from "jalali-moment";

export {
  formatToman,
  formatAmount,
  parseTomanInput,
  parseAmountInput,
  parseRawNumber,
  getCurrencyLabel,
  setClientCurrency,
  getClientCurrency,
  CURRENCY_UNITS,
  DEFAULT_CURRENCY_UNIT,
  type CurrencyUnit,
} from "./currency";

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("fa-IR").format(amount);
}

export function formatJalaliDate(date: Date | string | number): string {
  return moment(date).locale("fa").format("jYYYY/jMM/jDD");
}

export function formatJalaliDateTime(date: Date | string | number): string {
  return moment(date).locale("fa").format("jYYYY/jMM/jDD - HH:mm");
}

export function getJalaliMonthName(month: number): string {
  const months = [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
  ];
  return months[month - 1] ?? "";
}

export function getCurrentJalaliYearMonth(): { year: number; month: number } {
  const m = moment().locale("fa");
  return { year: m.jYear(), month: m.jMonth() + 1 };
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function jalaliToDate(jYear: number, jMonth: number, jDay: number): Date {
  return moment
    .from(`${jYear}/${jMonth}/${jDay}`, "fa", "jYYYY/jM/jD")
    .toDate();
}
