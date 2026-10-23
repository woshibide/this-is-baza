// Geometry in content, primary actions/readouts in footer, optional exact entry in fields (collapsed by default).
// content, footer, and fields take a node or an array of nodes; omitting footer or fields omits its region.
import { checkProps, h, toggle, children } from "../dom.js";

const SLOT = [Node, Array];
const SPEC = {
  flush: { type: Boolean },
  content: { type: SLOT },
  footer: { type: SLOT },
  fields: { type: SLOT },
};
const nodes = (slot) => [slot ?? []].flat();

export function createGraphicPanel(given) {
  let props = checkProps("GraphicPanel", SPEC, given);
  const content = h("div", { class: "graphic-content" });
  const footer = h("div", { class: "graphic-footer" });
  const fieldsContent = h("div", { class: "exact-values-content" });
  const fields = h("details", { class: "graphic-footer exact-values" }, h("summary", null, "Exact values"), fieldsContent);
  const element = h("div", { class: "graphic-panel" }, content);
  function render() {
    toggle(content, "flush", props.flush);
    children(content, nodes(props.content));
    children(footer, nodes(props.footer));
    children(fieldsContent, nodes(props.fields));
    children(element, [content, props.footer && footer, props.fields && fields]);
  }
  render();
  return {
    element,
    update(partial) {
      props = checkProps("GraphicPanel", SPEC, partial, props);
      render();
    },
    destroy() {},
  };
}
