"use client";

import { TotpQrCode } from "@/components/totp-qr-code";
import { AUTH_ENABLED } from "@/lib/app-config";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useConfirm } from "@/components/confirm-dialog";
import { Header } from "@/components/layout/header";
import { PageHero } from "@/components/layout/page-hero";
import {
  CUSTOMIZABLE_HERO_KEYS,
  PAGE_HERO_LABELS,
  PAGE_HEROES,
} from "@/lib/page-heroes";
import { useHeroes } from "@/components/hero-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/components/currency-provider";
import { CURRENCY_UNITS, type CurrencyUnit } from "@/lib/currency";
import { formatAmount } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Check,
  Coins,
  User,
  Shield,
  Tags,
  Pencil,
  Trash2,
  Plus,
  Palette,
  LayoutGrid,
  Eye,
  EyeOff,
  Lock,
  Languages,
  Download,
  ImagePlus,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_COLORS, NAV_ITEMS } from "@/lib/constants";
import {
  ACCENT_COLORS,
  APPEARANCE_MOODS,
  FEMALE_ONLY_NAV_HREFS,
  LOCKED_NAV_HREFS,
  getAllNavHrefs,
  moveNavItem,
  type AccentColorId,
  type AppearanceMood,
  type Gender,
} from "@/lib/appearance";
import { useAppearance } from "@/components/appearance-provider";
import { useLocale } from "@/components/locale-provider";
import type { Locale, MessageKey } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SAMPLE_AMOUNT = 1_250_000;

interface Profile {
  name: string;
  email: string;
}


interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
}

