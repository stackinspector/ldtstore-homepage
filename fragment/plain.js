const checkbox = document.getElementById("view-internal-name");
const style = document.styleSheets[0].cssRules[4].style;
checkbox.onchange = () => {
    style.display = checkbox.checked ? "" : "none";
};
