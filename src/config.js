// ------------------------------------------------------------------
// APP CONFIGURATION
// ------------------------------------------------------------------

module.exports = {
  logging: true,

  intentMap: {
    'AMAZON.StopIntent': 'END',
    'AMAZON.YesIntent': 'YesIntent',
    'AMAZON.NoIntent': 'NoIntent',
    'AMAZON.TIME': 'TimeIntent',
  },

  db: {
    MongoDb: {
      databaseName: 'data',
      collectionName: 'medicine',
      uri:
        'mongodb+srv://dev:test@cluster0.gwose.mongodb.net/data?retryWrites=true&w=majority',
    },
  },
}
