import { is_some, filter_none } from "https://deno.land/x/option_utils@0.1.0/mod.ts"
import type { Option } from "https://deno.land/x/option_utils@0.1.0/mod.ts"

export const filter_none_attr = <T>(input: Record<string, Option<T>>): Record<string, T> =>
  Object.fromEntries(Object.entries(input).filter(([_, v]) => is_some(v))) as Record<string, T>;

type ElementAttr = Record<string, string>;

export type Element = [string, ElementAttr, Node[]];
export type Node = Element | string;

const render_attr = (input: ElementAttr): string =>
  Object.entries(input).map(([k, v]) => ` ${k}${v === "" ? "" : `="${v}"`}`).join("");

export const render_node = (input: Node): string => {
  if (typeof input === "string") {
    return input.replaceAll("\n", "")
  } else if (Array.isArray(input)) {
    const [name, attr, child] = input;
    return `<${name}${render_attr(attr)}>${render_nodes(child)}${["br", "hr"].some(s => name === s) ? "" : `</${name}>`}`
  } else {
    throw new Error("not vaild node");
  }
};

export const render_nodes = (input: Node[]): string => filter_none(input).map(render_node).join("");
