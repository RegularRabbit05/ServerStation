import { Hono } from 'hono'
import { env } from 'hono/adapter';
import { Octokit } from "octokit";
const app = new Hono()

async function fetchUpdate(c) {
    function isNumeric(str) {
        if (typeof str != "string") return false;
        return !isNaN(str) && !isNaN(parseFloat(str));
    }

    const { UPDATE_URL, UPDATE_KEY } = env(c);
    let apiData = await new Octokit({
        auth: UPDATE_KEY
    }).request(UPDATE_URL, {
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    });

    if (apiData.status != 200) return c.text('API Error', apiData.status);
    apiData = apiData.data[0];
    if (apiData == undefined) return c.text('No Asset', 500);
    if (apiData.assets[0] == undefined) return c.text('No Rel', 500);
    const updateFile = apiData.assets[0].browser_download_url;
    const serverVersion = apiData.tag_name.split('.', 2);
    let userVersion = (c.req.header()["user-agent"] || "unknown").split('/', 2);
    if (userVersion.length != 2) return c.text('No Split', 400);
    userVersion = userVersion === "DEV" ? userVersion : userVersion[1].split('.', 2);
    if (userVersion[0] !== "DEV" && userVersion.length != 2) return c.text('No Ver', 400);
    if (serverVersion.length != 2) return c.text('', 500);
    if (userVersion[0] !== "DEV" && (!isNumeric(userVersion[0]) || !isNumeric(userVersion[1]))) return c.text('No Num', 400);
    if (userVersion[0] === "DEV" || parseInt(userVersion[0], 10) < parseInt(serverVersion[0], 10) || (parseInt(userVersion[0], 10) == parseInt(serverVersion[0], 10) && parseInt(userVersion[1], 10) < parseInt(serverVersion[1], 10))) {
        const updateData = await fetch(updateFile);
        if (!updateData.ok) {
            return c.text('No Dl', 503);
        }
        return c.body(updateData.body);
    } else {
        return c.text('', 200);
    }
}

app.get('', async (c) => fetchUpdate(c))

export default app