/**
 * Print styles for a printout page: hide the app around <main> (sidebar, phone header and bottom
 * bar, banners) by hiding everything that isn't <main> or one of its ancestors, then print black
 * on white with the hairlines kept visible. `root` is the printout's wrapper class; `extra` adds
 * page-specific rules inside the same @media print block.
 */
export function printCss(root: string, extra = ""): string {
  return `
@media print {
  @page { size: letter portrait; margin: 0.5in; }
  html, body { background: #fff !important; }
  *:has(> * > #main) { display: block !important; min-height: 0 !important; padding: 0 !important; }
  *:has(> * > #main) > :not(:has(#main)) { display: none !important; }
  *:has(> #main) { padding: 0 !important; }
  *:has(> #main) > :not(#main) { display: none !important; }
  #main { max-width: none !important; margin: 0 !important; padding: 0 !important; }
  .${root}, .${root} * { color: #000 !important; box-shadow: none !important; }
  .${root} .print-rule { border-color: #8c8c8c !important; }
  .${root} .print-hair { border-color: #c8c8c8 !important; }
${extra}
}
`;
}
