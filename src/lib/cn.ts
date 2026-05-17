/** 合并 Tailwind 类名，过滤 falsy 值 */
export const cn = (...classes: (string | undefined | false | null)[]) =>
  classes.filter(Boolean).join(" ");
