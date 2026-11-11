import type { Metadata } from "next";
import Link from "next/link";
import { Cairo } from "next/font/google";
import { currentUser } from "@/lib/supabase/server";
import { signOut } from "./actions";
import "./globals.css";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo" });

const TITLE = "Car Exit | موافقات المصريين بالخارج";
const DESCRIPTION =
  "موافقات مبادرة سيارات المصريين بالخارج في مكان واحد. اعرض موافقتك أو ابحث عن موافقة حسب الدولة، بدون سمسار وبدون عمولة.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://carexit.app"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Car Exit",
    locale: "ar_EG",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Car Exit: موافقات مبادرة سيارات المصريين بالخارج" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og.png"] },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user } = await currentUser().catch(() => ({ user: null }));
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="min-h-screen font-sans antialiased">
        <header className="border-b border-stone-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
            <Link href="/" className="flex flex-col items-center leading-tight text-brand-700">
              <span dir="ltr" className="text-lg font-extrabold">🚗 Car Exit</span>
              <span className="text-xs font-bold text-brand-600">كار إكزت</span>
            </Link>
            <div className="ms-auto flex items-center gap-2 text-sm">
              <Link href="/dashboard" className="px-1 py-2 font-semibold text-stone-700 hover:text-brand-700">
                السوق
              </Link>
              <Link href="/listings/new" className="btn-primary px-3 py-2 text-sm">
                + أضف إعلان
              </Link>
              {user ? (
                <>
                  <Link href="/me" className="btn-ghost px-3 py-2 text-sm">
                    حسابي
                  </Link>
                  <form action={signOut} className="hidden sm:block">
                    <button className="px-2 py-2 text-stone-500 hover:text-stone-800">خروج</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="btn-ghost px-3 py-2 text-sm">
                  دخول
                </Link>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-10 pt-4 text-xs leading-6 text-stone-500">
          <p>
            الموقع مساحة إعلانات مجانية فقط، ولا يتدخل في أي اتفاق ولا يتقاضى عمولة. راجع أي اتفاق مع محامٍ
            قبل دفع أي مبلغ. <Link href="/safety" className="underline">نصائح الأمان</Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
