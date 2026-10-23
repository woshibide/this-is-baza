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
  NumberField: [
    "Typing a valid number emits it immediately; an invalid draft (out of range, off the step grid, or empty) is marked aria-invalid=\"true\" and is not emitted.",
    "Enter, Escape, or leaving the field replaces an invalid draft with the current valid value and clears aria-invalid.",
    "Dragging the field changes the value in steps: right or up increases, left or down decreases, and it stays within the effective limits.",
    "With editable limits, the value is clamped into new limits when they change and on first render, unless the limits are managed by a parent.",
    "With managed limits, the editable limits are validated against limitMin and limitMax instead of the field's own min and max.",
    "A value longer than seven characters in a bounded field is shown with a 12px font.",
    "A disabled field cannot be dragged and emits nothing.",
    "Stepper content is placed before and after the input, and Tab order runs from the decrease content through the input to the increase content.",
  ],
  SliderControl: [
    "The decrease and increase buttons change the value by one step, snapped to the step grid without float error, and clamped to the effective bounds.",
    "The decrease button is disabled at the effective minimum and the increase button at the effective maximum.",
    "The buttons are labeled \"Decrease <label>\" and \"Increase <label>\" and keep keyboard focus after being pressed.",
    "Dragging or typing the number and editing the Min and Max bounds behave as in NumberField, sharing the same bounds as the buttons.",
    "Narrowing the bounds clamps the value into them; clearing a bound with -0 removes that limit.",
    "With a heading, the section shows the heading and a one-line hint and is labeled by the heading; without one it is labeled by the label.",
    "Without an owner for the bounds, the slider keeps its default bounds of 1 to 24 itself.",
  ],
  ChoiceControl: [
    "Alignment is a segmented group of three radios (Left, Center, Right) sharing one name unique to the instance; exactly one is checked.",
    "Choosing an alignment by click or arrow keys emits the whole choices object with only align changed.",
    "The Shape select emits the object with only shape changed, and the Fill shape checkbox with only fill changed.",
    "Each segment shows a check icon with the selection-check class, and keyboard focus moves Alignment, then Shape, then Fill shape.",
  ],
  ColorEditor: [
    "The trigger shows the color over a checkerboard with its #RRGGBBAA code and opens the picker popover; with hideTrigger there is no trigger and open() shows the picker.",
    "Dragging or clicking the saturation and brightness plane sets saturation from x and brightness from y, clamped to 0 to 100, and emits the new hex with alpha unchanged.",
    "On the plane, left and right arrows change saturation and up and down change brightness by 1, or by 10 with Shift.",
    "The hue slider changes the hue while keeping saturation and brightness, and the opacity slider changes only alpha, from 0 to 1 in hundredths.",
    "A gray or black color keeps the previously chosen hue.",
    "Exact HSL, RGBA, and HEX fields commit on Enter or blur; a six-digit hex keeps alpha, an eight-digit hex sets it; an invalid entry keeps the color, marks the field aria-invalid=\"true\", and shows an example of the expected format.",
    "Escape in an exact field discards the draft without committing.",
    "A copy button reports in a role=\"status\" message whether the value was copied, and keeps focus.",
    "Dragging the picker heading moves the popover, kept at least 8 pixels inside the window; the Close button hides it.",
  ],
};
