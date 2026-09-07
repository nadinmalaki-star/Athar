import type { CustomerFingerprint, InteractionEventType } from '../lib/database.types';

const EVENT_LABELS: Record<InteractionEventType, string> = {
  viewed_service: 'فتحت صفحة خدمة',
  viewed_price: 'فتحت صفحة السعر',
  app_opened: 'فتحت التطبيق',
  message_sent: 'أرسلت رسالة',
  message_replied: 'ردت على رسالة',
  booking_created: 'حجزت موعد',
  booking_rescheduled: 'أجّلت الحجز',
  booking_cancelled: 'ألغت الحجز',
  booking_completed: 'أكملت الموعد',
};

export function eventLabel(type: InteractionEventType): string {
  return EVENT_LABELS[type];
}

// Turns the raw numbers from `customer_fingerprints` into the short Arabic
// sentences the UI shows — kept in one place so the customer list, the
// detail screen, and the "ليش هيك؟" screen never say three different things
// about the same customer.

export function relativeTimeAr(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `قبل ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 1) return 'اليوم';
  if (days === 1) return 'قبل يوم';
  if (days < 30) return `قبل ${days} يوم`;
  const months = Math.floor(days / 30);
  if (months === 1) return 'قبل شهر';
  return `قبل ${months} أشهر`;
}

export function summaryFor(fp: CustomerFingerprint): string {
  switch (fp.status) {
    case 'follow_up':
      return 'مهتمة وبتتفاعل بنشاط الأيام الأخيرة — فرصة منيحة تتابعي معها.';
    case 'price_blocker':
      return 'مهتمة وبتتفاعل بانتظام، بس بتتوقف دايماً عند خطوة السعر أو التأكيد.';
    case 'lost_interest':
      return 'ما في تفاعل من فترة طويلة — غالباً الوقت مش مناسب إلها هلق.';
    case 'wait':
    default:
      return 'ما في مؤشر عاجل هلق. اتركيها لهسا وتابعي إذا صار تفاعل جديد.';
  }
}

export function shortReason(fp: CustomerFingerprint): string {
  switch (fp.status) {
    case 'lost_interest':
      return `بدون تفاعل من ${fp.days_since_last_interaction} يوم`;
    case 'price_blocker':
      return `شافت صفحة السعر ${fp.price_views_14d} مرات، ولسا في حجز معلّق`;
    case 'follow_up':
      return `${fp.recent_activity_3d} من الأحداث خلال آخر 3 أيام`;
    case 'wait':
    default:
      return `آخر تفاعل ${relativeTimeAr(fp.last_interaction_at)}`;
  }
}

// The plain-language rule checklist behind one classification, for the
// transparency screen. Every line here maps directly to a clause in the
// `customer_fingerprints` view (supabase/migrations/0001_init.sql) — if you
// change a threshold there, mirror it here.
export interface RuleCheck {
  met: boolean;
  text: string;
  value: string;
}

export function rulesFor(fp: CustomerFingerprint): { title: string; rules: RuleCheck[]; note: string } {
  switch (fp.status) {
    case 'lost_interest':
      return {
        title: 'ليش صنفناها "فقدت الاهتمام"؟',
        rules: [
          {
            met: true,
            text: 'ما في أي تفاعل من 10 أيام أو أكتر',
            value: `آخر تفاعل قبل ${fp.days_since_last_interaction} يوم`,
          },
        ],
        note: 'إذا رجعت تتفاعل (تفتح خدمة، ترد على رسالة، تحجز)، التصنيف رح يتغير تلقائياً بأول تفاعل جديد.',
      };
    case 'price_blocker':
      return {
        title: 'ليش صنفناها "السعر عائق"؟',
        rules: [
          {
            met: fp.price_views_14d >= 3,
            text: 'فتحت صفحة السعر 3 مرات أو أكتر خلال أسبوعين',
            value: `القيمة الفعلية: ${fp.price_views_14d} مرات`,
          },
          {
            met: fp.days_since_last_interaction < 10,
            text: 'لسا ما انقطعت عن التطبيق أو الرسائل بالكامل',
            value: `آخر تفاعل قبل ${fp.days_since_last_interaction} يوم`,
          },
          {
            met: fp.open_bookings > 0 || fp.has_cancelled_booking,
            text: 'عندها حجز معلّق أو ملغي بعد ما شافت السعر',
            value: fp.has_cancelled_booking ? 'في حجز ملغي' : `${fp.open_bookings} حجز معلّق`,
          },
        ],
        note: `لو ما رجعت تتفاعل خلال 10 أيام من هلق، التصنيف رح يتغير تلقائياً لـ"فقدت الاهتمام".`,
      };
    case 'follow_up':
      return {
        title: 'ليش صنفناها "تابعي الآن"؟',
        rules: [
          {
            met: fp.recent_activity_3d > 0,
            text: 'في نشاط (تصفح، رسالة، أو حجز) خلال آخر 3 أيام',
            value: `${fp.recent_activity_3d} من الأحداث`,
          },
        ],
        note: 'هاي الحالة مؤقتة — لو ما صار نشاط جديد، بترجع تتصنّف "انتظري" بعد بضعة أيام.',
      };
    case 'wait':
    default:
      return {
        title: 'ليش صنفناها "انتظري"؟',
        rules: [
          {
            met: true,
            text: 'ما في نشاط عاجل هلق، بس لسا ضمن أول 10 أيام من آخر تفاعل',
            value: `آخر تفاعل قبل ${fp.days_since_last_interaction} يوم`,
          },
        ],
        note: 'هاي الحالة الافتراضية لما ما في إشارة واضحة على اهتمام عاجل أو انقطاع.',
      };
  }
}
