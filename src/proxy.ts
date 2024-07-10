const proxies = [
    {
        protocol: "http",
        host: "209.38.175.14",
        port: 31112,
        auth: {
            username: "ksjuwhdx",
            password: "Aw58GNzhyKrk3V5d",
        },
    },
    {
        protocol: "http",
        host: "209.38.175.14",
        port: 31112,
        auth: {
            username: "ksjuwhdx",
            password: "Aw58GNzhyKrk3V5d",
        },
    },
];

export function getProxy() {
    const randomIndex = Math.floor(Math.random() * proxies.length);
    return proxies[randomIndex];
}
