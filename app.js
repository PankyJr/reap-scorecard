/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * cPanel Passenger startup entrypoint.
 * Runs the built Next.js app over Node HTTP.
 */
const http = require('node:http')
const next = require('next')

const port = parseInt(process.env.PORT || '3000', 10)
const hostname = '0.0.0.0'
const app = next({ dev: false, hostname, port })
const handle = app.getRequestHandler()

app
  .prepare()
  .then(() => {
    http
      .createServer((req, res) => handle(req, res))
      .listen(port, hostname, () => {
        console.log(`> Next.js server listening on http://${hostname}:${port}`)
      })
  })
  .catch((err) => {
    console.error('Failed to start Next.js server:', err)
    process.exit(1)
  })
