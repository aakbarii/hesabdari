export type ParsedBankSms = {
  type: "income" | "expense";
  amount: number;
  title: string;
  date: string | null;
  confidence: number;
};

function heuristicParse(raw: string): ParsedBankSms | null {
  const text = raw.replace(/\u200c/g, " ").trim();
  if (!text) return null;

  const lower = text.toLowerCase();
  const isIncome =
    /واریز|واريز|deposit|credit|افزایش|افزايش|دریافت|دريافت|سود/.test(text) ||
    /variz|deposit/i.test(lower);
  const isExpense =
    /برداشت|خرید|خريد|پرداخت|برداشت از|debit|purchase|pos|برداشت کارت/.test(
      text
    ) || /bardasht|purchase/i.test(lower);

  const amountPatterns = [
    /(?:مبلغ|amount)[:\s]*([0-9۰-۹,]{3,})/i,
    /([0-9۰-۹]{1,3}(?:[٬,][0-9۰-۹]{3})+)/,
    /([0-9۰-۹]{4,})/,
  ];

  const faDigits = "۰۱۲۳۴۵۶۷۸۹";
  const toEn = (s: string) =>
    s.replace(/[۰-۹]/g, (d) => String(faDigits.indexOf(d)));

  let amount = 0;
  for (const re of amountPatterns) {
    const m = text.match(re);
    if (!m) continue;
    const n = Number(toEn(m[1]).replace(/[^\d]/g, ""));
    if (n >= 1000) {
      amount = n;
      break;
    }
  }
  if (!amount) return null;

  // Iranian SMS often in Rial; app uses Toman by default → divide by 10 if huge
  let normalized = amount;
  if (normalized >= 100_000_000) normalized = Math.round(normalized / 10);

  const type: "income" | "expense" =
    isIncome && !isExpense ? "income" : "expense";

  const merchant =
    text.match(/(?:از|به|فروشگاه|پذیرنده|merchant)[:\s]*([^\n\d]{2,40})/i)?.[1]
      ?.trim() ?? null;

  const title =
    merchant ||
    (type === "income" ? "واریز بانکی" : "برداشت بانکی");

  return {
    type,
    amount: normalized,
    title: title.slice(0, 80),
    date: new Date().toISOString().slice(0, 10),
    confidence: isIncome || isExpense ? 70 : 45,
  };
}

export async function parseBankSmsWithAi(
  raw: string
): Promise<{ parsed: ParsedBankSms; source: "gemini" | "heuristic" }> {
  const heuristic = heuristicParse(raw);
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    if (!heuristic) {
      throw new Error("NO_PARSE");
    }
    return { parsed: heuristic, source: "heuristic" };
  }

  try {
    const prompt = `You parse Iranian bank SMS into JSON only.
Return ONLY valid JSON with keys:
type: "income" or "expense"
amount: integer in TOMAN (if SMS is in Rial, convert /10)
title: short Persian description (merchant or reason)
date: YYYY-MM-DD or null
confidence: 0-100

SMS:
"""
${raw.slice(0, 2000)}
"""`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
      }),
    });

    if (!res.ok) {
      if (heuristic) return { parsed: heuristic, source: "heuristic" };
      throw new Error("GEMINI_FAIL");
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text =
      json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
      "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      if (heuristic) return { parsed: heuristic, source: "heuristic" };
      throw new Error("GEMINI_PARSE");
    }
    const data = JSON.parse(match[0]) as Partial<ParsedBankSms>;
    const amount = Math.round(Number(data.amount) || 0);
    if (!amount || (data.type !== "income" && data.type !== "expense")) {
      if (heuristic) return { parsed: heuristic, source: "heuristic" };
      throw new Error("GEMINI_INVALID");
    }
    return {
      parsed: {
        type: data.type,
        amount,
        title: String(data.title || heuristic?.title || "تراکنش بانکی").slice(
          0,
          80
        ),
        date: data.date || new Date().toISOString().slice(0, 10),
        confidence: Math.min(100, Math.max(0, Number(data.confidence) || 75)),
      },
      source: "gemini",
    };
  } catch {
    if (heuristic) return { parsed: heuristic, source: "heuristic" };
    throw new Error("PARSE_FAIL");
  }
}

async function callGemini(prompt: string, maxTokens = 1200): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens },
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return (
    json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
    null
  );
}

export type WeeklyInsightResult = {
  summary: string;
  budgetTips: string[];
  goalTips: string[];
  source: "gemini" | "heuristic";
};

