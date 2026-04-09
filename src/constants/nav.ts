export const NAV_LINKS = [
  { key: "home" as const, href: "/" },
  { key: "request" as const, href: "/book" },
  { key: "track" as const, href: "/tracking" },
  { key: "howItWorks" as const, href: "/how-it-works" },
  { key: "whyChoose" as const, href: "/why-choose" },
  { key: "about" as const, href: "/about" },
  { key: "contact" as const, href: "/contact" },
] as const;

export const SOCIAL_LINKS = [
  { key: "facebook" as const, icon: "/images/footer-info-bar/icon-facebook.svg", href: "#" },
  { key: "instagram" as const, icon: "/images/footer-info-bar/icon-instagram.svg", href: "#" },
  { key: "twitter" as const, icon: "/images/footer-info-bar/icon-twitter.svg", href: "#" },
  { key: "whatsapp" as const, icon: "/images/footer-info-bar/icon-whatsapp.svg", href: "#" },
] as const;
