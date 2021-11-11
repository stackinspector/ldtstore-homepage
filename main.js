const body = document.documentElement;
const main = document.getElementById("main-container");
const menu = document.getElementById("menu-container");
const submenu = document.getElementById("submenu-container");
const background = document.getElementById("background")

let submenu_distance = 300;
let submenu_on = false;
let submenu_center = false;
let submenu_index = -1;
let submenu_changing = false;

const offsetLit = 14;
const offset = 32;

const getTemplateData = (index) => ""

// 左滑返回
let touchX = 0;
let touchY = 0;

window.ontouchstart = (e) => {
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
}

window.ontouchmove = (e) => {
    let y = e.changedTouches[0].clientY;
    if (Math.abs(touchY - y) > 10) {
        closeSubmenu();
    }
    ;
}

window.ontouchend = (e) => {
    let x = e.changedTouches[0].clientX;
    if (touchX - x < -40) {
        closeSubmenu();
    }
    ;
}

const link = (e) => {
    window.location.href = "https://ldtstore.com.cn/r/" + e;
}

const closeSubmenu = () => {
    submenu_index = -1;
    submenuMove(false);
    submenuChange(false);
}

const submenuMove = (enable) => {
    if (enable === void 0) {
        enable = !submenu_on;
    }
    if (submenu_on !== enable) {
        submenu_on = enable;

        if (submenu_on) {
            main.style.left = -submenu_distance + "px";
            submenu.style.left = `calc(50% + ${menu.clientWidth < 500 ? offsetLit : offset}em - ${submenu_distance}px)`;
        } else {
            main.style.left = "0";
            submenu.style.left = `calc(50% + ${menu.clientWidth < 500 ? offsetLit : offset}em)`;
            submenu_index = -1;
        }
    }
}
const submenuChange = (enable, index) => {
    if (index != undefined) {
        submenu.innerHTML = getTemplateData(index);
    }
    submenu.style.opacity = enable ? 1 : 0;
    menu.style.opacity = (submenu_center && enable) ? 0 : 1;
}

const change = (index) => {
    if (!submenu_on) {
        submenu_index = index;
        submenuMove(true);
        submenuChange(true, submenu_index);
    } else {
        if (submenu_index === index) {
            submenu_index = -1;
            submenuMove(false);
            submenuChange(false);
        } else {
            submenu_index = index;
            submenuChange(false);
        }
    }
}

submenu.addEventListener("transitionend", (e) => {
    if (e.propertyName === "left") {
        recalculate();
        return;
    } else if (e.propertyName === "opacity") {
        if (submenu.style.opacity === "0" && submenu_index !== -1) {
            submenuChange(true, submenu_index);
        }
    }
    if (submenu_changing) {
        submenu_changing = false;
    }
    ;
});


// 布局计算
const recalculate = () => {
    // 垂直方向 计算main间距
    let delta = body.clientHeight - main.clientHeight;
    delta = delta < 140 ? 140 : delta;
    delta -= 1;
    let height = body.clientHeight - delta;
    submenu.style.height = `calc(${height}px - 6em)`;
    main.style.marginTop = main.style.marginBottom = delta / 2 + "px";
    submenu.style.marginTop = submenu.style.marginBottom = delta / 2 + "px";

    // 水平方向 计算子菜单移动的距离
    delta = body.clientWidth - menu.clientWidth - submenu.clientWidth;
    submenu_center = false;
    if (delta > 0) {
        submenu_distance = menu.offsetLeft - delta / 2;
    } else {
        if (menu.clientWidth < 500) {
            delta = body.clientWidth - submenu.clientWidth;
            submenu_center = true;
            submenu_distance = menu.clientWidth + menu.offsetLeft - delta / 2;
        } else {
            submenu_distance = -delta + menu.offsetLeft;
        }
    }
}

window.onresize = () => {
    recalculate();

    if (submenu_on) {
        //缩回菜单
        closeSubmenu();
    } else {
        submenu.style.left = `calc(50% + ${menu.clientWidth < 500 ? offsetLit : offset}em)`;
    }
};

(() => {
    let d = new Date();
    background.style.backgroundImage = `url('bg/${d.getDay()}.webp')`
    recalculate();
    submenu.style.transition = "cubic-bezier(.6,0,.4,1) 0.5s";
})();
