import { map, filter_none } from "https://deno.land/x/option_utils@0.1.0/mod.ts"
import type { Option } from "https://deno.land/x/option_utils@0.1.0/mod.ts"

type ElementAttr = Record<string, Option<string>>;

export type Element = [string, ElementAttr, Node[]];
export type Node = Element | string;

const render_attr = (input: ElementAttr): string =>
  filter_none(Object.entries(input).map(([k, v]) => map(v, v => ` ${k}${v === "" ? "" : `="${v}"`}`))).join("");

export const render_node = (input: Node): string => {
  if (typeof input === "string") {
    return input.replaceAll("\n", "")
  } else {
    const [name, attr, child] = input;
    return `<${name}${render_attr(attr)}>${render_nodes(child)}${["br", "hr"].some(s => name === s) ? "" : `</${name}>`}`
  }
};

export const render_nodes = (input: Node[]): string => filter_none(input).map(render_node).join("");
