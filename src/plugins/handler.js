import { Hono } from 'hono'
import { env } from 'hono/adapter';
const app = new Hono()

async function fetchPlugins(sort, page, c) {
    function isNumeric(str) {
        if (typeof str != "string") return false;
        return !isNaN(str) && !isNaN(parseFloat(str));
    }

    const { REPOSITORY, PAGE_SIZE } = env(c);

    if (!isNumeric(page)) {
        return c.text('', 400);
    }

    const repo = await fetch(REPOSITORY+"plugins.json");
    if (!repo.ok) {
        return c.text('', 500);
    }
    let plugins = await repo.json();
    const totalLen = plugins.length;
    if (sort === 'name') {
        plugins.sort(function(a, b) {
            return a.name.localeCompare(b.name);
        });
    } else {
        plugins.sort(function(a, b) {
            if (a.uploaded > b.uploaded) return -1;
            if (a.uploaded < b.uploaded) return 1;
            return 0;
        });
    }
    
    page = parseInt(page, 10);
    const pageSize = PAGE_SIZE;
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    plugins = plugins.slice(startIndex, endIndex);
    return c.json({
        page: page,
        total: totalLen,
        split: PAGE_SIZE,
        plugins: plugins
    });
}

async function fetchPluginInfo(user, repo, c) {
    const { FETCH_SERVICE, FETCH_DEST } = env(c);

    const url = `${FETCH_SERVICE}${user}/${repo}${FETCH_DEST}`;
    const response = await fetch(url);
    if (!response.ok) {
        return c.json({
            ok: false,
            error: `Failed to fetch plugin info from ${url}`
        }, 500);
    }
    const data = await response.json();
    data.ok = true;
    return c.json(data);
}

app.get('/list/:sort/:page', async (c) => await fetchPlugins(c.req.param('sort'), c.req.param('page'), c))
app.get('/info/:user/:repo', async (c) => await fetchPluginInfo(c.req.param('user'), c.req.param('repo'), c));

export default app