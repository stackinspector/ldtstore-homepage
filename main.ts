import type { ToolIndexType, ToolCrossType, ToolAllType } from "./shared.ts";

declare const PAGE_TYPE: "home" | "tool";

// all
const body = document.documentElement;
const background = document.getElementById("background")!;
const content = document.getElementById("content")!;
const offset = document.getElementById("offset")!;
const major = document.getElementById("major")!;
const side = document.getElementById("side")!;
// tool only
const search = document.getElementById("search");
const back = document.getElementById("back");

// json随js加载，无需担心通过dom注入

const load_json = (id: string) => {
    const el = document.getElementById(id);
    return el === null ? null : JSON.parse(el.innerText);
}

const tools_index = load_json("tools_index")
const tools_all = load_json("tools_all");
const tools_cross = load_json("tools_cross");

const OFFSET_LIT = 13;
// TODO 这里的长度和major中的left一样 添加新的pagetype记得修改这里
const OFFSET = {
    "home": 33,
    "tool": 38,
}[PAGE_TYPE];

const copy = (text: string) => {
    navigator.clipboard.writeText(text);
};

const enum LayoutMode {
    PC,
    Pad,
    Phone,
}

let layoutMode = LayoutMode.PC;

const SideState: {
    distance: number,
    on: boolean,
    center: boolean,
    id: string | null,
    changing: boolean,
} = {
    distance: 300,
    on: false,
    center: false,
    id: null,
    changing: false,
};

// 在手机端输入框弹出的时候锁定缩放计算 避免画面抖动
let searchFocus = false;

// 左滑返回
let touchX = 0;
let touchY = 0;

window.ontouchstart = (e: TouchEvent) => {
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
};

window.ontouchend = (e: TouchEvent) => {
    const x = e.changedTouches[0].clientX;
    const y = e.changedTouches[0].clientY;
    if (touchX - x < -40 && (Math.abs((touchY - y) / (touchX - x)) < .2)) {
        sideClose();
    }
};

content.onclick = background.onclick = (e) => {
    // 背景点击事件绑定位置变了，这里用来阻止冒泡
    if (
        e.composedPath()[0] === content ||
        e.composedPath()[0] === background
    ) {
        sideClose();
    }
};

/**
 * 关闭侧边栏
 */
const sideClose = () => {
    sideSet(null);
};

/**
 * 侧边栏移动
 * @param enable true开启 false关闭
 */
const sideMove = (enable: boolean) => {
    if (SideState.on !== enable) {
        SideState.on = enable;
        SideState.changing = true;

        if (enable) {
            offset.style.left = `${-SideState.distance}px`;
            side.style.left = `calc(50% + ${layoutMode === LayoutMode.PC ? OFFSET : OFFSET_LIT}em - ${SideState.distance}px)`;
        } else {
            offset.style.left = "0";
            side.style.left = `calc(50% + ${layoutMode === LayoutMode.PC ? OFFSET : OFFSET_LIT}em)`;
            SideState.id = null;
        }
    }
};

const cloneTemplate = (template: string) => {
    return (document.getElementById(template) as HTMLTemplateElement).content.cloneNode(true) as DocumentFragment;
};

const renderSide = (id: string) => {
    while (side.firstChild) {
        side.removeChild(side.lastChild!);
    }
    if (id.startsWith("tool-")) {
        const name = id.substring(5);
        const index = (tools_index! as ToolIndexType)[name];
        const cross = (tools_cross! as ToolCrossType)[name];
        const single = index.list.length === 1;
        side.appendChild(cloneTemplate("side-tools-base"));
        const title = side.getElementsByClassName("title")[0] as HTMLElement;
        title.innerText = single ? "详情" : index.title;
        const content = side.getElementsByClassName("content")[0];
        for (const tool of index.list) {
            const item = cloneTemplate(`tool-${tool}`).firstElementChild!;
            const cross_notice = cross?.[tool];
            if (cross_notice !== void 0) {
                const p = document.createElement("p");
                p.innerHTML = cross_notice;
                item.getElementsByClassName("detail")[0].appendChild(p);
            }
            content.appendChild(item);
        }
        if (single) {
            showDetail(side.getElementsByClassName("item")[0] as HTMLElement);
        }
    } else {
        side.appendChild(cloneTemplate(`side-${id}`));
    }
};

const renderSearch = (keywordText: string) => {
    const all = tools_all! as ToolAllType;
    const content = document.getElementById("search-content")!;
    while (content.firstChild) {
        content.removeChild(content.lastChild!);
    }
    for (const tool of Object.keys(all)) {
        if (tool.toLowerCase().includes(keywordText.toLowerCase())) {
            // console.log(`OK at ${keywordText}`)
            content.appendChild(cloneTemplate(`tool-${all[tool]}`));
            // showDetail(side.getElementsByClassName("item")[0] as HTMLElement);
            // return;
        }
    }
    // console.log(`NO at ${keywordText}`)
};

/**
 * 侧边栏内容设置、透明度修改
 * @param id 要设置为的目标侧边栏id
 */
const sideChange = (id: string | null) => {
    const enable = id !== null;
    if (enable) {
        renderSide(id!);
    }
    side.style.opacity = enable ? "1" : "0";

    // 防止横向的在侧边栏展开的情况下还能被点到
    major.style.visibility = side.style.visibility = "visible";
    if (SideState.center) {
        // 解决点标题major会闪回一次的问题
        if (enable) {
            major.style.opacity = "0";
        } else {
            if (SideState.id !== null) {
                major.style.opacity = "0";
            } else {
                major.style.opacity = "1";
            }
        }
    }

    if (id === "search") {
        // console.log("focus");
        const keyword = document.getElementById("keyword") as HTMLInputElement;
        // keyword.focus();
        keyword.addEventListener("keyup", () => {
            renderSearch(keyword.value);
        });
    }
};

