// UNICEF Official Brand Colors
export const UNICEF_COLORS = {
  primary: "#1CABE2",       // UNICEF Blue
  dark: "#002147",          // Deep Navy
  navy: "#374EA2",          // Medium Navy
  cyan: "#00AEEF",          // Bright Cyan
  orange: "#F26A21",        // Accent Orange
  yellow: "#FFC20E",        // Accent Yellow
  green: "#80BD41",         // Accent Green
  red: "#E2231A",           // Alert Red
  lightBlue: "#E8F6FD",     // Light bg
  lightGray: "#F5F7FA",     // Page bg
  gray: "#6B7280",
  darkGray: "#374151",
  white: "#FFFFFF",
  border: "#E5E7EB",
};

export const antdTheme = {
  token: {
    colorPrimary: UNICEF_COLORS.primary,
    colorLink: UNICEF_COLORS.primary,
    colorSuccess: UNICEF_COLORS.green,
    colorWarning: UNICEF_COLORS.yellow,
    colorError: UNICEF_COLORS.red,
    colorInfo: UNICEF_COLORS.cyan,
    borderRadius: 8,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 14,
    colorBgContainer: "#ffffff",
    colorBgLayout: UNICEF_COLORS.lightGray,
  },
  components: {
    Layout: {
      siderBg: UNICEF_COLORS.dark,
      triggerBg: "#001529",
      headerBg: "#ffffff",
    },
    Menu: {
      darkItemBg: UNICEF_COLORS.dark,
      darkSubMenuItemBg: "#001529",
      darkItemSelectedBg: UNICEF_COLORS.primary,
      darkItemHoverBg: "rgba(28,171,226,0.15)",
      darkItemColor: "rgba(255,255,255,0.75)",
      darkItemSelectedColor: "#ffffff",
    },
    Card: {
      borderRadius: 12,
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    },
    Button: {
      borderRadius: 6,
      controlHeight: 38,
    },
  },
};

// Chart color palette
export const CHART_COLORS = [
  "#1CABE2", "#374EA2", "#80BD41", "#F26A21",
  "#FFC20E", "#E2231A", "#00AEEF", "#9B59B6",
  "#2ECC71", "#E67E22",
];

// Map color scale for India states
export const MAP_COLOR_SCALE = [
  "#E8F6FD", "#B3E3F7", "#7ECEF0", "#1CABE2",
  "#1590C0", "#0E6A90", "#094D69",
];