export async function generateWeeklyInsight(input: {
  locale: "fa" | "en";
  income: number;
  expense: number;
  topCategories: Array<{ name: string; total: number }>;
  anomalies: Array<{ name: string; percentAbove: number }>;
  moodCounts: Record<string, number>;
  habitsDone: number;
  habitsTotal: number;
  medsMissed: number;
}): Promise<WeeklyInsightResult> {
  const lang = input.locale === "en" ? "English" : "Persian (Farsi)";
  const prompt = `You are a calm personal finance & wellness coach for the Ravaal app.
Write a short weekly insight in ${lang}.
Return ONLY JSON:
{
  "summary": "3-6 sentences",
  "budgetTips": ["tip1","tip2","tip3"],
  "goalTips": ["tip1","tip2"]
}

Data (Toman):
income=${input.income}
expense=${input.expense}
topCategories=${JSON.stringify(input.topCategories.slice(0, 6))}
anomalies=${JSON.stringify(input.anomalies.slice(0, 4))}
moods=${JSON.stringify(input.moodCounts)}
habits=${input.habitsDone}/${input.habitsTotal}
medsMissedDaysApprox=${input.medsMissed}
`;

  const text = await callGemini(prompt);
  if (text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const data = JSON.parse(match[0]) as Partial<WeeklyInsightResult>;
        if (data.summary) {
          return {
            summary: String(data.summary),
            budgetTips: Array.isArray(data.budgetTips)
              ? data.budgetTips.map(String).slice(0, 5)
              : [],
            goalTips: Array.isArray(data.goalTips)
              ? data.goalTips.map(String).slice(0, 4)
              : [],
            source: "gemini",
          };
        }
      } catch {
        /* fall through */
      }
    }
  }

  const bal = input.income - input.expense;
  if (input.locale === "en") {
    return {
      summary: `This week you earned about ${input.income.toLocaleString()} and spent ${input.expense.toLocaleString()} (net ${bal.toLocaleString()}). ${
        input.anomalies[0]
          ? `Watch ${input.anomalies[0].name} — it's running hot.`
          : "Spending looks fairly steady."
      } Habits ${input.habitsDone}/${input.habitsTotal} done.`,
      budgetTips: [
        "Set next-month budgets from your 3‑month average.",
        "Confirm bank SMS suggestions so categories improve.",
      ],
      goalTips: [
        bal > 0
          ? "Move part of the surplus into a savings goal."
          : "Pause non-essential purchases until balance recovers.",
      ],
      source: "heuristic",
    };
  }

  return {
    summary: `این هفته حدود ${input.income.toLocaleString("fa-IR")} درآمد و ${input.expense.toLocaleString("fa-IR")} هزینه داشتی (خالص ${bal.toLocaleString("fa-IR")}). ${
      input.anomalies[0]
        ? `دستهٔ «${input.anomalies[0].name}» بیشتر از معمول بوده.`
        : "خرج‌ها نسبتاً پایدار به نظر می‌رسد."
    } عادت‌ها: ${input.habitsDone}/${input.habitsTotal}.`,
    budgetTips: [
      "بودجه ماه بعد را از میانگین ۳ ماه پیشنهاد بگیر.",
      "تأیید پیامک بانکی دسته‌بندی را بهتر می‌کند.",
    ],
    goalTips: [
      bal > 0
        ? "بخشی از مانده را به هدف پس‌انداز منتقل کن."
        : "تا متعادل شدن مانده، خرید غیرضروری را کم کن.",
    ],
    source: "heuristic",
  };
}

export async function extractTasksFromJournal(
  text: string,
  locale: "fa" | "en"
): Promise<string[]> {
  const prompt = `Extract actionable TODO items from this journal note.
Language of todos: ${locale === "en" ? "English" : "Persian"}.
Return ONLY JSON: { "tasks": ["..."] }
Note:
"""
${text.slice(0, 2500)}
"""`;
  const out = await callGemini(prompt, 400);
  if (out) {
    const match = out.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const data = JSON.parse(match[0]) as { tasks?: unknown };
        if (Array.isArray(data.tasks)) {
          return data.tasks.map(String).filter(Boolean).slice(0, 8);
        }
      } catch {
        /* fall through */
      }
    }
  }
  // heuristic: lines with فردا/باید/call/todo
  return text
    .split(/\n|[.!؟?]/)
    .map((s) => s.trim())
    .filter((s) =>
      /فردا|باید|تماس|خرید|todo|call|buy|remind/i.test(s)
    )
    .slice(0, 5);
}
