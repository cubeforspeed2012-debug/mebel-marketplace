// Type system - every face is bundled from Fontsource (no render-time network,
// so farm renders are offline-safe and byte-identical):
//  - Archivo Expanded Black (variable, wdth 125 / wght 900): the heavy extended
//    grotesque for the hook, strobe and lockup - Druk Wide / Monument Extended
//    territory, but a true extended cut, never a CSS scaleX fake.
//  - Syne 800: display headlines.
//  - Space Grotesk: labels and body. JetBrains Mono: tabular readouts.
// @remotion/fonts holds the render (delayRender) until each face is decoded.

import { loadFont } from '@remotion/fonts';
import archivoVariable from '@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2';
import syneVariable from '@fontsource-variable/syne/files/syne-latin-wght-normal.woff2';
import spaceGroteskVariable from '@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2';
import jetBrainsMonoVariable from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2';

const FAMILIES = {
  display: 'Archivo Expanded',
  syne: 'Syne Variable',
  grotesk: 'Space Grotesk Variable',
  mono: 'JetBrains Mono Variable',
} as const;

loadFont({ family: FAMILIES.display, url: archivoVariable, weight: '100 900', stretch: '62% 125%', format: 'woff2' });
loadFont({ family: FAMILIES.syne, url: syneVariable, weight: '400 800', format: 'woff2' });
loadFont({ family: FAMILIES.grotesk, url: spaceGroteskVariable, weight: '300 700', format: 'woff2' });
loadFont({ family: FAMILIES.mono, url: jetBrainsMonoVariable, weight: '100 800', format: 'woff2' });

export const FONTS = {
  display: `'${FAMILIES.display}', '${FAMILIES.syne}', sans-serif`,
  syne: `'${FAMILIES.syne}', sans-serif`,
  grotesk: `'${FAMILIES.grotesk}', sans-serif`,
  mono: `'${FAMILIES.mono}', ui-monospace, monospace`,
} as const;

/** Extended black - the hook / strobe / lockup face. */
export const EXTENDED_BLACK: React.CSSProperties = {
  fontFamily: FONTS.display,
  fontWeight: 900,
  fontStretch: '125%',
  fontVariationSettings: "'wdth' 125, 'wght' 900",
};
