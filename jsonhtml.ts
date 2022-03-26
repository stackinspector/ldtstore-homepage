type ElementAttr = Record<string, string | undefined>;

export type Element = [string, ElementAttr, Node[]];

export type NonVoidNode = Element | string;
export type Node = NonVoidNode | undefined;

const filter_undefined = <T>(input: (T | undefined)[]): T[] => input.filter(x => x !== void 0) as T[];

const render_attr = (input: ElementAttr): string =>
  filter_undefined(Object.entries(input).map(([k, v]) => v === void 0 ? void 0 : ` ${k}${v === "" ? "" : `="${v}"`}`)).join("");

export const render_nonvoid_node = (input: NonVoidNode): string => {
  if (typeof input === "string") {
    return input.replaceAll("\n", "")
  } else {
    const [name, attr, child] = input;
    return `<${name}${render_attr(attr)}>${render_nodes(child)}${["br", "hr"].some(s => name === s) ? "" : `</${name}>`}`
  }
};

export const render_nodes = (input: Node[]): string => filter_undefined(input).map(render_nonvoid_node).join("");