/**
 * 点击侧边栏
 * @param id 要设置为的目标侧边栏id
 */
const sideClick = (id: string) => {
    sideSet(id);
};

const toolSideClick = (id: string) => {
    sideSet(`tool-${id}`);
};

if (PAGE_TYPE === "tool") {
    /**
     * 点击搜索栏
     */
    search!.onclick = (e: MouseEvent) => {
        // 用来阻止冒泡
        e.stopPropagation();
        sideSet("search");
    };

    back!.onclick = (e: MouseEvent) => {
        // 用来阻止冒泡
        e.stopPropagation();
        location.href = "/";
    };
}

/**
 * 设置侧边栏
 * @param id 要设置为的目标侧边栏id，null时关闭侧边栏
 */
const sideSet = (id: string | null) => {
    if (id === null) {
        SideState.id = null;
        sideMove(false);
        sideChange(null);
        return;
    }

    if (!SideState.on) {
        // 直接打开
        SideState.id = id;
        sideMove(true);
        sideChange(SideState.id);
        searchFocus = id === "search";
    } else {
        if (SideState.id === id) {
            // 两次点击 关闭
            SideState.id = null;
            sideMove(false);
            sideChange(null);
            searchFocus = false;
        } else {
            // 点击另一个 切换
            SideState.id = id;
            sideChange(null);
            searchFocus = id === "search";
        }
    }
};

side.addEventListener("transitionend", (e) => {
    if (e.propertyName === "opacity") {
        if (major.style.opacity === "0") {
            // 防止透明后还能被点到
            major.style.visibility = "hidden";
        }
        if (side.style.opacity === "0") {
            side.style.visibility = "hidden";
        }
    }
    if (e.propertyName === "left") {
        recalculate();
        if (SideState.changing) {
            SideState.changing = false;
        }
    } else if (e.propertyName === "opacity") {
        if (side.style.opacity === "0" && SideState.id !== null) {
            sideChange(SideState.id);
        }
    }
});

const recalculate = () => {
    if (searchFocus) {
        return;
    }

    // 判定平台，和css对应
    if (body.clientWidth > 800) {
        layoutMode = LayoutMode.PC;
    } else if (body.clientWidth > 500) {
        layoutMode = LayoutMode.Pad;
    } else {
        layoutMode = LayoutMode.Phone;
    }

    // 设置遮罩大小为窗口大小
    content.style.width = `${body.clientWidth}px`;
    content.style.height = `${body.clientHeight}px`;

    // 计算相对大小
    let scaleW: number;
    let scaleH: number;
    if (layoutMode === LayoutMode.PC) {
        scaleW = body.clientWidth / 1056;
        scaleH = body.clientHeight / 900;
    } else {
        scaleH = body.clientHeight / 880;
        if (layoutMode === LayoutMode.Pad) {
            scaleW = body.clientWidth / 600;
        } else {
            scaleW = body.clientWidth / 450;
        }
    }
    major.style.fontSize = side.style.fontSize = `${Math.min(scaleH, scaleW)}em`;

    // 垂直方向：计算major的间距
    let delta = body.clientHeight - major.clientHeight;
    delta = delta < 120 ? 120 : delta;
    delta -= 4;
    side.style.height = `calc(${body.clientHeight - delta}px - 6em)`;
    major.style.marginTop = side.style.marginTop = major.style.marginBottom = side.style.marginBottom = delta / 2 + "px";

    // 水平方向：计算side移动的距离
    delta = body.clientWidth - major.clientWidth - side.clientWidth;
    SideState.center = false;
    if (delta > 0) {
        SideState.distance = major.offsetLeft - delta / 2;
    } else {
        const delta2 = body.clientWidth - major.clientWidth;
        // TODO 添加新的pagetype记得修改这里
        if (PAGE_TYPE === "tool" && delta2 < 1) {
            SideState.center = true;
            delta = body.clientWidth - side.clientWidth;
            SideState.distance = side.offsetLeft - delta / 2;
        } else {
            if (layoutMode === LayoutMode.Phone) {
                delta = body.clientWidth - side.clientWidth;
                SideState.center = true;
                SideState.distance = major.clientWidth + major.offsetLeft - delta / 2;
            } else {
                SideState.distance = -delta + major.offsetLeft;
            }
        }
    }
};

window.onresize = () => {
    if (searchFocus) {
        return;
    }

    recalculate();

    if (SideState.on) {
        SideState.id = null;
        sideClose();
    } else {
        side.style.left = `calc(50% + ${layoutMode === LayoutMode.PC ? OFFSET : OFFSET_LIT}em)`;
    }
};

const showDetail = (e: HTMLElement) => {
    // console.log(e);
    const content = e.getElementsByClassName("detail-container")[0] as HTMLElement;
    const icon = e.getElementsByClassName("icon-line")[0] as HTMLElement;
    if (content.clientHeight !== 0) {
        content.style.height = "0px";
        icon.style.transform = "rotate(0deg)";
    } else {
        const height = e.getElementsByClassName("detail")[0].clientHeight;
        content.style.height = `${height}px`;
        icon.style.transform = "rotate(90deg)";
    }
};

declare global {
    interface Window {
        copy?: typeof copy;
        side?: typeof sideClick;
        tool?: typeof toolSideClick;
        detail?: typeof showDetail;
    }
}

window.copy = copy;
window.side = sideClick;
window.tool = toolSideClick;
window.detail = showDetail;

background.style.backgroundImage = `url('{{IMAGE}}/bg/${Math.floor(Math.random() * 7)}.webp')`;

recalculate();
