export {};

type IncludeData = unknown;

declare global {
    interface Window {
        __BOOT__?: string;
        __DATA__?: IncludeData,
    }
}

type Resource = {
    path: string,
    integrity: string,
};

type Boot = {
    lang: string | null,
    css: Resource[],
    js: Resource[],
    minified_css: string[],
    minified_js: string[],
    includes: IncludeData | null,
    head: string,
    body: string,
};

(async () => {
    document.body.innerText = "loading";
    const boot_url = window.__BOOT__!;
    delete window.__BOOT__;
    const boot_resp = await fetch(boot_url);
    if (!boot_resp.ok) {
        document.body.innerText = "error";
    }
    const boot: Boot = await boot_resp.json();
    if (boot.lang !== null) {
        document.documentElement.setAttribute("lang", boot.lang);
    }
    document.head.innerHTML = boot.head;
    for (const css of boot.minified_css) {
        const el = document.createElement("style");
        el.textContent = css;
        document.head.appendChild(el);
    }
    for (const css of boot.css) {
        const el = document.createElement("link");
        el.setAttribute("rel", "stylesheet");
        el.setAttribute("href", css.path);
        el.setAttribute("integrity", css.integrity);
        el.setAttribute("crossorigin", "anonymous");
        document.head.appendChild(el);
    }
    document.body.innerHTML = boot.body;
    if (boot.includes !== null) {
        window.__DATA__ = boot.includes;
    }
    for (const js of boot.minified_js) {
        const el = document.createElement("script");
        el.textContent = js;
        document.body.appendChild(el);
    }
    for (const js of boot.js) {
        const el = document.createElement("script");
        el.setAttribute("src", js.path);
        el.setAttribute("integrity", js.integrity);
        el.setAttribute("crossorigin", "anonymous");
        document.body.appendChild(el);
    }
})();
