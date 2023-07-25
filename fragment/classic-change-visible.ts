function change(id: string) {
  var el = document.getElementById(id)!
  el.style.display = (el.style.display !== "block") ? "block" : "none"
}
