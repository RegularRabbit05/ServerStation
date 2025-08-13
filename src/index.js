import { Hono } from 'hono'
import ping from './ping/handler'
import store from './store/handler'
import update from './update/handler'
import proxy from './proxy/handler'

const app = new Hono()

app.route('/ping', ping)
app.route('/update', update)
app.route('/proxy/', proxy)
app.route('/', store)

export default app