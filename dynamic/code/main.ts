export {};

type ToolIndexType = Record<string, {
    single: boolean;
    title: string;
    list: string[];
    cross_list: string[];
    cross_top_list: string[];
}>;

type ToolCategoryType = Record<string, {
    title: string;
    list: string[];
}>;

type ToolAllType = Record<string, string>;

type ToolCrossType = Record<string, Record<string, string>>;

type ToolData = {
    index: ToolIndexType;
    category: ToolCategoryType;
    all: ToolAllType;
    cross: ToolCrossType;
};

type GlobalData = {
    page_type: "home";
} | {
    page_type: "tool";
    tool: ToolData;
};

type MajorId = "tiles" | "category"

declare global {
    var __DATA__: GlobalData | undefined;
    var copy: typeof copyText;
    var side: typeof sideClick;
    var tool: typeof toolSideClick;
    var category: typeof categorySideClick;
    var detail: typeof showDetail;
}

// 本地化常量和数据 防止注入
const DATA = globalThis.__DATA__!;
delete globalThis.__DATA__;

// all
const body = document.body;
const background = document.getElementById("background")!;
const content = document.getElementById("content")!;
const major = document.getElementById("major")!;
const side = document.getElementById("side")!;
// tool only
const search = document.getElementById("search");
const back = document.getElementById("back");
const changeMajor = document.getElementById("change-major");

const clear = (el: Element) => {
    while (el.firstChild) {
        el.removeChild(el.lastChild!);
    }
};

const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
};

const enum LayoutMode {
    PC,
    Pad,
    Phone,
}

type LayoutStateType = {
    mode: LayoutMode,
    /** side的位置 */
    sidePosition: number,
    /** 打开侧边栏时需要移动的距离 */
    distance: number,
    /** 侧边栏居中模式（居中时主栏隐藏） */
    center: boolean,
}

const LayoutState: LayoutStateType = {
    mode: LayoutMode.PC,
    sidePosition: 0,
    distance: 300,
    center: false,
};

type SideStateType = {
    /** 侧边栏是否打开 */
    on: boolean,
    /** 侧边栏当前id */
    id: string | null,
};

const SideState: SideStateType = {
    on: false,
    id: null,
};

type MajorStateType = {
    id: MajorId,
};

const MajorState: MajorStateType = {
    id: "tiles",
};

// 左滑返回
let touchX = 0;
let touchY = 0;
body.ontouchstart = (e: TouchEvent) => {
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
};
body.ontouchend = (e: TouchEvent) => {
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
        globalThis.open("//ldt.pc.wiki/", "_blank");
    };

    changeMajor!.onclick = (e: MouseEvent) => {
        // 用来阻止冒泡
        e.stopPropagation();
        renderToolMajor(MajorState.id === "tiles" ? "category" : "tiles");
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
    content.style.transitionDuration = side.style.transitionDuration = `${time}s`;
};

/**
 * 侧边栏、主栏位置设置
 */
const positionSet = () => {
    if (SideState.on) {
        content.style.left = `${-LayoutState.distance}px`;
        side.style.left = `${LayoutState.sidePosition - LayoutState.distance}px`;
    } else {
        content.style.left = "0";
        side.style.left = `${LayoutState.sidePosition}px`;
    }
};

/**
 * 侧边栏内容设置、透明度修改
 * @param id 要设置为的目标侧边栏id
 */
