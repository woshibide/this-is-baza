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
  LimitValue: [
    "Typing a number and pressing Enter or leaving the field commits it as that side's limit; the other side is unchanged.",
    "The text -0 (or the typographic −0) clears the limit, which is stored as null and shown as -0.",
    "An invalid entry, such as text, a fraction for a whole-number limit, a minimum above the maximum, or a value outside the valid domain, keeps the stored limit, marks the field aria-invalid=\"true\", and shows the error in a role=\"status\" message.",
    "While a limit is set, dragging the field horizontally or vertically changes it in steps, Shift drags faster and Alt finer, and the minimum can never pass the maximum or leave the valid domain.",
    "A cleared (null) limit cannot be dragged; its field says \"Type a number to set this limit.\" and lacks the number-scrub class.",
    "Focusing the field selects its text and shows the hint that -0 removes the limit, including the valid domain when there is one.",
    "Without an owner callback the limit is kept and updated by the component itself.",
  ],
  LimitsEditor: [
    "The editor is a role=\"group\" labeled \"<label> limits\" with a Min field first, the bounded control (or the axis label) in the middle, and a Max field last.",
    "The layout prop (scalar, rail, axis-x, axis-y) is a class on the editor; changing layout never changes the stored limits.",
    "Committing either field emits the whole limits object with only that side changed.",
    "The minimum can never be set above the maximum, and limits outside the hard domain are rejected with an error message.",
    "Tab moves focus from the Min field through the middle content to the Max field.",
  ],
};
