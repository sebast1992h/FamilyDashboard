export function normalizeSvgForFont(svgString) {
  if (!svgString) return svgString;
  try {
    let s = svgString;
    // Replace width/height with 1em so SVG scales with font-size
        s = s.replace(/height="[^"]*"/g, 'height="1em"');
        // Ensure a viewBox exists (many icons are 24x24). If missing, add a default.
        if (!/viewBox=/.test(s)) {
            s = s.replace(/<svg([^>]*)>/, (m, attrs) => `<svg${attrs} viewBox="0 0 24 24">`);
        }

        // Normalize colors: force stroke to currentColor and convert hard fills to currentColor
        s = s.replace(/stroke="([^\"]*)"/g, 'stroke="currentColor"');
        // Preserve explicit fill="none", but convert other fills to currentColor so they follow text color
        s = s.replace(/fill="(?!none)([^\"]*)"/g, 'fill="currentColor"');

        // Add inline style to keep SVG aligned and inherit text color
        s = s.replace(/<svg([^>]*)>/, (match, attrs) => {
            if (/style=/.test(attrs)) {
                return `<svg${attrs.replace(/style="([^\"]*)"/, (m, st) => `style="${st};vertical-align:middle;color:inherit;"`)}>`;
            }
            return `<svg${attrs} style="vertical-align:middle;color:inherit;">`;
        });
    return s;
  } catch (e) {
    return svgString;
  }
}
