"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CURRENCY_UNITS,
  DEFAULT_CURRENCY_UNIT,
  formatAmount,
  getCurrencyLabel,
  parseAmountInput,
  setClientCurrency,
  type CurrencyUnit,
} from "@/lib/currency";

type CurrencyContextValue = {
  currency: CurrencyUnit;
  label: string;
  loaded: boolean;
  formatMoney: (amount: number) => string;
  parseMoneyInput: (value: string) => number;
  setCurrency: (unit: CurrencyUnit) => Promise<void>;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyUnit>(
    DEFAULT_CURRENCY_UNIT
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const unit: CurrencyUnit =
          data.currencyUnit === "rial" ? "rial" : "toman";
        setCurrencyState(unit);
        setClientCurrency(unit);
      })
      .catch(() => {
        setClientCurrency(DEFAULT_CURRENCY_UNIT);
      })
      .finally(() => setLoaded(true));
  }, []);

  const setCurrency = useCallback(async (unit: CurrencyUnit) => {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currencyUnit: unit }),
    });
    if (!res.ok) throw new Error("failed");
    const data = await res.json();
    const next: CurrencyUnit = data.currencyUnit === "rial" ? "rial" : "toman";
    setCurrencyState(next);
    setClientCurrency(next);
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      label: getCurrencyLabel(currency),
      loaded,
      formatMoney: (amount) => formatAmount(amount, currency),
      parseMoneyInput: (value) => parseAmountInput(value, currency),
      setCurrency,
    }),
    [currency, loaded, setCurrency]
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    return {
      currency: DEFAULT_CURRENCY_UNIT,
      label: CURRENCY_UNITS[DEFAULT_CURRENCY_UNIT].label,
      loaded: true,
      formatMoney: (amount: number) =>
        formatAmount(amount, DEFAULT_CURRENCY_UNIT),
      parseMoneyInput: (value: string) =>
        parseAmountInput(value, DEFAULT_CURRENCY_UNIT),
      setCurrency: async () => {},
    };
  }
  return ctx;
}
