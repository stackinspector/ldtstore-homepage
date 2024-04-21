const check_domain = (current_domain: string, map: Record<string, string>) => {
    for (const [domain, icpreg] of Object.entries(map)) {
        if (domain === current_domain.substring(current_domain.length - domain.length)) {
            return icpreg;
        }
    }
    return null;
}

const map = {
    "pc.wiki": "鲁ICP备2023022036号",
    "ldtstore.com.cn": "鲁ICP备2021014114号",
}

const current_icpreg = check_domain(location.hostname, map);
const mount = document.getElementById("icpreg-mount");
if (current_icpreg !== null && mount !== null) {
    const el = document.createElement("a");
    el.setAttribute("target", "_blank");
    el.setAttribute("class", "link hidden");
    el.setAttribute("href", "https://beian.miit.gov.cn/");
    const text = document.createElement("span");
    text.textContent = current_icpreg;
    el.appendChild(text);
    mount.appendChild(el);
}

/*
check_domain("ldt.pc.wiki", map)
-> '鲁ICP备2023022036号'
check_domain("s0.ldt.pc.wiki", map)
-> '鲁ICP备2023022036号'
check_domain("ldtstore.com.cn", map)
-> '鲁ICP备2021014114号'
check_domain("ldtstore.com.cn.pc.wiki", map)
-> '鲁ICP备2023022036号'
check_domain("pc.wiki.ldtstore.com.cn", map)
-> '鲁ICP备2021014114号'
check_domain("pc.wiki.example.com", map)
-> null
*/