const sideChange = (id: string | null) => {
    const enable = id !== null;
    if (enable) {
        renderSide(id);
    }
    side.style.opacity = enable ? "1" : "0";

    // 防止横向的在侧边栏展开的情况下还能被点到
    content.style.visibility = side.style.visibility = "visible";
    content.style.opacity = (LayoutState.center && (SideState.id !== null)) ? "0" : "1";

    if (id === "search") {
        // console.log("focus");
        const keyword = document.getElementById("keyword") as HTMLInputElement;
        const inputTrigger = document.getElementById("input-trigger") as HTMLElement;
        inputTrigger.onclick = () => {
            keyword.focus();
        };
        keyword.onkeyup = () => {
            renderSearch(keyword.value);
        };
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
 * 点击侧边栏 (category)
 * @param id 要设置为的目标侧边栏id
 */
const categorySideClick = (id: string) => {
    sideSet(`category-${id}`);
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

    // 展开side的时候防止切换，否则看上去很怪
    if (DATA.page_type === "tool") {
        changeMajor!.style.opacity = id === null ? "1" : "0";
        changeMajor!.style.pointerEvents = id === null ? "all" : "none";
    }

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

side.ontransitionend = (e) => {
    if (e.propertyName === "opacity") {
        // 防止横向的在侧边栏展开的情况下还能被点到
        content.style.visibility = content.style.opacity === "0" ? "hidden" : "visible";
        side.style.visibility = side.style.opacity === "0" ? "hidden" : "visible";
        // 完成切换的操作
        if (side.style.opacity === "0" && SideState.id !== null) {
            sideChange(SideState.id);
        }
    }
};

const cloneTemplate = (template: string) => {
    return (document.getElementById(template) as HTMLTemplateElement).content.cloneNode(true) as DocumentFragment;
};

const renderSide = (id: string) => {
    clear(side);
    if (id.startsWith("tool-") && DATA.page_type === "tool") {
        const name = id.substring("tool-".length);
        const index = DATA.tool.index[name];
        const cross = DATA.tool.cross[name];
        const list = [...index.cross_top_list, ...index.list, ...index.cross_list];
        side.appendChild(cloneTemplate("side-tools-base"));
        const title = side.getElementsByClassName("title")[0] as HTMLElement;
        title.innerText = index.single ? "详情" : index.title;
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
        if (list.length === 1) {
            showDetail(side.getElementsByClassName("item")[0] as HTMLElement);
        }
    } else if (id.startsWith("category-") && DATA.page_type === "tool") {
        const name = id.substring("category-".length);
        const category = DATA.tool.category[name];
        const list = category.list;
        side.appendChild(cloneTemplate("side-tools-base"));
        const content = side.getElementsByClassName("content")[0];
        for (const tool of list) {
            const item = cloneTemplate(`tool-${tool}`).firstElementChild!;
            content.appendChild(item);
        }
        if (list.length === 1) {
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
        clear(content);
        for (const tool of Object.keys(all)) {
            if (tool.toLowerCase().includes(keywordText.toLowerCase())) {
                content.appendChild(cloneTemplate(`tool-${all[tool]}`));
                // showDetail(side.getElementsByClassName("item")[0] as HTMLElement);
                // return;
            }
        }
    }
};

const layout = () => {
    // 判定平台，和css对应
    if (body.clientWidth > 800) {
        LayoutState.mode = LayoutMode.PC;
    } else if (body.clientWidth > 500) {
        LayoutState.mode = LayoutMode.Pad;
    } else {
        LayoutState.mode = LayoutMode.Phone;
    }

    // 计算相对大小
    let scaleW: number;
    let scaleH: number;
    if (LayoutState.mode === LayoutMode.PC) {
        scaleW = body.clientWidth / 1056;
        scaleH = body.clientHeight / 900;
    } else {
        scaleH = body.clientHeight / 800;
        if (LayoutState.mode === LayoutMode.Pad) {
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
        LayoutState.sidePosition = body.clientWidth;
    } else {
        LayoutState.sidePosition = major.clientWidth + delta_major / 2;
    }

    // 计算side移动的距离
    LayoutState.center = false;
    if (delta > 0) {
        LayoutState.distance = major.offsetLeft - delta / 2;
    } else {
        if (major.className === "wide" && delta_major < 1) {
            LayoutState.center = true;
            LayoutState.distance = side.clientWidth + delta_side / 2;
        } else {
            if (delta_side < 200) {
                LayoutState.center = true;
                LayoutState.distance = major.clientWidth + (-major.clientWidth + side.clientWidth) / 2;
            } else {
                LayoutState.distance = -delta + major.offsetLeft;
            }
        }
    }

    // 立即对布局做出响应
    setTransitionDuration(0);
    positionSet();
    if (SideState.on) {
        content.style.opacity = LayoutState.center ? "0" : "1";
        content.style.visibility = content.style.opacity === "0" ? "hidden" : "visible";
    }
};

body.onresize = () => {
    layout();
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

const initCategory = () => {
    const tool_button = document.getElementById("tool-button")!;
    const link_button = document.getElementById("link-button")!;
    const tool_list = document.getElementById("tool-list")!;
    const link_list = document.getElementById("link-list")!;

    tool_button.className = "selected";
    link_list.style.opacity = "0";
    link_list.style.pointerEvents = "none";
    tool_list.onclick = link_list.onclick = (e) => {
        if (
            e.composedPath()[0] === tool_list ||
            e.composedPath()[0] === link_list
        ) {
            sideClose();
        }
    };

    tool_button.onclick = (e: MouseEvent) => {
        e.stopPropagation();
        tool_list.style.opacity = "1";
        tool_list.style.pointerEvents = "all";
        link_list.style.opacity = "0";
        link_list.style.pointerEvents = "none";
        link_button.classList.remove();
        tool_button.className = "selected";
        link_button.className = "";
    };

    link_button.onclick = (e: MouseEvent) => {
        e.stopPropagation();
        tool_list.style.opacity = "0";
        tool_list.style.pointerEvents = "none";
        link_list.style.opacity = "1";
        link_list.style.pointerEvents = "all";
        tool_button.className = "";
        link_button.className = "selected";
    };
};

const renderToolMajor = (id: MajorId) => {
    clear(major);
    major.appendChild(cloneTemplate(`major-${id}`));
    major.className = id === "tiles" ? "wide" : "normal";
    if (id === "category") {
        initCategory();
    }
    MajorState.id = id;
}

const randomIndex = (length: number) => Math.floor(Math.random() * length);

const setBackground = (url: string, blur = false) => {
    background.style.backgroundImage = `url(${url})`;
    background.style.filter = blur ? "blur(5px)" : "unset";
};

const defaultBackground = () => `{{ASSERT}}/image/bg/${randomIndex(7)}.webp`;

globalThis.copy = copyText;
globalThis.side = sideClick;
globalThis.tool = toolSideClick;
globalThis.category = categorySideClick;
if (DATA.page_type === "tool") {
    globalThis.detail = showDetail;
    renderToolMajor("tiles");
}

setBackground(defaultBackground());
layout();
