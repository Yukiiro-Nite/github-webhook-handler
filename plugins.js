const fs = require('fs')
const Path = require('path')
const eventHandler = {}
const pluginDir = Path.join(process.cwd(), 'plugins')
let fastify

function getPluginFiles() {
  try {
    if(!fs.existsSync(pluginDir)) {
      fs.mkdirSync(pluginDir)
    }
    const files = fs.readdirSync(pluginDir)
    return files.filter(file => file.endsWith('.js'))
      .map(file => Path.join(pluginDir, file))
  } catch (error) {
    console.log('Error reading plugin files: ', error)
    return []
  }
}

function pathFromName(name) {
  const nameWithExtension = name.endsWith('.js') ? name : name + '.js'
  return Path.join(pluginDir, nameWithExtension)
}

function unloadAllPlugins() {
  const pluginPaths = Object.keys(require.cache)
    .filter(path => path.startsWith(pluginDir) && path.length > pluginDir.length + 3)

  if(pluginPaths && pluginPaths.length > 0) {
    console.log(`Unloading all plugins...`)
    pluginPaths.forEach(unloadPlugin)
  }
}

function loadAllPlugins() {
  unloadAllPlugins()
  console.log(`Loading all plugins...`)
  getPluginFiles().forEach(loadPlugin)
}

function loadPlugin(pluginPath) {
  // before we load a plugin, we need to unload the old copy
  unloadPlugin(pluginPath)

  // if there's no plugin file at this path, stop trying to load it.
  if(!fs.existsSync(pluginPath)) {
    console.log(`${pluginPath} does not exist, skipping rest of loadPlugin`)
    return
  }

  // import the plugin using require.
  // since we've removed the previous usage from the require cache in the unload plugin fn,
  // this will bring in a new instance of the plugin.
  // great for live reloading.
  const plugin = require(pluginPath)
  console.log(`Loading plugin @ ${pluginPath}`)
  // get all of the events this plugin will handle
  const pluginEvents = plugin.event ? Object.entries(plugin.event) : []

  // for each of the events that this plugin can handle, add them to the event handler object
  pluginEvents.forEach(([eventType, eventFn]) => {
    // get the current list of handlers for this event type
    let handlersForType = eventHandler[eventType]
    // if there aren't any handlers, we need to start a list so we can add our event to it.
    if(!handlersForType) {
      eventHandler[eventType] = []
      handlersForType = eventHandler[eventType]
    }
    // add our handler to the list of handlers for this event type
    handlersForType.push({pluginPath, eventFn})
    console.log(`\tAdded event handler for ${eventType}`)
  })

  if(plugin.onLoad && plugin.onLoad instanceof Function) {
    /** need to handle fastify related registrations, maybe here? */
    console.log(`\tCalling onLoad`)
    plugin.onLoad(fastify)
  }
}

function unloadPlugin(pluginPath) {
  // fetch the current plugin from the require cache
  const currentPluginCache = require.cache[pluginPath]

  // if there is a plugin of this name in the require cache, we'll need to remove it's usages
  if(currentPluginCache) {
    const currentPlugin = currentPluginCache.exports
    console.log(`Unloading plugin @ ${pluginPath}`)
    /** deregister hooks here (can we do this..?) */

    // get all of the events for the plugin we want to unload
    const pluginEvents = currentPlugin.event ? Object.entries(currentPlugin.event) : []

    // for each of the events the current plugin has, we need to remove them
    pluginEvents.forEach(([eventType, eventFn]) => {
      // get the list of all handlers for the current event type
      let handlersForType = eventHandler[eventType]
      // make a list of all handlers that aren't from the current plugin
      const handlersWithoutCurrentPlugin = handlersForType.filter(({pluginPath: handlerPluginPath}) => handlerPluginPath !== pluginPath)
      // delete the existing handlers for this event (i'm hoping this helps with gc)
      delete eventHandler[eventType]
      // insert the handlers without the current plugin into the event handler for this event type
      eventHandler[eventType] = handlersWithoutCurrentPlugin
      console.log(`\tRemoved event handler for ${eventType}`)
    })

    if(currentPlugin.onUnload && currentPlugin.onUnload instanceof Function) {
      console.log(`\tCalling onUnload`)
      plugin.onUnload(fastify)
    }

    // once we've removed all of the usages of the plugin, we can remove it from the require cache
    delete require.cache[pluginPath]
  }
}

function sendEvent(eventData) {
  const {eventType, eventId, eventSignature, payload} = eventData
  const handlers = eventHandler[eventType];
  if(handlers && handlers.length > 0) {
    handlers.forEach(({eventFn}) => eventFn(eventData))
  }
}

module.exports = (fastifyInstance) => {
  fastify = fastifyInstance
  return {
    loadPlugin,
    unloadPlugin,
    loadAllPlugins,
    unloadAllPlugins,
    pathFromName,
    sendEvent
  }
}