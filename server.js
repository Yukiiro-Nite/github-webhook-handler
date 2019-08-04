const PORT = process.env.PORT || 3000
const DEBUG = process.env.DEBUG
const fastify = require('fastify')({ logger: DEBUG, bodyLimit: 26214400 })
const plugins = require('./plugins')(fastify)

fastify.get('/plugin/:pluginName', (request, reply) => {
  const pluginName = request.params.pluginName
  const pluginPath = plugins.pathFromName(pluginName)
  plugins.loadPlugin(pluginPath)
  reply.code(200).send({message: `${pluginName} loaded`})
})

fastify.delete('/plugin/:pluginName', (request, reply) => {
  const pluginName = request.params.pluginName
  const pluginPath = plugins.pathFromName(pluginName)
  plugins.unloadPlugin(pluginPath)
  reply.code(200).send({message: `${pluginName} unloaded`})
})

fastify.get('/plugins', (request, reply) => {
  plugins.loadAllPlugins()
  reply.code(200).send({message: 'All plugins loaded'})
})

fastify.delete('/plugins', (request, reply) => {
  plugins.unloadAllPlugins()
  reply.code(200).send({message: 'All plugins unloaded'})
})

/**
 * Before we register this post, we need to register the plugins to the fastify instance
 * we also need reload endpoints to allow us to unload and load plugins while running
 * 
 */

fastify.post('/webhooks', {
  onRequest: (request, reply, done) => {
    const {
      ['x-github-event']: eventType,
      ['x-github-delivery']: eventId
    } = request.headers

    if(!eventType || !eventId) {
      done(new Error('Github webhook requests require a X-GitHub-Event and X-GitHub-Delivery header.'))
    } else {
      done()
    }
  }
}, (request, reply) => {
  reply.code(200).send()
  const {
    ['x-github-event']: eventType,
    ['x-github-delivery']: eventId,
    ['x-hub-signature']: eventSignature
  } = request.headers

  plugins.sendEvent({
    eventType,
    eventId,
    eventSignature,
    payload: request.body
  })
})

const start = async () => {
  try {
    await fastify.listen(PORT)
    fastify.log.info(`server listening on ${fastify.server.address().port}`)
    plugins.loadAllPlugins()
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()