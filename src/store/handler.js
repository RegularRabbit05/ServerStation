import { Hono } from 'hono'
import { env } from 'hono/adapter';
import { Octokit } from "octokit";
const app = new Hono()

async function fetchItems(sort, page, c, type) {
    function isNumeric(str) {
        if (typeof str != "string") return false;
        return !isNaN(str) && !isNaN(parseFloat(str));
    }

    const { REPOSITORY, PAGE_SIZE } = env(c);

    if (!isNumeric(page)) {
        return c.text('', 400);
    }

    const repo = await fetch(REPOSITORY+type+".json");
    if (!repo.ok) {
        return c.text('', 500);
    }
    let items = await repo.json();
    if (sort === 'name') {
        items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort.startsWith("cat-") && type === "apps") {
        const comp = sort.split("-", 2);
        if (comp.length !== 2) return c.text('Invalid category', 400);
        const cat = comp[1];
        items = items.filter((item) => item.tag === cat);
        items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "featured" && type === "apps") {
        items = items.filter((item) => item.featured !== 0);
        items.sort((a, b) => a.featured - b.featured);
    } else {
        items.sort(function(a, b) {
            if (a.uploaded > b.uploaded) return -1;
            if (a.uploaded < b.uploaded) return 1;
            return 0;
        });
    }
    const totalLen = items.length;
    
    page = parseInt(page, 10);
    const pageSize = PAGE_SIZE;
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    items = items.slice(startIndex, endIndex);
    let response = {
        page: page,
        total: totalLen,
        split: PAGE_SIZE,
    };
    if (type === "plugins") response.plugins = items; else response.apps = items;
    return c.json(response);
}

async function fetchItemInfo(user, repo, c) {
    const { FETCH_SERVICE, FETCH_DEST, GITHUB_KEY, BRANCH_URL } = env(c);

    const branchData = await new Octokit({
        auth: GITHUB_KEY
    }).request(`${BRANCH_URL}/${user}/${repo}`, {
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    });
    if (branchData.status != 200) return c.text('GitHub Error', branchData.status);
    const branch = branchData.data.default_branch;

    const url = `${FETCH_SERVICE}${user}/${repo}/refs/heads/${branch}/${FETCH_DEST}`;
    const response = await fetch(url);
    if (!response.ok) {
        return c.json({
            ok: false,
            error: `Failed to fetch item info from ${url}`
        }, 500);
    }
    const data = await response.json();
    data.ok = true;
    return c.json(data);
}

app.get('/plugins/list/:sort/:page', async (c) => await fetchItems(c.req.param('sort'), c.req.param('page'), c, "plugins"))
app.get('/apps/list/:sort/:page', async (c) => await fetchItems(c.req.param('sort'), c.req.param('page'), c, "apps"))

app.get('/plugins/info/:user/:repo', async (c) => await fetchItemInfo(c.req.param('user'), c.req.param('repo'), c))
app.get('/apps/info/:user/:repo', async (c) => await fetchItemInfo(c.req.param('user'), c.req.param('repo'), c))

export default app