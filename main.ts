import type { GlobalData } from "./shared.ts";

declare global {
    interface Window {
        __DATA__?: GlobalData;
        copy?: typeof copy;
        side?: typeof sideClick;
        tool?: typeof toolSideClick;
        detail?: typeof showDetail;
    }
}

// 本地化常量和数据 防止注入
const DATA = window.__DATA__!;
delete window.__DATA__;

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

const copy = (text: string) => {
    navigator.clipboard.writeText(text);
};

const enum LayoutMode {
    PC,
    Pad,
    Phone,
}

let layoutMode = LayoutMode.PC;

/** 与recalculate有关的数据 */
const RecalculateState = {
    /** side的位置 */
    sidePosition: 0,
    /** 打开侧边栏时需要移动的距离 */
    distance: 300,
    /** 侧边栏居中模式（居中时主栏隐藏） */
    center: false,
};

const SideState = {
    /** 侧边栏是否打开 */
    on: false,
    /** 侧边栏当前id */
    id: null as string | null,
};

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

// 点击背景事件绑定
content.onclick = background.onclick = (e) => {
    if (
        e.composedPath()[0] === content ||
        e.composedPath()[0] === background
    ) {
        sideClose();
    }
};

// 右上角图标事件绑定 (tool only)
if (DATA.page_type === "tool") {
    search!.onclick = (e: MouseEvent) => {
        // 用来阻止冒泡
        e.stopPropagation();
        sideSet("search");
    };

    back!.onclick = (e: MouseEvent) => {
        // 用来阻止冒泡
        e.stopPropagation();
        window.open("/", "_blank");
    };
}

/**
 * 侧边栏移动
 * @param enable true开启 false关闭
 */
const sideMove = (enable: boolean) => {
    if (SideState.on !== enable) {
        SideState.on = enable;

        if (!enable) {
            SideState.id = null;
        }
        positionSet();
    }
};

const setTransitionDuration = (time = 0.4) => {
    offset.style.transitionDuration = side.style.transitionDuration = `${time}s`;
};

/**
 * 侧边栏、主栏位置设置
 */
const positionSet = () => {
    if (SideState.on) {
        offset.style.left = `${-RecalculateState.distance}px`;
        side.style.left = `${RecalculateState.sidePosition - RecalculateState.distance}px`;
    } else {
        offset.style.left = "0";
        side.style.left = `${RecalculateState.sidePosition}px`;
    }
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
    offset.style.visibility = side.style.visibility = "visible";
    if (RecalculateState.center) {
        offset.style.opacity = SideState.id === null ? "1" : "0";
    } else {
        offset.style.opacity = "1";
    }

    if (id === "search") {
        // console.log("focus");
        const keyword = document.getElementById("keyword") as HTMLInputElement;
        const inputTrigger = document.getElementById("inputTrigger") as HTMLElement;
        inputTrigger.onclick = () => {
            keyword.focus();
        };
        keyword.addEventListener("keyup", () => {
            renderSearch(keyword.value);
        });
        keyword.focus();
    }
};

/**
 * 点击侧边栏
 * @param id 要设置为的目标侧边栏id
 */
const sideClick = (id: string) => {
    sideSet(id);
};

/**
 * 点击侧边栏 (tool)
 * @param id 要设置为的目标侧边栏id
 */
const toolSideClick = (id: string) => {
    sideSet(`tool-${id}`);
};

/**
 * 关闭侧边栏
 */
const sideClose = () => {
    sideSet(null);
};

/**
 * 设置侧边栏
 * @param id 要设置为的目标侧边栏id，null时关闭侧边栏
 */
const sideSet = (id: string | null) => {
    setTransitionDuration();

    if (id === null) {
        // 1 关闭
        SideState.id = null;
        sideMove(false);
        sideChange(null);
        return;
    }

    if (!SideState.on) {
        // 2 直接打开
        SideState.id = id;
        sideMove(true);
        sideChange(SideState.id);
    } else {
        if (SideState.id === id) {
            // 3 两次点击 关闭
            sideSet(null);
        } else {
            // 4 点击另一个 切换
            SideState.id = id;
            sideChange(null);
        }
    }
};

side.addEventListener("transitionend", (e) => {
    if (e.propertyName === "opacity") {
        // 防止横向的在侧边栏展开的情况下还能被点到
        offset.style.visibility = offset.style.opacity === "0" ? "hidden" : "visible";
        side.style.visibility = side.style.opacity === "0" ? "hidden" : "visible";
        // 完成切换的操作
        if (side.style.opacity === "0" && SideState.id !== null) {
            sideChange(SideState.id);
        }
    }
});

const cloneTemplate = (template: string) => {
    return (document.getElementById(template) as HTMLTemplateElement).content.cloneNode(true) as DocumentFragment;
};

