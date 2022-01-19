declare const PAGE_TYPE: "home" | "tool";

const body = document.documentElement;
const background = document.getElementById("background")!;
const content = document.getElementById("content")!;
const offset = document.getElementById("offset")!;
const major = document.getElementById("major")!;
const side = document.getElementById("side")!;

const searchState: {
    count: number,  //input事件计数器，用来
    lastList: string[]  //列表增删字符串索引
} = {
    count: 0,
    lastList: []
}

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
    lastid: string | null,
    changing: boolean,
} = {
    distance: 300,
    on: false,
    center: false,
    id: null,
    lastid: null,
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
        sideReturn();
    }
};

content.onclick = background.onclick = (e) => {
    // 背景点击事件绑定位置变了，这里用来阻止冒泡
    if (
        e.composedPath()[0] === content ||
        e.composedPath()[0] === background
    ) {
        sideReturn();
    }
};

/**
 * 关闭侧边栏
 */
const sideClose = () => {
    sideSet(null);
};

/**
 * 侧边栏返回上一级
 */
const sideReturn = () => {
    sideSet(SideState.lastid);
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
            offset.style.left = -SideState.distance + "px";
            side.style.left = `calc(50% + ${layoutMode === LayoutMode.PC ? OFFSET : OFFSET_LIT}em - ${SideState.distance}px)`;
        } else {
            offset.style.left = "0";
            side.style.left = `calc(50% + ${layoutMode === LayoutMode.PC ? OFFSET : OFFSET_LIT}em)`;
            SideState.id = null;
        }
    }
};

/**
 * 侧边栏内容设置、透明度修改
 * @param id 要设置为的目标侧边栏id
 */
const sideChange = (id: string | null) => {
    const enable = id !== null;
    if (enable) {
        while (side.firstChild) {
            side.removeChild(side.lastChild!);
        }
        side.appendChild((document.getElementById("side-" + id) as HTMLTemplateElement).content.cloneNode(true));

        if (document.getElementById("list-" + id)) {
            let list_hide = document.getElementById("list-" + id) as HTMLElement;
            let list_content = side.getElementsByClassName("content")[0] as HTMLInputElement;
            for (let i = 0; i < list_hide.childNodes.length; i++) {
                const element = list_hide.childNodes[i] as HTMLTemplateElement;
                list_content.appendChild(element.content.cloneNode(true));
            }
        }
    }
    side.style.opacity = enable ? "1" : "0";

    // 防止横向的在侧边栏展开的情况下还能被点到
    major.style.visibility = "visible";
    side.style.visibility = "visible";
    if (SideState.center) {
        // 解决点标题major会闪回一次的问题
        if (enable) {
            major.style.opacity = "0";
        } else {
            if (SideState.id != null) {
                major.style.opacity = "0";
            } else {
                major.style.opacity = "1";
            }
        }
    }

    if (id === "search") {
        // console.log("focus");
        searchState.lastList = ["请输入关键字"];
        let input = side.getElementsByClassName("search")[0] as HTMLInputElement;
        input.focus();
        input.addEventListener("input", search_onchange)
    }
};

/**
 * 点击侧边栏
 * @param id 要设置为的目标侧边栏id
 */
const sideClick = (id: string) => {
    sideSet(id);
};

if (PAGE_TYPE === "tool") {
    const search = document.getElementById("search")!;

    /**
     * 点击搜索栏
     */
    search.onclick = (e: MouseEvent) => {
        // 用来阻止冒泡
        e.stopPropagation();
        sideSet("search");
    };
}

/**
 * 设置侧边栏
 * @param id 要设置为的目标侧边栏id，null时关闭侧边栏
 */
const sideSet = (id: string | null) => {
    if (id === null) {
        SideState.id = null;
        SideState.lastid = null;
        sideMove(false);
        sideChange(null);
        return;
    }

    if (id.includes("second")) {
        SideState.lastid = SideState.id;
        // console.warn(id, SideState.id);
    } else {
        SideState.lastid = null;
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

side.addEventListener("transitionend", (e: TransitionEvent) => {
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
    content.style.width = body.clientWidth + "px";
    content.style.height = body.clientHeight + "px";

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
    major.style.fontSize = side.style.fontSize = Math.min(scaleH, scaleW) + "em";

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
    if (e.parentElement.classList.contains("noexpand")) {
        return;
    }
    console.log(e)
    const content = e.getElementsByClassName("detail-container")[0] as HTMLElement;
    const icon = e.getElementsByClassName("icon-line")[0] as HTMLElement;
    if (content.clientHeight !== 0) {
        content.style.height = 0 + "px";
        icon.style.transform = "rotate(0deg)";
    } else {
        const height = e.getElementsByClassName("detail")[0].clientHeight;
        content.style.height = height + "px";
        icon.style.transform = "rotate(90deg)";
    }
};


type relation = {
    name: string
    keywords: string
}

const search_onchange = (e: any) => {
    setTimeout(() => {
        search_callback(++searchState.count,e.srcElement.value as string)
    }, 500);
}

const search_callback = (count: number, value: string) => {
    if (count === searchState.count) {
        search(value.toLowerCase());
    }
}

const search = (value: string) => {
    let search_list = window.test;

    value = value.replace("-","").replace(" ","");

    let result_content = side.getElementsByClassName("content")[0] as HTMLElement;
    if(value === ""){
        result_content.innerHTML = "<div class='text'>请输入关键字</div>"
        searchState.lastList = ["请输入关键字"];
        return;
    }
    
    let list: string[] = [];
    for (let i = 0; i < search_list.length; i++) {
        const relation = search_list[i];
        
        if (search_list[i].keywords.indexOf(value) !== -1) {
            list.push(relation.name);
        }
    }

    
    if(list.length === 0){
        result_content.innerHTML = "<div class='text'>什么都没有找到呢<br><br>┑(￣Д ￣)┍</div>"
        searchState.lastList = ["什么都没有找到呢"];
    }
    else{
        searchAppend(result_content,list);
    }
}

const searchAppend = (result_content : HTMLElement,arr: string[]) => {

    let i = 0;
    while (i < searchState.lastList.length) {
        const str = searchState.lastList[i];
        if (arr.indexOf(str) === -1) {
            result_content.removeChild(result_content.children[i]);
            searchState.lastList.splice(i, 1);
        }
        else {
            i++
        }
    }
    i = 0;
    while (i < arr.length) {
        const str = arr[i];
        if (str !== searchState.lastList[i]) {
            let template = document.getElementById("item-" + str) as HTMLTemplateElement
            if (i < searchState.lastList.length) {
                result_content.insertBefore(template.content.cloneNode(true), result_content.children[i]);
            }
            else {
                result_content.appendChild(template.content.cloneNode(true));
            }
            searchState.lastList.splice(i, 0, str);
        }
        i++
    }
}

interface Window {
    test: relation[];
    copy?: typeof copy;
    side?: typeof sideClick;
    detail?: typeof showDetail;
}

window.copy = copy;
window.side = sideClick;
window.detail = showDetail;

background.style.backgroundImage = `url('/assert/image/bg/${Math.floor(Math.random() * 7)}.webp')`;

recalculate();
