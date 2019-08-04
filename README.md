# github-webhook-handler

This is a quick project to create a fastify server that can handle github webhooks.

## Getting started
start the server
```
npm start
```

write a plugin in the ./plugins directory
```javascript
module.exports = {
  onLoad: (fastify) => {
    // called when your plugin loads
    // register routes on fastify
    // if you want your plugin to have a web interface
  },
  event: {
    push: ({eventType, eventId, eventSignature, payload}) => {
      // handle push event here
    }
  },
  onUnload: (fastify) => {
    // called when your plugin unloads
  }
}
```

## API
### POST `/webhooks`
- requires event type and event id headers from github to be in the request
- routes the webhook to all plugins that use the event
