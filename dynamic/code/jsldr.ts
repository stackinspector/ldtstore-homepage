export { };

declare global {
    interface Window {
        __BOOT__?: string;
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
    for (const css of boot.css) {
        const el = document.createElement("link");
        el.setAttribute("rel", "stylesheet");
        el.setAttribute("href", css.path);
        el.setAttribute("integrity", css.integrity);
        el.setAttribute("crossorigin", "anonymous");
        document.head.appendChild(el);
    }
    document.body.innerHTML = boot.body;
    for (const js of boot.js) {
        const el = document.createElement("script");
        el.setAttribute("src", js.path);
        el.setAttribute("integrity", js.integrity);
        el.setAttribute("crossorigin", "anonymous");
        document.body.appendChild(el);
    }
})();
