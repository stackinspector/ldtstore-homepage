const get_controller_style = (id: string) => ((document.getElementById(id)! as HTMLStyleElement).sheet!.cssRules[0] as CSSStyleRule).style;

const view_internal_name = document.getElementById("view-internal-name")! as HTMLInputElement;
const internal_name_style = get_controller_style("view-internal-name-control");
view_internal_name.onchange = () => {
    internal_name_style.display = view_internal_name.checked ? "unset" : "none";
};

const view_notice = document.getElementById("view-notice")! as HTMLInputElement;
const notice_style = get_controller_style("view-notice-control");
view_notice.onchange = () => {
    notice_style.display = view_notice.checked ? "inherit" : "none";
};

const switch_color_scheme = document.getElementById("switch-color-scheme")! as HTMLInputElement;
const body = document.body;
switch_color_scheme.onchange = () => {
    body.className = switch_color_scheme.checked ? "inverted" : "";
}
