/**
 * Post-export script: injects @font-face CSS for icon fonts directly into
 * dist/index.html so they load eagerly on Vercel (static hosting) instead of
 * relying on the JS runtime `useFonts()` hook which can race / fail silently.
 *
 * Run after `npx expo export --platform web`:
 *   node scripts/inject-fonts.js
 */

const fs = require("fs");
const path = require("path");

const DIST = path.resolve(__dirname, "..", "dist");
const FONTS_DIR = path.join(
  DIST,
  "assets",
  "node_modules",
  "@expo",
  "vector-icons",
  "build",
  "vendor",
  "react-native-vector-icons",
  "Fonts"
);

// Map: CSS font-family name  →  file name prefix (before the hash)
const FONT_MAP = {
  Feather: "Feather",
  AntDesign: "AntDesign",
  FontAwesome5_Regular: "FontAwesome5_Regular",
  FontAwesome5_Solid: "FontAwesome5_Solid",
  FontAwesome5_Brands: "FontAwesome5_Brands",
  FontAwesome: "FontAwesome",
  Ionicons: "Ionicons",
  MaterialIcons: "MaterialIcons",
  MaterialCommunityIcons: "MaterialCommunityIcons",
  Entypo: "Entypo",
  EvilIcons: "EvilIcons",
  Octicons: "Octicons",
  SimpleLineIcons: "SimpleLineIcons",
  Foundation: "Foundation",
  Fontisto: "Fontisto",
  Zocial: "Zocial",
};

function findFontFile(prefix) {
  if (!fs.existsSync(FONTS_DIR)) return null;
  const files = fs.readdirSync(FONTS_DIR);
  const match = files.find((f) => f.startsWith(prefix + ".") && f.endsWith(".ttf"));
  if (!match) return null;
  // Return web-root-relative path
  return (
    "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/" +
    match
  );
}

function buildFontFaceCSS() {
  const rules = [];
  for (const [family, prefix] of Object.entries(FONT_MAP)) {
    const src = findFontFile(prefix);
    if (!src) {
      console.warn(`⚠  Font file not found for "${family}" (prefix: ${prefix})`);
      continue;
    }
    rules.push(
      `@font-face { font-family: "${family}"; src: url("${src}") format("truetype"); font-display: swap; }`
    );
  }
  return rules.join("\n");
}

function inject() {
  const indexPath = path.join(DIST, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.error("❌  dist/index.html not found. Run `npx expo export --platform web` first.");
    process.exit(1);
  }

  const css = buildFontFaceCSS();
  if (!css) {
    console.error("❌  No font files found to inject.");
    process.exit(1);
  }

  let html = fs.readFileSync(indexPath, "utf-8");

  // Remove any previous injection
  html = html.replace(/<!-- ICON_FONTS_START -->[\s\S]*?<!-- ICON_FONTS_END -->/g, "");

  const styleTag = `<!-- ICON_FONTS_START -->\n<style id="expo-icon-fonts">\n${css}\n</style>\n<!-- ICON_FONTS_END -->`;

  // Insert right before </head>
  html = html.replace("</head>", `${styleTag}\n</head>`);

  fs.writeFileSync(indexPath, html, "utf-8");
  console.log(`✅  Injected ${Object.keys(FONT_MAP).length} @font-face rules into dist/index.html`);
}

inject();
