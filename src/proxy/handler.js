import { Hono } from 'hono'
import { env } from 'hono/adapter';
const app = new Hono()

async function fetchProxy(c) {
    async function proxyCheckFetch(dest, c) {
        const { PROXY_URLS } = env(c);
        
        const split = dest.split(':', 2);
        if (split.length != 2) {
            throw new Error('Invalid destination format. Expected format: "type:resource"');
        }

        if (PROXY_URLS[split[0]]) {
            const url = PROXY_URLS[split[0]] + split[1];
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch from ${url}`);
            }
            return await response.arrayBuffer();
        } else {
            throw new Error(`No proxy URL configured for ${split[0]}`);
        }
    }

    try {
        const res = await proxyCheckFetch(c.req.param('dest'), c);
        return c.body(res);
    } catch (error) {
        return c.text(error.message, 400);
    }
}

app.get('/:dest{.+}', async (c) => fetchProxy(c))

export default app