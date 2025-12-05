import type { FontObject } from "@openai/chatkit";

// Lexend font family for ChatKit SDK
// These are the woff2 URLs from Google Fonts for the Lexend family
export const LEXEND_FONT_SOURCES: FontObject[] = [
  // Lexend (body text)
  {
    family: "Lexend",
    src: "https://fonts.gstatic.com/s/lexend/v19/wlptgwvFAVdoq2_F94zlCfv0bz1WCzsX_LBte6KuGEo.woff2",
    weight: 300,
    style: "normal",
    display: "swap",
  },
  {
    family: "Lexend",
    src: "https://fonts.gstatic.com/s/lexend/v19/wlptgwvFAVdoq2_F94zlCfv0bz1WC2kX_LBte6KuGEo.woff2",
    weight: 400,
    style: "normal",
    display: "swap",
  },
  {
    family: "Lexend",
    src: "https://fonts.gstatic.com/s/lexend/v19/wlptgwvFAVdoq2_F94zlCfv0bz1WC1cX_LBte6KuGEo.woff2",
    weight: 500,
    style: "normal",
    display: "swap",
  },
];