const renderSide = (id: string) => {
    while (side.firstChild) {
        side.removeChild(side.lastChild!);
    }
    if (id.startsWith("tool-") && DATA.page_type === "tool") {
        const name = id.substring(5);
        const index = DATA.tool.index[name];
        const cross = DATA.tool.cross[name];
        const list = [...index.list, ...index.cross_list];
        const single = list.length === 1;
        side.appendChild(cloneTemplate("side-tools-base"));
        const title = side.getElementsByClassName("title")[0] as HTMLElement;
        title.innerText = single ? "详情" : index.title;
        const content = side.getElementsByClassName("content")[0];
        for (const tool of list) {
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
    if (DATA.page_type === "tool") {
        const all = DATA.tool.all;
        const content = document.getElementById("search-content")!;
        while (content.firstChild) {
            content.removeChild(content.lastChild!);
        }
        for (const tool of Object.keys(all)) {
            if (tool.toLowerCase().includes(keywordText.toLowerCase())) {
                content.appendChild(cloneTemplate(`tool-${all[tool]}`));
                // showDetail(side.getElementsByClassName("item")[0] as HTMLElement);
                // return;
            }
        }
    }
};

const recalculate = () => {
    // 判定平台，和css对应
    if (body.clientWidth > 800) {
        layoutMode = LayoutMode.PC;
    } else if (body.clientWidth > 500) {
        layoutMode = LayoutMode.Pad;
    } else {
        layoutMode = LayoutMode.Phone;
    }

    // 计算相对大小
    let scaleW: number;
    let scaleH: number;
    if (layoutMode === LayoutMode.PC) {
        scaleW = body.clientWidth / 1056;
        scaleH = body.clientHeight / 900;
    } else {
        scaleH = body.clientHeight / 800;
        if (layoutMode === LayoutMode.Pad) {
            scaleW = body.clientWidth / 600;
        } else {
            scaleW = body.clientWidth / 450;
        }
    }
    body.style.fontSize = `${Math.min(scaleH, scaleW)}em`;

    // 水平方向：重写的距离计算
    const delta_major = body.clientWidth - major.clientWidth;
    const delta_side = body.clientWidth - side.clientWidth;
    const delta = body.clientWidth - major.clientWidth - side.clientWidth;
    // 计算side的位置，保证其在major右边，并且最多不超过屏幕宽度
    if (delta_major < 0) {
        RecalculateState.sidePosition = body.clientWidth;
    } else {
        RecalculateState.sidePosition = major.clientWidth + delta_major / 2;
    }

    // 计算side移动的距离
    RecalculateState.center = false;
    if (delta > 0) {
        RecalculateState.distance = major.offsetLeft - delta / 2;
    } else {
        if (DATA.page_type === "tool" && delta_major < 1) {
            RecalculateState.center = true;
            RecalculateState.distance = side.clientWidth + delta_side / 2;
        } else {
            if (delta_side < 200) {
                RecalculateState.center = true;
                RecalculateState.distance = major.clientWidth + (-major.clientWidth + side.clientWidth) / 2;
            } else {
                RecalculateState.distance = -delta + major.offsetLeft;
            }
        }
    }

    // 立即对布局做出响应
    setTransitionDuration(0);
    positionSet();
    if (SideState.on) {
        offset.style.opacity = RecalculateState.center ? "0" : "1";
        offset.style.visibility = offset.style.opacity === "0" ? "hidden" : "visible";
    }
};

window.onresize = () => {
    recalculate();
};

/**
 * item展开
 * @param e 操作的item
 */
const showDetail = (e: HTMLElement) => {
    // console.log(e);
    const content = e.getElementsByClassName("detail-container")[0] as HTMLElement;
    const icon = e.getElementsByClassName("icon-line")[0] as HTMLElement;
    const height = e.getElementsByClassName("detail")[0].clientHeight;

    if (content.style.height === "") {
        // 第一次操作
        content.style.height = "0px";
    }
    // 使用百分比高度-无法应用渐变动画，不使用百分比高度-无法自适应行数变化
    // 这里只能投机取巧在无法被察觉的情况下进行切换
    if (content.style.height === "100%") {
        // 展开 -> 关闭
        content.style.transitionDuration = ".01s";
        content.style.height = `${height}px`;
        content.ontransitionend = () => {
            content.style.transitionDuration = ".3s";
            content.style.height = "0px";
        };
        icon.style.transform = "rotate(0deg)";
    }
    if (content.style.height === "0px") {
        // 关闭 -> 展开
        content.style.transitionDuration = ".3s";
        content.style.height = `${height}px`;
        content.ontransitionend = () => {
            content.style.height = "100%";
        };
        icon.style.transform = "rotate(90deg)";
    }
};

/*
const renderDispatchBanner = () => {
    const msg = {
        "?fw=intl": "检测到你的IP地址不在中国大陆，已调度到国际站。",
        "?fw=intl-root": "检测到你的IP地址不在中国大陆，已调度到国际站。",
        "?fw=emerg-root": "由于国内站遭受攻击，已调度到国际站。",
    }[location.search];
    if (msg === void 0) return;
}
*/

window.copy = copy;
window.side = sideClick;
window.tool = toolSideClick;
if (DATA.page_type === "tool") {
    window.detail = showDetail;
}

background.style.backgroundImage = `url('{{IMAGE}}/bg/${Math.floor(Math.random() * 7)}.webp')`;

recalculate();
