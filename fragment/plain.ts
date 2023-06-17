const checkbox = document.getElementById("view-internal-name")! as HTMLInputElement;
const style = (document.styleSheets[0].cssRules[4] as CSSStyleRule).style;
checkbox.onchange = () => {
    style.display = checkbox.checked ? "" : "none";
};
