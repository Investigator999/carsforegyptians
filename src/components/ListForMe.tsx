import { whatsappLink, normalizePhone } from "@/lib/listings";

const MESSAGE = `السلام عليكم، عايز تعرضوا موافقتي على Car Exit
الاسم:
الدولة:
تاريخ انتهاء الموافقة:
المدفوع (دولار):
الوديعة (دولار):
الكاش المطلوب (دولار):`;

/** The site owner's WhatsApp (NEXT_PUBLIC_OWNER_WHATSAPP), or null when not set. */
export function ownerWhatsapp() {
  return normalizePhone(process.env.NEXT_PUBLIC_OWNER_WHATSAPP ?? "");
}

/** "We'll list it for you" — opens WhatsApp to the site owner with a ready form to fill in. */
export function ListForMe({ variant = "card" }: { variant?: "card" | "hero" }) {
  const phone = ownerWhatsapp();
  if (!phone) return null;
  const href = whatsappLink(phone, MESSAGE);

  if (variant === "hero") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="btn border border-white/40 text-white hover:bg-white/10"
        data-testid="list-for-me"
      >
        💬 اعرضها لي على واتساب
      </a>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm leading-7" data-testid="list-for-me">
      <p className="font-bold text-brand-700">مش فاضي تعمل حساب؟</p>
      <p className="mb-3 text-stone-700">ابعتلنا بيانات موافقتك على واتساب، وإحنا نعرضها لك على الموقع مجانًا.</p>
      <a href={href} target="_blank" rel="noopener noreferrer" className="btn-primary">
        💬 اعرضها لي على واتساب
      </a>
    </div>
  );
}
