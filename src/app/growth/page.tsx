"use client";

import { useEffect, useState, useTransition } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, GraduationCap, Plus, Trash2, CheckCircle2, Bookmark, Star } from "lucide-react";
import { toast } from "sonner";

interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  status: "want_to_read" | "reading" | "completed";
  category: string;
  rating: number | null;
  notes: string | null;
}

interface Course {
  id: string;
  title: string;
  platform: string;
  totalLessons: number;
  completedLessons: number;
  status: "in_progress" | "completed";
  notes: string | null;
}

export default function GrowthPage() {
  const [tab, setTab] = useState("books");
  const [books, setBooks] = useState<Book[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [openBook, setOpenBook] = useState(false);
  const [openCourse, setOpenCourse] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    totalPages: "300",
    currentPage: "0",
    category: "توسعه فردی",
    status: "reading" as Book["status"],
  });

  const [courseForm, setCourseForm] = useState({
    title: "",
    platform: "یوتیوب / آنلاین",
    totalLessons: "20",
    completedLessons: "0",
  });

  const loadData = async () => {
    try {
      const res = await fetch("/api/growth");
      if (res.ok) {
        const json = await res.json();
        setBooks(json.books);
        setCourses(json.courses);
      }
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await fetch("/api/growth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: bookForm.title,
            author: bookForm.author,
            totalPages: Number(bookForm.totalPages) || 1,
            currentPage: Number(bookForm.currentPage) || 0,
            category: bookForm.category,
            status: bookForm.status,
          }),
        });
        if (res.ok) {
          toast.success("کتاب جدید اضافه شد 📖");
          setOpenBook(false);
          setBookForm({ title: "", author: "", totalPages: "300", currentPage: "0", category: "توسعه فردی", status: "reading" });
          loadData();
        }
      } catch {
        toast.error("خطا در ثبت کتاب");
      }
    });
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await fetch("/api/growth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "course",
            title: courseForm.title,
            platform: courseForm.platform,
            totalLessons: Number(courseForm.totalLessons) || 1,
            completedLessons: Number(courseForm.completedLessons) || 0,
          }),
        });
        if (res.ok) {
          toast.success("دوره آموزشی اضافه شد 🎓");
          setOpenCourse(false);
          setCourseForm({ title: "", platform: "یوتیوب / آنلاین", totalLessons: "20", completedLessons: "0" });
          loadData();
        }
      } catch {
        toast.error("خطا در ثبت دوره");
      }
    });
  };

  const updateBookPage = async (id: string, newPage: number, total: number) => {
    const validPage = Math.max(0, Math.min(total, newPage));
    const status = validPage >= total ? "completed" : "reading";
    try {
      await fetch(`/api/growth/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "book", currentPage: validPage, status }),
      });
      loadData();
    } catch {}
  };

  const updateCourseLesson = async (id: string, newLesson: number, total: number) => {
    const valid = Math.max(0, Math.min(total, newLesson));
    const status = valid >= total ? "completed" : "in_progress";
    try {
      await fetch(`/api/growth/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "course", completedLessons: valid, status }),
      });
      loadData();
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/growth/${id}`, { method: "DELETE" });
      toast.success("حذف شد");
      loadData();
    } catch {}
  };

  const completedBooks = books.filter((b) => b.status === "completed").length;
  const activeBooks = books.filter((b) => b.status === "reading").length;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <Header title="یادگیری و رشد فردی" />

      <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-600">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">قفسه کتاب‌ها و دوره‌های آموزشی</h2>
              <p className="text-xs text-muted-foreground">رهگیری پیشرفت مطالعه، دوره‌های فرانت‌اند و مهارت‌های جدید</p>
            </div>
          </div>

          <div className="flex gap-2">
            {tab === "books" ? (
              <Button size="sm" onClick={() => setOpenBook(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> افزودن کتاب جدید
              </Button>
            ) : (
              <Button size="sm" onClick={() => setOpenCourse(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> افزودن دوره آموزشی
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border p-4 text-center">
            <p className="text-xs text-muted-foreground">کتاب‌های در حال خواندن</p>
            <p className="text-2xl font-extrabold text-primary mt-1">{activeBooks.toLocaleString("fa-IR")}</p>
          </Card>
          <Card className="border p-4 text-center">
            <p className="text-xs text-muted-foreground">کتاب‌های تمام‌شده</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{completedBooks.toLocaleString("fa-IR")}</p>
          </Card>
          <Card className="border p-4 text-center">
            <p className="text-xs text-muted-foreground">کل کتاب‌های قفسه</p>
            <p className="text-2xl font-extrabold mt-1">{books.length.toLocaleString("fa-IR")}</p>
          </Card>
          <Card className="border p-4 text-center">
            <p className="text-xs text-muted-foreground">دوره‌های فعال</p>
            <p className="text-2xl font-extrabold text-indigo-600 mt-1">{courses.length.toLocaleString("fa-IR")}</p>
          </Card>
        </div>

        {/* Tabs for Books / Courses */}
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="grid w-full sm:w-80 grid-cols-2">
            <TabsTrigger value="books" className="gap-1.5">
              <Bookmark className="h-4 w-4" /> کتاب‌ها ({books.length})
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-1.5">
              <GraduationCap className="h-4 w-4" /> دوره‌ها ({courses.length})
            </TabsTrigger>
          </TabsList>

          {/* Books Tab */}
          <TabsContent value="books" className="space-y-4">
            {books.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground text-xs border">
                هنوز کتابی در قفسه ندارید. با زدن دکمه «افزودن کتاب جدید» اولین کتاب را اضافه کنید!
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {books.map((b) => {
                  const percent = Math.min(100, Math.round((b.currentPage / b.totalPages) * 100));
                  return (
                    <Card key={b.id} className="border shadow-sm p-4 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-sm leading-snug">{b.title}</h4>
                            <p className="text-xs text-muted-foreground">{b.author}</p>
                          </div>
                          <Badge variant={b.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                            {b.status === "completed" ? "خوانده‌شده" : `${percent}%`}
                          </Badge>
                        </div>

                        <div className="space-y-1 pt-2">
                          <div className="flex justify-between text-xs text-muted-foreground font-mono">
                            <span>صفحه {b.currentPage}</span>
                            <span>از {b.totalPages}</span>
                          </div>
                          <Progress value={percent} className="h-2" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t mt-4">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => updateBookPage(b.id, b.currentPage + 10, b.totalPages)}
                          >
                            +۱۰ ص
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => updateBookPage(b.id, b.currentPage + 1, b.totalPages)}
                          >
                            +۱
                          </Button>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(b.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-4">
            {courses.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground text-xs border">
                هنوز دوره‌ای ثبت نشده است.
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((c) => {
                  const percent = Math.min(100, Math.round((c.completedLessons / c.totalLessons) * 100));
                  return (
                    <Card key={c.id} className="border shadow-sm p-4 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-sm leading-snug">{c.title}</h4>
                            <p className="text-xs text-muted-foreground">{c.platform}</p>
                          </div>
                          <Badge variant={c.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                            {c.status === "completed" ? "تکمیل" : `${percent}%`}
                          </Badge>
                        </div>

                        <div className="space-y-1 pt-2">
                          <div className="flex justify-between text-xs text-muted-foreground font-mono">
                            <span>درس {c.completedLessons}</span>
                            <span>از {c.totalLessons}</span>
                          </div>
                          <Progress value={percent} className="h-2 bg-indigo-100 dark:bg-indigo-950" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2"
                          onClick={() => updateCourseLesson(c.id, c.completedLessons + 1, c.totalLessons)}
                        >
                          +۱ درس تکمیل شد
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Book Dialog */}
      <Dialog open={openBook} onOpenChange={setOpenBook}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> افزودن کتاب به قفسه
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddBook} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="bTitle">عنوان کتاب</Label>
              <Input
                id="bTitle"
                value={bookForm.title}
                onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                placeholder="مثلاً: عادت‌های اتمی، اثر مرکب"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bAuthor">نویسنده</Label>
              <Input
                id="bAuthor"
                value={bookForm.author}
                onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                placeholder="مثلاً: جیمز کلیر"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bTotal">کل صفحات</Label>
                <Input
                  id="bTotal"
                  type="number"
                  value={bookForm.totalPages}
                  onChange={(e) => setBookForm({ ...bookForm, totalPages: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bCurrent">صفحه فعلی</Label>
                <Input
                  id="bCurrent"
                  type="number"
                  value={bookForm.currentPage}
                  onChange={(e) => setBookForm({ ...bookForm, currentPage: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenBook(false)}>انصراف</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "ثبت..." : "افزودن کتاب"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Course Dialog */}
      <Dialog open={openCourse} onOpenChange={setOpenCourse}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-600" /> افزودن دوره آموزشی
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCourse} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="cTitle">عنوان دوره</Label>
              <Input
                id="cTitle"
                value={courseForm.title}
                onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                placeholder="مثلاً: دوره جامع Next.js 15 و ری‌اکت ۱۹"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cPlatform">پلتفرم / مدرس</Label>
              <Input
                id="cPlatform"
                value={courseForm.platform}
                onChange={(e) => setCourseForm({ ...courseForm, platform: e.target.value })}
                placeholder="مثلاً: یوتیوب، یودمی، مکتب‌خونه"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cTotal">تعداد کل جلسات / درس‌ها</Label>
                <Input
                  id="cTotal"
                  type="number"
                  value={courseForm.totalLessons}
                  onChange={(e) => setCourseForm({ ...courseForm, totalLessons: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cComp">جلسات تکمیل‌شده</Label>
                <Input
                  id="cComp"
                  type="number"
                  value={courseForm.completedLessons}
                  onChange={(e) => setCourseForm({ ...courseForm, completedLessons: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenCourse(false)}>انصراف</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "ثبت..." : "افزودن دوره"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
