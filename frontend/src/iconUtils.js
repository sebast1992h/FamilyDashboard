export function normalizeSvgForFont(svgString) {
  if (!svgString) return svgString;
  try {
    let s = svgString;
    // Replace width/height with 1em so SVG scales with font-size
    s = s.replace(/width="[^"]*"/g, 'width="1em"');
    s = s.replace(/height="[^"]*"/g, 'height="1em"');
    // Ensure svg has vertical-align style for better baseline alignment
    s = s.replace(/<svg([^>]*)>/, (match, attrs) => {
      if (/style=/.test(attrs)) {
        return `<svg${attrs.replace(/style="([^"]*)"/, (m, st) => `style="${st};vertical-align:middle"`)}>`;
      }
      return `<svg${attrs} style="vertical-align:middle">`;
    });
    return s;
  } catch (e) {
    return svgString;
  }
}
