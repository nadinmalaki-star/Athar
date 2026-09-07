// Design tokens — mirrors the palette used in the "بصمة تفاعل العميلة" design
// mockup (customer fingerprint screens), kept in one place so it stays a
// single source of truth as the app grows past this first pass.

export const colors = {
  bg: '#FAF8F3',
  surface: '#FFFFFF',
  border: '#E9E4DA',
  text: '#1C1815',
  textDim: '#847C70',
  textFaint: '#B3AB9E',

  ember: '#E8531F',
  emberBg: '#FDECE3',
  emberBorder: '#F5C6AC',

  wait: '#4C6A93',
  waitBg: '#EAF0F7',
  waitBorder: '#C6D6E8',

  amber: '#A5730A',
  amberBg: '#FBF0DA',
  amberBorder: '#EAD097',

  lost: '#8A8377',
  lostBg: '#F0EEE8',
  lostBorder: '#DCD7CB',

  good: '#3F7A4D',
  goodBg: '#E9F3EA',

  danger: '#B3261E',
  dangerBg: '#FBEAE9',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 14,
  pill: 999,
};

export const fontSizes = {
  xs: 12,
  sm: 13,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 26,
};

// Arabic-first, RTL app: this table is the single source of truth for the
// fingerprint statuses everywhere (list badges, detail header, filters) so a
// screen never hardcodes its own copy of these labels/colors.
export type FingerprintStatus = 'follow_up' | 'wait' | 'price_blocker' | 'lost_interest';

export const statusMeta: Record<
  FingerprintStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  follow_up: { label: 'تابعي الآن', color: colors.ember, bg: colors.emberBg, border: colors.emberBorder },
  wait: { label: 'انتظري', color: colors.wait, bg: colors.waitBg, border: colors.waitBorder },
  price_blocker: { label: 'السعر عائق', color: colors.amber, bg: colors.amberBg, border: colors.amberBorder },
  lost_interest: { label: 'فقدت الاهتمام', color: colors.lost, bg: colors.lostBg, border: colors.lostBorder },
};
