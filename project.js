// ------------------------------------------------------------------
// JOVO PROJECT CONFIGURATION
// ------------------------------------------------------------------

module.exports = {
  alexaSkill: {
    nlu: 'alexa',
    manifest: {
      permissions: [
        {
          name: 'alexa::alerts:reminders:skill:readwrite',
        },
      ],
	},
  },
  googleAction: {
    nlu: 'dialogflow',
  },
  endpoint: '${JOVO_WEBHOOK_URL}',
  stages: {
    local: {
      languageModel: {
        'en-US': {
          intents: [
            {
              name: 'Medicine',
              samples: [
                'did i take my medicine today',
                'what medicine do i have to take today',
              ],
            },
          ],
        },
      },
    },
  },
}
