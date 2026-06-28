import { create } from "zustand";

const THEMES = [
  "light", "dark", "cupcake", "bumblebee", "emerald", "corporate", "synthwave",
  "retro", "cyberpunk", "valentine", "halloween", "garden", "forest", "aqua",
  "lofi", "pastel", "fantasy", "wireframe", "black", "luxury", "dracula",
  "cmyk", "autumn", "business", "acid", "lemonade", "night", "coffee", "winter",
];

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem("chat-theme") || "dark",
  themes: THEMES,
  wallpaper: localStorage.getItem("chat-wallpaper") || "",

  setTheme: (theme) => {
    localStorage.setItem("chat-theme", theme);
    set({ theme });
  },

  setWallpaper: (wallpaper) => {
    localStorage.setItem("chat-wallpaper", wallpaper);
    set({ wallpaper });
  },
}));
