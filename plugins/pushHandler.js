module.exports = {
  event: {
    push: ({eventType, eventId, eventSignature, payload}) => {
      console.log('pushHandler plugin recieved a push event!')
      console.log(JSON.stringify(payload))
    }
  }
}