import { type ElementType, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Heading                                                           */
/* ------------------------------------------------------------------ */

const headingVariantStyles = {
  /** Hero headline — 42 px → 108 px on 2xl */
  hero: "font-display text-6xl leading-tight font-medium tracking-normal text-black 2xl:text-14xl xl:text-13xl",
  /** Large display — used for section titles on primary backgrounds (dark) */
  display: "font-display text-3xl leading-tight font-medium text-white xl:text-9xl",
  /** Primary section title — dark blue, 48 px → 72 px */
  section: "font-display text-primary text-7xl font-bold lg:text-12xl",
  /** Section title variant with tighter sizing (used in CTA) */
  sectionLg: "font-display text-primary text-7xl leading-tight font-bold md:text-7xl lg:text-10xl",
  /** Page title — used for top-level page headings */
  page: "font-display text-primary text-4xl font-medium sm:text-8xl",
  /** Card title within tracking/dashboard sections */
  card: "text-text-primary text-lg font-semibold md:text-xl",
} as const;

type HeadingVariant = keyof typeof headingVariantStyles;
type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Visual style variant. */
  variant?: HeadingVariant;
  /** HTML heading level. Defaults to h2. */
  as?: HeadingLevel;
  children: ReactNode;
}

function Heading({
  variant = "section",
  as: Tag = "h2",
  className,
  children,
  ...props
}: HeadingProps) {
  return (
    <Tag className={cn(headingVariantStyles[variant], className)} {...props}>
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/*  Text (paragraphs, body copy, captions)                            */
/* ------------------------------------------------------------------ */

const textVariantStyles = {
  /** Standard body text — muted color, normal weight */
  body: "font-body text-text-muted text-base leading-relaxed",
  /** Body text on dark/primary backgrounds */
  bodyLight: "font-body text-primary-100 text-sm leading-relaxed xl:text-xl",
  /** Secondary body — slightly darker, used for descriptions */
  subtitle: "font-body text-text-secondary text-lg leading-relaxed md:text-2xl",
  /** Smaller subtitle — used in EcoPartner, feature descriptions */
  subtitleSm: "font-body text-text-secondary text-xl font-medium 2xl:text-4xl",
  /** Hero subtext */
  hero: "font-body text-text-muted text-lg font-normal 2xl:text-4xl",
  /** Caption / helper text */
  caption: "font-body text-text-muted text-xs",
  /** Small detail text — used for status, distances */
  detail: "font-body text-text-secondary text-xs 2xl:text-lg",
  /** Label text — used for form labels, field headers */
  label: "font-body text-text-secondary text-xs font-medium",
  /** Feature list item text */
  feature: "font-body text-text-muted text-base 2xl:text-2xl",
} as const;

type TextVariant = keyof typeof textVariantStyles;

interface TextProps extends HTMLAttributes<HTMLElement> {
  /** Visual style variant. */
  variant?: TextVariant;
  /** HTML element to render. Defaults to p. */
  as?: ElementType;
  children: ReactNode;
}

function Text({ variant = "body", as: Tag = "p", className, children, ...props }: TextProps) {
  return (
    <Tag className={cn(textVariantStyles[variant], className)} {...props}>
      {children}
    </Tag>
  );
}

export {
  Heading,
  Text,
  type HeadingProps,
  type HeadingVariant,
  type HeadingLevel,
  type TextProps,
  type TextVariant,
};