export default function SettingsPage() {
  const confirm = useConfirm();
  const { currency, setCurrency } = useCurrency();
  const {
    mood,
    accent,
    visibleNav,
    mobileNav,
    gender,
    setMood,
    setAccent,
    setVisibleNav,
    setMobileNav,
    setGender,
  } = useAppearance();
  const { locale, setLocale, t } = useLocale();
  const {
    resolve: resolveHero,
    hide: hideHero,
    show: showHero,
    reset: resetHero,
    upload: uploadHero,
  } = useHeroes();
  const [, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpSetup, setTotpSetup] = useState<{
    secret: string;
    uri: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({
    name: "",
    type: "expense" as "income" | "expense",
    color: CATEGORY_COLORS[0],
  });

  const load = () => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setProfile(d);
        setName(d.name ?? "");
        setEmail(d.email ?? "");
      });
    if (AUTH_ENABLED) fetch("/api/auth/2fa")
      .then((r) => r.json())
      .then((d) => setTotpEnabled(Boolean(d.enabled)));
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories);
  };

  useEffect(() => {
    load();
  }, []);

  const selectCurrency = async (unit: CurrencyUnit) => {
    if (unit === currency) return;
    try {
      await setCurrency(unit);
      toast.success(`واحد پول به ${CURRENCY_UNITS[unit].label} تغییر کرد`);
    } catch {
      toast.error("خطا در ذخیره تنظیمات");
    }
  };

  const selectMood = async (next: AppearanceMood) => {
    if (next === mood) return;
    try {
      await setMood(next);
      toast.success(`تم ${APPEARANCE_MOODS[next].label} اعمال شد`);
    } catch {
      toast.error("خطا در ذخیره ظاهر");
    }
  };

  const selectAccent = async (next: AccentColorId) => {
    if (next === accent) return;
    try {
      await setAccent(next);
      toast.success("رنگ اصلی به‌روز شد");
    } catch {
      toast.error("خطا در ذخیره رنگ");
    }
  };

  const toggleNavHref = async (href: string) => {
    if ((LOCKED_NAV_HREFS as readonly string[]).includes(href)) return;
    const next = visibleNav.includes(href)
      ? visibleNav.filter((h) => h !== href)
      : [...visibleNav, href];
    try {
      await setVisibleNav(next);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const moveVisible = async (index: number, dir: -1 | 1) => {
    const next = moveNavItem(visibleNav, index, index + dir);
    if (next === visibleNav) return;
    try {
      await setVisibleNav(next);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const moveMobile = async (index: number, dir: -1 | 1) => {
    const next = moveNavItem(mobileNav, index, index + dir);
    if (next === mobileNav) return;
    try {
      await setMobileNav(next);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const setMobileSlot = async (index: number, href: string) => {
    const next = [...mobileNav];
    // avoid duplicates: swap if already present
    const existing = next.indexOf(href);
    if (existing >= 0) {
      next[existing] = next[index] ?? href;
    }
    next[index] = href;
    try {
      await setMobileNav(next);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const navLabel = (href: string) => {
    const item = NAV_ITEMS.find((i) => i.href === href);
    return item ? t(item.labelKey as MessageKey) : href;
  };

  const hiddenNavHrefs = getAllNavHrefs().filter(
    (h) =>
      !visibleNav.includes(h) &&
      (gender !== "male" ||
        !(FEMALE_ONLY_NAV_HREFS as readonly string[]).includes(h))
  );

  const selectLocale = async (next: Locale) => {
    if (next === locale) return;
    try {
      await setLocale(next);
      toast.success(next === "en" ? "Language set to English" : "زبان فارسی شد");
    } catch {
      toast.error(t("common.error"));
    }
  };

  const selectGender = async (next: Gender) => {
    if (next === gender) return;
    try {
      await setGender(next);
      toast.success(next === "male" ? "پروفایل مردانه" : "پروفایل زنانه");
    } catch {
      toast.error(t("common.error"));
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, string> = { name, email };
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      toast.success("پروفایل ذخیره شد");
      setCurrentPassword("");
      setNewPassword("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  };


  const openCreateCat = () => {
    setEditingCat(null);
    setCatForm({ name: "", type: "expense", color: CATEGORY_COLORS[0] });
    setCatOpen(true);
  };

  const openEditCat = (c: Category) => {
    setEditingCat(c);
    setCatForm({ name: c.name, type: c.type, color: c.color });
    setCatOpen(true);
  };

  const submitCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCat) {
      const res = await fetch(`/api/categories/${editingCat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catForm.name, color: catForm.color }),
      });
      if (!res.ok) return toast.error("خطا در ویرایش");
      toast.success("دسته به‌روز شد");
    } else {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catForm),
      });
      if (!res.ok) return toast.error("خطا در ثبت");
      toast.success("دسته اضافه شد");
    }
    setCatOpen(false);
    setEditingCat(null);
    load();
  };

  const removeCat = async (c: Category) => {
    const ok = await confirm({
      title: "حذف دسته‌بندی",
      description: `دسته «${c.name}» حذف شود؟`,
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("خطا در حذف");
    toast.success("دسته حذف شد");
    load();
  };

  const startTotpSetup = async () => {
    setTotpLoading(true);
    try {
      const res = await fetch("/api/auth/2fa", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setTotpSetup({ secret: data.secret, uri: data.uri });
      setTotpCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setTotpLoading(false);
    }
  };

  const enableTotp = async () => {
    setTotpLoading(true);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      toast.success("احراز هویت دو مرحله‌ای فعال شد");
      setTotpEnabled(true);
      setTotpSetup(null);
      setTotpCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setTotpLoading(false);
    }
  };

  const disableTotp = async () => {
    setTotpLoading(true);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: disablePassword,
          code: disableCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      toast.success("۲FA غیرفعال شد");
      setTotpEnabled(false);
      setDisablePassword("");
      setDisableCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setTotpLoading(false);
    }
  };

  return (
    <>
      <Header title={t("settings.title")} />
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6 motion-stagger">
        <PageHero
          heroKey="settings"
          title={t("settings.title")}
          subtitle={
            locale === "en"
              ? "Profile, appearance, categories and security"
              : "پروفایل، ظاهر، دسته‌بندی‌ها و امنیت"
          }
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Languages className="h-5 w-5 text-primary" />
              {t("settings.language")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("settings.language.hint")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["fa", "en"] as Locale[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => selectLocale(code)}
                  className={cn(
                    "rounded-xl border p-3 text-sm font-medium transition-colors",
                    locale === code
                      ? "border-primary bg-primary/8"
                      : "hover:bg-muted/50"
                  )}
                >
                  {t(`settings.language.${code}` as MessageKey)}
                  {locale === code && (
                    <Check className="inline h-4 w-4 ms-2 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              پروفایل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label>نام</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>ایمیل</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>جنسیت</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["male", "مرد"],
                      ["female", "زن"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => selectGender(id)}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                        gender === id
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  برای مرد، بخش پریود و چرخه از منو حذف می‌شود.
                </p>
              </div>
              {/* Password management is paused together with login. */}
              {AUTH_ENABLED && <div className="border-t pt-4 space-y-3">
                <p className="text-sm text-muted-foreground">تغییر رمز (اختیاری)</p>
                <div className="space-y-2">
                  <Label>رمز فعلی</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>رمز جدید</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                  />
                </div>
              </div>}
              <Button type="submit" disabled={saving}>
                {saving ? "..." : "ذخیره پروفایل"}
              </Button>
            </form>
          </CardContent>
        </Card>


        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ImagePlus className="h-5 w-5 text-primary" />
              {locale === "en" ? "Page cover photos" : "تصاویر بالای صفحات"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {locale === "en"
                ? "Replace, hide, or restore the cover image on each page. You can also use the ⋯ menu on each banner."
                : "برای هر صفحه عکس را عوض کن، بردار، یا به پیش‌فرض برگردان. از منوی ⋯ روی خود بنر هم می‌شود."}
            </p>
            <div className="space-y-2 max-h-80 overflow-y-auto pe-1">
              {CUSTOMIZABLE_HERO_KEYS.filter(
                (key) => gender !== "male" || key !== "cycle"
              ).map((key) => {
                const r = resolveHero(key);
                const label =
                  PAGE_HERO_LABELS[key][locale === "en" ? "en" : "fa"];
                const thumb = r.hidden
                  ? PAGE_HEROES[key]
                  : r.src;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-xl border px-2.5 py-2"
                  >
                    <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {thumb.startsWith("/api/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className={cn(
                            "h-full w-full object-cover",
                            r.hidden && "opacity-30"
                          )}
                        />
                      ) : (
                        <Image
                          src={thumb}
                          alt=""
                          fill
                          className={cn(
                            "object-cover",
                            r.hidden && "opacity-30"
                          )}
                          sizes="80px"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.hidden
                          ? locale === "en"
                            ? "Hidden"
                            : "مخفی"
                          : r.isCustom
                            ? locale === "en"
                              ? "Custom"
                              : "سفارشی"
                            : locale === "en"
                              ? "Default"
                              : "پیش‌فرض"}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <label className="inline-flex">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            if (!f) return;
                            try {
                              await uploadHero(key, f);
                              toast.success(t("common.success"));
                            } catch (err) {
                              toast.error(
                                err instanceof Error
                                  ? err.message
                                  : t("common.error")
                              );
                            }
                          }}
                        />
                        <span
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "icon-sm" }),
                            "cursor-pointer"
                          )}
                          title={locale === "en" ? "Replace" : "جایگزین"}
                        >
                          <ImagePlus className="h-3.5 w-3.5" />
                        </span>
                      </label>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={async () => {
                          try {
                            if (r.hidden) await showHero(key);
                            else await hideHero(key);
                            toast.success(t("common.success"));
                          } catch {
                            toast.error(t("common.error"));
                          }
                        }}
                        title={
                          r.hidden
                            ? locale === "en"
                              ? "Show"
                              : "نمایش"
                            : locale === "en"
                              ? "Hide"
                              : "مخفی"
                        }
                      >
                        {r.hidden ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={!r.isCustom && !r.hidden}
                        onClick={async () => {
                          try {
                            await resetHero(key);
                            toast.success(t("common.success"));
                          } catch {
                            toast.error(t("common.error"));
                          }
                        }}
                        title={locale === "en" ? "Reset" : "پیش‌فرض"}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-primary/15 shadow-sm gap-0 py-0">
          <div className="h-24 relative overflow-hidden">
            {(() => {
              const r = resolveHero("settings");
              const src = r.hidden ? PAGE_HEROES.settings : r.src;
              return src.startsWith("/api/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              ) : (
                <Image
                  src={src}
                  alt=""
                  fill
                  className="object-cover object-center"
                  sizes="640px"
                />
              );
            })()}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
            <div className="absolute bottom-3 right-4 left-4 flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">{t("settings.appearance")}</span>
            </div>
          </div>
          <CardContent className="space-y-6 py-5">
            <div className="space-y-3">
              <p className="text-sm font-medium">
                {locale === "en" ? "Theme mood" : "حال‌وهوا"}
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.keys(APPEARANCE_MOODS) as AppearanceMood[]).map((key) => {
                  const cfg = APPEARANCE_MOODS[key];
                  const selected = mood === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectMood(key)}
                      className={cn(
                        "motion-soft rounded-2xl border p-3 text-start transition-colors",
                        selected
                          ? "border-primary bg-primary/8 shadow-sm"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <p className="font-semibold text-sm">
                        {locale === "en" ? cfg.labelEn : cfg.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        {locale === "en" ? cfg.descriptionEn : cfg.description}
                      </p>
                      {selected && (
                        <Check className="h-4 w-4 text-primary mt-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">رنگ اصلی</p>
              <div className="flex flex-wrap gap-2.5">
                {ACCENT_COLORS.map((c) => {
                  const selected = accent === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      onClick={() => selectAccent(c.id)}
                      className={cn(
                        "motion-soft motion-press relative h-10 w-10 rounded-full border-2 transition-transform",
                        selected
                          ? "border-foreground scale-110 shadow-md"
                          : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: c.hex }}
                      aria-label={c.label}
                    >
                      {selected && (
                        <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5 text-primary" />
              {t("settings.backup")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("settings.backup.hint")}</p>
            <div className="flex flex-wrap gap-2">
              <a
                href="/api/export?format=json"
                download
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                {t("settings.backup.json")}
              </a>
              <a
                href="/api/export?format=csv"
                download
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                {t("settings.backup.csv")}
              </a>
              <a
                href="/api/export?format=html"
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                {t("settings.backup.pdf")}
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LayoutGrid className="h-5 w-5 text-primary" />
              {t("settings.pages")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              {t("settings.pages.hint")}
            </p>
            <div className="space-y-1.5">
              {visibleNav.map((href, index) => {
                const locked = (LOCKED_NAV_HREFS as readonly string[]).includes(
                  href
                );
                return (
                  <div
                    key={href}
                    className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-2 py-2"
                  >
                    <div className="flex flex-col shrink-0">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => moveVisible(index, -1)}
                        aria-label="up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={index === visibleNav.length - 1}
                        onClick={() => moveVisible(index, 1)}
                        aria-label="down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {index + 1}. {navLabel(href)}
                      </p>
                      {locked && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          {t("settings.locked")}
                        </p>
                      )}
                    </div>
                    {!locked && (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => toggleNavHref(href)}
                        title={t("settings.hidden")}
                      >
                        <EyeOff className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            {hiddenNavHrefs.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground">
                  {locale === "en" ? "Hidden — tap to show" : "مخفی — برای نمایش بزن"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {hiddenNavHrefs.map((href) => (
                    <button
                      key={href}
                      type="button"
                      onClick={() => toggleNavHref(href)}
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs hover:bg-muted"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {navLabel(href)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5 text-primary" />
              {t("settings.mobileTabs")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("settings.mobileTabs.hint")}
            </p>
            <div className="space-y-2">
              {mobileNav.map((href, index) => (
                <div
                  key={`m-${index}-${href}`}
                  className="flex items-center gap-2 rounded-xl border px-2 py-2"
                >
                  <div className="flex flex-col shrink-0">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      disabled={index === 0}
                      onClick={() => moveMobile(index, -1)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      disabled={index === mobileNav.length - 1}
                      onClick={() => moveMobile(index, 1)}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[11px] text-muted-foreground">
                      {locale === "en" ? `Tab ${index + 1}` : `تب ${index + 1}`}
                    </p>
                    <Select
                      value={href}
                      onValueChange={(v) => {
                        if (v) setMobileSlot(index, v);
                      }}
                      items={Object.fromEntries(
                        visibleNav
                          .filter((h) => h !== "/settings")
                          .map((h) => [h, navLabel(h)])
                      )}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {visibleNav
                          .filter((h) => h !== "/settings")
                          .map((h) => (
                            <SelectItem key={h} value={h}>
                              {navLabel(h)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Coins className="h-5 w-5 text-primary" />
              واحد پول
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.keys(CURRENCY_UNITS) as CurrencyUnit[]).map((unit) => {
              const cfg = CURRENCY_UNITS[unit];
              const selected = currency === unit;
              return (
                <button
                  key={unit}
                  type="button"
                  onClick={() => selectCurrency(unit)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl border p-4 text-right transition-colors",
                    selected
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div>
                    <p className="font-semibold">{cfg.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {cfg.description}
                    </p>
                    <p className="text-sm mt-2 text-primary">
                      نمونه: {formatAmount(SAMPLE_AMOUNT, unit)}
                    </p>
                  </div>
                  {selected && (
                    <Check className="h-5 w-5 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Tags className="h-5 w-5 text-primary" />
              دسته‌بندی‌ها
            </CardTitle>
            <Button size="sm" variant="outline" onClick={openCreateCat}>
              <Plus className="h-4 w-4 ml-1" />
              جدید
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">دسته‌ای تعریف نشده</p>
            ) : (
              categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="truncate text-sm">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {c.type === "income" ? "درآمد" : "هزینه"}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditCat(c)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeCat(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 2FA code is retained while authentication is disabled. */}
        {AUTH_ENABLED && <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              احراز هویت دو مرحله‌ای (۲FA)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              با فعال‌سازی ۲FA، پس از ورود رمز، کد اپ احراز هویت (مثل Google
              Authenticator) هم لازم است.
            </p>
            {totpEnabled ? (
              <div className="space-y-3">
                <p className="text-emerald-600 font-medium">✓ ۲FA فعال است</p>
                <div className="space-y-2 border-t pt-3">
                  <p className="text-muted-foreground">برای غیرفعال‌سازی:</p>
                  <div className="space-y-2">
                    <Label>رمز عبور</Label>
                    <Input
                      type="password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>کد ۲FA</Label>
                    <Input
                      inputMode="numeric"
                      value={disableCode}
                      onChange={(e) =>
                        setDisableCode(e.target.value.replace(/\D/g, ""))
                      }
                      maxLength={6}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={totpLoading}
                    onClick={disableTotp}
                  >
                    غیرفعال‌سازی ۲FA
                  </Button>
                </div>
              </div>
            ) : totpSetup ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <TotpQrCode value={totpSetup.uri} />
                </div>
                <p className="text-xs text-muted-foreground break-all text-center">
                  کلید دستی: <code className="font-mono">{totpSetup.secret}</code>
                </p>
                <div className="space-y-2">
                  <Label>کد ۶ رقمی از اپ</Label>
                  <Input
                    inputMode="numeric"
                    value={totpCode}
                    onChange={(e) =>
                      setTotpCode(e.target.value.replace(/\D/g, ""))
                    }
                    maxLength={6}
                    placeholder="۰۰۰۰۰۰"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={totpLoading || totpCode.length < 6}
                    onClick={enableTotp}
                  >
                    فعال‌سازی
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setTotpSetup(null)}
                  >
                    انصراف
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={totpLoading}
                onClick={startTotpSetup}
              >
                راه‌اندازی ۲FA
              </Button>
            )}
          </CardContent>
        </Card>}
      </div>

      <Dialog
        open={catOpen}
        onOpenChange={(v) => {
          setCatOpen(v);
          if (!v) setEditingCat(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCat ? "ویرایش دسته" : "دسته جدید"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCat} className="space-y-4">
            <div className="space-y-2">
              <Label>نام</Label>
              <Input
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                required
              />
            </div>
            {!editingCat && (
              <div className="space-y-2">
                <Label>نوع</Label>
                <Select
                  value={catForm.type}
                  onValueChange={(v) =>
                    setCatForm({
                      ...catForm,
                      type: (v ?? "expense") as "income" | "expense",
                    })
                  }
                  items={{ expense: "هزینه", income: "درآمد" }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">هزینه</SelectItem>
                    <SelectItem value="income">درآمد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>رنگ</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "h-7 w-7 rounded-full border-2",
                      catForm.color === c
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setCatForm({ ...catForm, color: c })}
                  />
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full">
              ذخیره
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
