export const brandColors = {
  primary: "#3F2464",
  primaryDark: "#26123F",
  primarySoft: "#F3EEF8",
  accentGold: "#D4AF37",
  accentOrange: "#C8793D",
  background: "#F7F5F2",
  surface: "#FFFFFF",
  text: "#111827"
} as const;

export const brandAssets = {
  logo: "/branding/connected-hospitality-logo.png",
  favicon: "/favicon.ico",
  favicon32: "/favicon-32x32.png",
  appleTouchIcon: "/apple-touch-icon.png",
  backgrounds: {
    login: "/branding/backgrounds/login-hospitality-tech.jpg",
    dashboard: "/branding/backgrounds/dashboard-hospitality-tech.jpg",
    presales: "/branding/backgrounds/presales-hospitality-tech.jpg"
  },
  graphics: {
    hotelTech: "/branding/backgrounds/connectedos-abstract-hotel-tech.svg",
    networkPattern: "/branding/backgrounds/connectedos-network-pattern.svg",
    goldOrbit: "/branding/backgrounds/connectedos-gold-orbit.svg"
  }
} as const;

export const brandCopy = {
  companyName: "Connected Hospitality",
  platformName: "ConnectedOS",
  tagline: "Where hospitality meets innovation"
} as const;
