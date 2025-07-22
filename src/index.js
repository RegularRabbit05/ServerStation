import { Hono } from 'hono'
import ping from './ping/handler'
import plugins from './plugins/handler'
import update from './update/handler'
import proxy from './proxy/handler'

const app = new Hono()

app.route('/ping', ping)
app.route('/plugins/', plugins)
app.route('/update', update)
app.route('/proxy/', proxy)

export default app