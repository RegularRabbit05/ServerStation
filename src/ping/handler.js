import { Hono } from 'hono'
import { env } from 'hono/adapter';
const app = new Hono()

function pingHandler(c) {
    function isNumeric(str) {
        if (typeof str != "string") return false;
        return !isNaN(str) && !isNaN(parseFloat(str));
    }

    const { AGENT_VERSION, MIN_VERSION, OUTDATED_TEXT } = env(c);
    let version = c.req.header()["user-agent"] || "unknown";
    if (version === "unknown") {
        return c.text(OUTDATED_TEXT);
    }
    if (version.split('/').length > 1) {
        if (version.split('/')[0] !== AGENT_VERSION) {
            return c.text('pong');
        }
        version = version.split('/')[version.split('/').length - 1];
    }
    if (version === "DEV") {
        return c.text("pong");
    }
    const current = MIN_VERSION.split('.');
    if (current.length !== 2) {
        return c.text("Invalid MIN_VERSION format. Contact an admin.");
    }
    const split = version.split('.');
    if (split.length !== 2) {
        return c.text(OUTDATED_TEXT);
    }
    if (!isNumeric(split[0]) || !isNumeric(split[1])) {
        return c.text(OUTDATED_TEXT);
    }
    if (parseInt(split[0], 10) < parseInt(current[0], 10) || (parseInt(split[0], 10) == parseInt(current[0], 10) && parseInt(split[1], 10) < parseInt(current[1], 10))) {
        return c.text(OUTDATED_TEXT);
    }
    return c.text("pong");
}

async function pingMotdHandler(c) {
    function isNumeric(str) {
        if (typeof str != "string") return false;
        return !isNaN(str) && !isNaN(parseFloat(str));
    }

    const { REPOSITORY, AGENT_VERSION } = env(c);
    const agent = c.req.header()["user-agent"] || "unknown";
    const version = agent.split('/', 2);
    let versionMajor = 0;
    let versionMinor = 0;
    if (version.length === 2) {
        const vSplit = version[1].split('.', 2);
        if (vSplit.length === 2) {
            if (isNumeric(vSplit[0]) && isNumeric(vSplit[1])) {
                versionMajor = parseInt(vSplit[0]);
                versionMinor = parseInt(vSplit[1]);
            } else {
                versionMajor = -1;
            }
        } else if (version[1] === "DEV") {
            return c.text("You are running a dev build. Don't forget to report any issues you might encounter.");
        } else {
            versionMajor = -1;
        }
    }
    if (version.length !== 2 || version[0] !== AGENT_VERSION || versionMajor === -1) return c.text("Couldn't detect version. If you believe this to be an error please file a support ticket");

    const repo = await fetch(REPOSITORY+"storage.json");
    const errorMessage = "There has been a problem connecting to the storage server. The store might not work correctly."
    if (!repo.ok) return c.text(errorMessage, 200);
    const data = (await repo.json()).motd;
    let selectedText = errorMessage;
    for (let versionKey in data) {
        const thisSplit = versionKey.split('.', 2);
        if (thisSplit.length !== 2) continue;
        const thisMajor = parseInt(thisSplit[0]);
        const thisMinor = parseInt(thisSplit[1]);
        if (thisMajor > versionMajor || (thisMajor == versionMajor && thisMinor > versionMinor)) break;
        selectedText = data[versionKey];
    }

    return c.text(selectedText);
}

async function pingAssetsHandler(c) {
    const { ASSETS_URL } = env(c);
    if (ASSETS_URL && ASSETS_URL !== "") {
        const file = await fetch(ASSETS_URL);
        if (!file.ok) return c.text('');
        return c.body(await file.arrayBuffer());
    }
    return c.text('');
}

app.get('', pingHandler)
app.get('/motd', pingMotdHandler)
app.get('/assets', pingAssetsHandler)

export default app