// Behavior rules per component for the Jev parity review, taken from the references and the Vue sources.
// Each rule is one checkable statement about what a recording should show.

export const RULES = {
  Icon: [
    "The icon is an svg with a 0 0 24 24 viewBox that is hidden from assistive technology with aria-hidden=\"true\".",
    "The pause icon is drawn as two rounded rectangles; every other icon is a single path whose d attribute is the icon's Lucide path data.",
  ],
  GraphicPanel: [
    "The graphic content sits in a graphic-content region, which gets the flush class only when the flush prop is set.",
    "The footer region is rendered only when footer content is supplied.",
    "Supplementary fields sit in a details disclosure labeled \"Exact values\" that is collapsed when the panel first renders.",
    "Clicking the \"Exact values\" summary toggles the disclosure open and closed.",
  ],
};
