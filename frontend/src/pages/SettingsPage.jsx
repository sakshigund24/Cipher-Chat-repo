import { useThemeStore } from "../store/useThemeStore.js";
import { Palette, Monitor, Sun, Moon, Image } from "lucide-react";

const PREVIEW_THEMES = [
  { name: "light", label: "Light", icon: Sun },
  { name: "dark", label: "Dark", icon: Moon },
  { name: "cupcake", label: "Cupcake", icon: Palette },
  { name: "synthwave", label: "Synthwave", icon: Monitor },
  { name: "forest", label: "Forest", icon: Palette },
  { name: "luxury", label: "Luxury", icon: Palette },
  { name: "dracula", label: "Dracula", icon: Moon },
  { name: "night", label: "Night", icon: Moon },
  { name: "coffee", label: "Coffee", icon: Palette },
  { name: "cyberpunk", label: "Cyberpunk", icon: Monitor },
  { name: "valentine", label: "Valentine", icon: Palette },
  { name: "aqua", label: "Aqua", icon: Palette },
];

const WALLPAPERS = [
  { label: "None", value: "" },
  { label: "Bubbles", value: "https://www.transparenttextures.com/patterns/subtle-dots.png" },
  { label: "Stripes", value: "https://www.transparenttextures.com/patterns/diagonal-stripes-sm.png" },
  { label: "Grid", value: "https://www.transparenttextures.com/patterns/grid.png" },
];

const SettingsPage = () => {
  const { theme, setTheme, wallpaper, setWallpaper, themes } = useThemeStore();

  return (
    <div className="min-h-screen pt-20 pb-10 bg-base-200">
      <div className="max-w-2xl mx-auto px-4 space-y-6">

        {/* Theme Section */}
        <div className="bg-base-100 rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-bold text-lg">Theme</h2>
              <p className="text-sm text-base-content/60">Choose your preferred color theme</p>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {PREVIEW_THEMES.map(({ name, label }) => (
              <button
                key={name}
                onClick={() => setTheme(name)}
                data-theme={name}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all hover:scale-105
                  ${theme === name ? "border-primary shadow-md" : "border-base-300 hover:border-primary/40"}`}
              >
                <div className="flex gap-1">
                  {["bg-primary", "bg-secondary", "bg-accent", "bg-neutral"].map((c) => (
                    <span key={c} className={`w-3 h-3 rounded-full ${c}`} />
                  ))}
                </div>
                <span className="text-xs font-medium">{label}</span>
                {theme === name && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* All themes dropdown */}
          <div className="mt-4">
            <label className="label"><span className="label-text font-medium">All Themes</span></label>
            <select
              className="select select-bordered w-full"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              {themes.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Wallpaper Section */}
        <div className="bg-base-100 rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Image className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-bold text-lg">Chat Wallpaper</h2>
              <p className="text-sm text-base-content/60">Customize your chat background</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {WALLPAPERS.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => setWallpaper(value)}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all hover:scale-105
                  ${wallpaper === value ? "border-primary shadow-md" : "border-base-300"}
                  ${value ? "" : "bg-base-200"}`}
                style={value ? { backgroundImage: `url(${value})`, backgroundSize: "cover" } : {}}
              >
                <span className={value ? "bg-base-100/80 px-2 py-0.5 rounded-lg" : ""}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-base-100 rounded-2xl shadow-lg p-6">
          <h2 className="font-bold text-lg mb-4">Preview</h2>
          <div
            className="rounded-xl p-4 space-y-3 min-h-32 border border-base-300"
            style={wallpaper ? { backgroundImage: `url(${wallpaper})`, backgroundSize: "cover" } : {}}
          >
            <div className="flex gap-2 justify-start">
              <div className="bg-base-200 rounded-2xl rounded-bl-none px-4 py-2 text-sm max-w-xs">
                Hey! How are you? 👋
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <div className="bg-primary text-primary-content rounded-2xl rounded-br-none px-4 py-2 text-sm max-w-xs">
                Doing great, thanks! 😊
              </div>
            </div>
            <div className="flex gap-2 justify-start">
              <div className="bg-base-200 rounded-2xl rounded-bl-none px-4 py-2 text-sm max-w-xs">
                Cipher Chat is awesome! 🔒
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
