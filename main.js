const body = document.documentElement;
const background = document.getElementById("background");
const content = document.getElementById("content");
const major = document.getElementById("major");
const side = document.getElementById("side");

const OFFSET_LIT = 14;
const OFFSET = 32;

const SideState = {
    distance: 300,
    on: false,
    center: false,
    index: -1,
    changing: false,
};

const getTemplateData = (index) => "";

// 左滑返回

let touchX = 0;
let touchY = 0;

window.ontouchstart = (e) => {
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
};

window.ontouchmove = (e) => {
    const y = e.changedTouches[0].clientY;
    if (Math.abs(touchY - y) > 10) {
        sideClose();
    }
};

window.ontouchend = (e) => {
    const x = e.changedTouches[0].clientX;
    if (touchX - x < -40) {
        sideClose();
    }
};

const link = (e) => {
    window.location.href = "https://ldtstore.com.cn/r/" + e;
};

const sideClose = () => {
    SideState.index = -1;
    sideMove(false);
    sideChange(false);
};

const sideMove = (enable) => {
    if (enable === void 0) {
        enable = !SideState.on;
    }
    if (SideState.on !== enable) {
        SideState.on = enable;

        if (SideState.on) {
            content.style.left = -SideState.distance + "px";
            side.style.left = `calc(50% + ${major.clientWidth < 500 ? OFFSET_LIT : OFFSET}em - ${SideState.distance}px)`;
        } else {
            content.style.left = "0";
            side.style.left = `calc(50% + ${major.clientWidth < 500 ? OFFSET_LIT : OFFSET}em)`;
            SideState.index = -1;
        }
    }
};

const sideChange = (enable, index) => {
    if (index != void 0) {
        side.innerHTML = getTemplateData(index);
    }
    side.style.opacity = enable ? 1 : 0;
    major.style.opacity = (SideState.center && enable) ? 0 : 1;
};

const side = (index) => {
    if (!SideState.on) {
        SideState.index = index;
        sideMove(true);
        sideChange(true, SideState.index);
    } else {
        if (SideState.index === index) {
            SideState.index = -1;
            sideMove(false);
            sideChange(false);
        } else {
            SideState.index = index;
            sideChange(false);
        }
    }
};

side.addEventListener("transitionend", (e) => {
    if (e.propertyName === "left") {
        recalculate();
        return;
    } else if (e.propertyName === "opacity") {
        if (side.style.opacity === "0" && SideState.index !== -1) {
            sideChange(true, SideState.index);
        }
    }
    if (SideState.changing) {
        SideState.changing = false;
    }
});

const recalculate = () => {
    // 垂直方向 计算main间距
    let delta = body.clientHeight - content.clientHeight;
    delta = delta < 140 ? 140 : delta;
    delta -= 1;
    side.style.height = `calc(${body.clientHeight - delta}px - 6em)`;
    content.style.marginTop = content.style.marginBottom = delta / 2 + "px";
    side.style.marginTop = side.style.marginBottom = delta / 2 + "px";

    // 水平方向 计算子菜单移动的距离
    delta = body.clientWidth - major.clientWidth - side.clientWidth;
    SideState.center = false;
    if (delta > 0) {
        SideState.distance = major.offsetLeft - delta / 2;
    } else {
        if (major.clientWidth < 500) {
            delta = body.clientWidth - side.clientWidth;
            SideState.center = true;
            SideState.distance = major.clientWidth + major.offsetLeft - delta / 2;
        } else {
            SideState.distance = -delta + major.offsetLeft;
        }
    }
};

window.onresize = () => {
    recalculate();

    if (SideState.on) {
        sideClose();
    } else {
        side.style.left = `calc(50% + ${major.clientWidth < 500 ? OFFSET_LIT : OFFSET}em)`;
    }
};

(() => {
    background.style.backgroundImage = `url('bg/${new Date().getDay()}.webp')`;
    recalculate();
    side.style.transition = "cubic-bezier(.6,0,.4,1) 0.5s";
})();
