// Desktop top-nav + FooterInfoBar strip. Kept lean per spec Q1.1
// (desktop = Home / Services / Track / Login).
export const NAV_LINKS = [
  { key: "home" as const, href: "/" },
  { key: "request" as const, href: "/book" },
  { key: "track" as const, href: "/tracking" },
  { key: "howItWorks" as const, href: "/how-it-works" },
  { key: "whyChoose" as const, href: "/why-choose" },
  { key: "about" as const, href: "/about" },
  { key: "contact" as const, href: "/contact" },
] as const;

// Hamburger menu — logged-out order per spec Q1.2.
export const PUBLIC_MENU_LINKS = [
  { key: "home" as const, href: "/" },
  { key: "request" as const, href: "/book" },
  { key: "track" as const, href: "/tracking" },
  { key: "pickupPoints" as const, href: "/pickup-points" },
  { key: "pricing" as const, href: "/pricing" },
  { key: "howItWorks" as const, href: "/how-it-works" },
  { key: "businessSolutions" as const, href: "/coming-soon" },
  { key: "helpSupport" as const, href: "/contact" },
] as const;

// Hamburger menu — logged-in order per spec Q1.2.
export const CUSTOMER_MENU_LINKS = [
  { key: "dashboard" as const, href: "/customer" },
  { key: "request" as const, href: "/book" },
  { key: "myShipments" as const, href: "/customer/shipments" },
  { key: "addresses" as const, href: "/customer/addresses" },
  { key: "billing" as const, href: "/customer/payments" },
  { key: "settings" as const, href: "/customer/profile" },
  { key: "pickupPoints" as const, href: "/pickup-points" },
  { key: "helpSupport" as const, href: "/customer/support" },
] as const;

export const SOCIAL_LINKS = [
  { key: "facebook" as const, icon: "/images/footer-info-bar/icon-facebook.svg", href: "#" },
  { key: "instagram" as const, icon: "/images/footer-info-bar/icon-instagram.svg", href: "#" },
  { key: "twitter" as const, icon: "/images/footer-info-bar/icon-twitter.svg", href: "#" },
  { key: "whatsapp" as const, icon: "/images/footer-info-bar/icon-whatsapp.svg", href: "#" },
] as const;
