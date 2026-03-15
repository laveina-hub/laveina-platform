import { type ElementType, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const headingVariantStyles = {
  hero: "font-display text-6xl leading-tight font-medium tracking-normal text-black 2xl:text-14xl xl:text-13xl",
  display: "font-display text-3xl leading-tight font-medium text-white xl:text-9xl",
  section: "font-display text-primary text-7xl font-bold lg:text-12xl",
  sectionLg: "font-display text-primary text-7xl leading-tight font-bold md:text-7xl lg:text-10xl",
  page: "font-display text-primary text-4xl font-medium sm:text-8xl",
  card: "text-text-primary text-lg font-semibold md:text-xl",
} as const;

type HeadingVariant = keyof typeof headingVariantStyles;
type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  variant?: HeadingVariant;
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

const textVariantStyles = {
  body: "font-body text-text-muted text-base leading-relaxed",
  bodyLight: "font-body text-primary-100 text-sm leading-relaxed xl:text-xl",
  subtitle: "font-body text-text-secondary text-lg leading-relaxed md:text-2xl",
  subtitleSm: "font-body text-text-secondary text-xl font-medium 2xl:text-4xl",
  hero: "font-body text-text-muted text-lg font-normal 2xl:text-4xl",
  caption: "font-body text-text-muted text-xs",
  detail: "font-body text-text-secondary text-xs 2xl:text-lg",
  label: "font-body text-text-secondary text-xs font-medium",
  feature: "font-body text-text-muted text-base 2xl:text-2xl",
} as const;

type TextVariant = keyof typeof textVariantStyles;

interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
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
