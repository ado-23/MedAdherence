'use strict'

const { App } = require('jovo-framework')
const { Alexa } = require('jovo-platform-alexa')
const { GoogleAssistant } = require('jovo-platform-googleassistant')
const { JovoDebugger } = require('jovo-plugin-debugger')
const { MongoDb } = require('jovo-db-mongodb')

const moment = require('moment')
const {
  SetupState1,
  SetupState2,
  SetupState3,
} = require('./states/onboarding.js')

// ------------------------------------------------------------------
// APP INITIALIZATION
// ------------------------------------------------------------------

const app = new App()

app.use(new MongoDb())
app.use(new Alexa(), new GoogleAssistant(), new JovoDebugger())

// ------------------------------------------------------------------
// APP LOGIC
// ------------------------------------------------------------------
const AddReminderIntent = app.setHandler({
  LAUNCH() {
    // Runs when the skill is first invoked
    return this.toIntent('MenuIntent')
  },
  ON_REQUEST() {
    // Triggered with every request
    console.log('request received')
  },
  END() {
    // Runs when the current invocation ends
    let reason = this.$alexaSkill.getEndReason()
    console.log(reason)
    this.tell('Goodbye!')
    return 1
  },
  MenuIntent() {
    // The initial menu when the skill is first invoked
	// Can say "setup" here to proceed with normal setup
	// Can say "permissions" here to grant access to the permissions to set reminders
    this.ask("Hello, if you're trying to set up a pill reminder. Say setup!")
  },
  PermissionsIntent() {
    // Needed to set up permissions on a new device
	// Make sure to run this once per new device using the app
    const setupDirective = {
      type: 'Connections.SendRequest',
      name: 'AskFor',
      payload: {
        '@type': 'AskForPermissionsConsentRequest',
        '@version': '1',
        permissionScope: 'alexa::alerts:reminders:skill:readwrite',
      },
      token: '',
    }
    return this.$alexaSkill.addDirective(setupDirective)
  },
  SetupIntent() {
    this.toStateIntent('SetupState1', 'Base')
  },
  GetReminderIntent() {
    this.toStateIntent('GetReminderState', 'Initial')
  },
  SetupState1,
  SetupState2,
  SetupState3,
  IntervalState1: {
    //pills multiple times per day
    TimeIntent() {
      //formatting the time to concatenate an appropriate output phrase in variable 'output'
      this.$session.$data.time = this.$inputs.time.value.toLowerCase()

      let fTime = moment(this.$session.$data.time, 'h:mma')

      //this if else determines the interval, 24 hour period or 12. we stuck with 12 for normalcy

      this.$session.$data.hoursBetween = 12 / (this.$session.$data.perDiem - 1)

      let times = [fTime.clone()]
      let curTime = fTime
      let output = fTime.format('h:mma')

      //for loop building 'output'
      for (var i = 1; i < this.$session.$data.perDiem; i++) {
        curTime = curTime.add(this.$session.$data.hoursBetween, 'hours')
        times.push(curTime.clone())
        if (i < this.$session.$data.perDiem - 1) {
          output += ', '
        }
        if (i == this.$session.$data.perDiem - 1) {
          output += ' and '
        }
        output += curTime.format('h:mma')
      }

      //confirm the interval times
      this.followUpState('IntervalState2').ask(
        'To confirm, you would like to take your pills at ' +
          output +
          '. Is this correct?'
      )
    },
  },
  IntervalState2: {
    async YesIntent() {
      //  THIS IS THE CODE TO SET UP REMINDERS
      let time = new Date().toISOString().replace('Z', '')

      //zeros for time formating
      var zeros = ':00.000'

      //get the current date
      var date = new Date()

      //get the full year
      var year = date.getFullYear()

      //get the month and format properly
      var month = date.getMonth() + 1
      if (month < 10) {
        month = '0' + month
      }

      //get the day and format properly
      var day = date.getDate()
      if (day < 10) {
        day = '0' + day
      }

      var remind_time =
        year + '-' + month + '-' + day + 'T' + this.$session.$data.time + zeros

      var pill_time = this.$session.$data.time.split(':')
      var next_h = pill_time[0]
      var next_m = pill_time[1]
      var recurrenceTimes = [
        'FREQ=DAILY;BYHOUR=' + next_h + ';BYMINUTE=' + next_m + ';',
      ]
      for (var i = 1; i <= this.$session.$data.perDiem - 1; i++) {
        //debugging statements
        //console.log(parseInt(pill_time[0]))
        //console.log(parseInt(this.$session.$data.hoursBetween))
        //console.log(parseInt(pill_time[0]) + parseInt(this.$session.$data.hoursBetween))

        if (parseInt(pill_time[0]) + parseInt(this.$session.$data.hoursBetween) > 23) {
          //debugging
          //console.log('if')

          pill_time[0] =
            parseInt(pill_time[0]) +
            parseInt(this.$session.$data.hoursBetween) -
            24
          next_h =
            parseInt(next_h) + parseInt(this.$session.$data.hoursBetween) - 24
        } else {
          //debugging
          //console.log('else')

          pill_time[0] =
            parseInt(pill_time[0]) + parseInt(this.$session.$data.hoursBetween)
          next_h = parseInt(next_h) + parseInt(this.$session.$data.hoursBetween)
        }
        recurrenceTimes[i] =
          'FREQ=DAILY;BYHOUR=' + next_h + ';BYMINUTE=' + next_m + ';'

        //debugging
        //console.log(recurrenceTimes[i])
      }
      //console.log(recurrenceTimes)
      var times = this.$session.$data.time.split(':')
      var hour = times[0]
      var min = times[1]
      // REFERENCE: https://developer.amazon.com/en-US/docs/alexa/smapi/alexa-reminders-api-reference.html
      const reminder = {
        requestTime: time,
        trigger: {
          type: 'SCHEDULED_ABSOLUTE',
          scheduledTime: remind_time,
          timeZoneId: 'America/New_York',
          recurrence: {
            recurrenceRules: recurrenceTimes,
          },
        },
        alertInfo: {
          spokenInfo: {
            content: [
              {
                locale: 'en-US',
                text: 'Take your medication now',
                ssml: '<speak>Take your medication now</speak>',
              },
            ],
          },
        },
        pushNotification: {
          status: 'ENABLED',
        },
      }

      //set up the reminder with setReminder
      try {
        const result = await this.$alexaSkill.$user.setReminder(reminder)

        this.$user.$data.reminderID = result.alertToken
        this.$user.$data.startTime = this.$session.$data.time

        if (this.$session.$data.time.split(':')[0] > 12) {
          var new_time = this.$session.$data.time.split(':')
          new_time[0] = parseInt(new_time[0]) - 12
          new_time = new_time[0] + ':' + new_time[1]

          this.followUpState('END').tell(
            'Great! I will remind you to take all your medicine at ' + new_time + ' p.m.'
          )
        } else {
          this.followUpState('END').tell(
            'Great! I will remind you to take all your medicine at ' +
              this.$session.$data.time + ' a.m.'
          )
        }
      } catch (error) {
        //no permissions or another error
        if (error.code === 'NO_USER_PERMISSION') {
          this.tell('Please grant the permission to set reminders.')
        } else {
          console.log('error')
          console.log(error)
        }
      }
    },
    NoIntent() {
      this.followUpState('IntervalState1').ask('')
    },
  },
  SingleTimeState: {
    //one time to take medication
    TimeIntent() {
      this.$session.$data.time = this.$inputs.time.value

      if (this.$session.$data.time.split(':')[0] > 12) {
        var new_time = this.$session.$data.time.split(':')
        new_time[0] = parseInt(new_time[0]) - 12
        new_time = new_time[0] + ':' + new_time[1]

        console.log(new_time)

        this.followUpState('SingleTimeState').ask(
          'To confirm, you would like to take all your pills at ' + new_time + ' p.m.'
        )
      } else {
        this.followUpState('SingleTimeState').ask(
          'To confirm, you would like to take all your pills at ' +
            this.$inputs.time.value + ' a.m.'
        )
      }
    },
    async YesIntent() {
      //  THIS IS THE CODE TO SET UP REMINDERS
      let time = new Date().toISOString().replace('Z', '')

      //zeros for time formating
      var zeros = ':00.000'

      //get the current date
      var date = new Date()

      //get the full year
      var year = date.getFullYear()

      //get the month and format properly
      var month = date.getMonth() + 1
      if (month < 10) {
        month = '0' + month
      }

      //get the day and format properly
      var day = date.getDate()
      if (day < 10) {
        day = '0' + day
      }

      //remind_time is the time the user wants to take their medication
      var remind_time =
        year + '-' + month + '-' + day + 'T' + this.$session.$data.time + zeros

      var times = this.$session.$data.time.split(':')
      var hour = times[0]
      var min = times[1]
      const reminder = {
        requestTime: time,
        trigger: {
          type: 'SCHEDULED_ABSOLUTE',
          scheduledTime: remind_time,
          timeZoneId: 'America/New_York',
          recurrence: {
            recurrenceRules: [
              'FREQ=DAILY;BYHOUR=' + hour + ';BYMINUTE=' + min + ';',
            ],
          },
        },
        alertInfo: {
          spokenInfo: {
            content: [
              {
                locale: 'en-US',
                text: 'take all of your medication now',
                ssml: '<speak>take all of your medication now</speak>',
              },
            ],
          },
        },
        pushNotification: {
          status: 'ENABLED',
        },
      }

      try {
        //this sets the reminder with setReminder
        const result = await this.$alexaSkill.$user.setReminder(reminder)

        this.$user.$data.reminderID = result.alertToken
        this.$user.$data.startTime = this.$session.$data.time

        if (this.$session.$data.time.split(':')[0] > 12) {
          var new_time = this.$session.$data.time.split(':')
          new_time[0] = parseInt(new_time[0]) - 12
          new_time = new_time[0] + ':' + new_time[1]

          this.followUpState('END').tell(
            'Great! I will remind you to take all your medicine at ' + new_time + ' p.m.'
          )
        } else {
          this.followUpState('END').tell(
            'Great! I will remind you to take all your medicine at ' +
              this.$session.$data.time + ' a.m.'
          )
        }
      } catch (error) {
        //no permissions or other error
        if (error.code === 'NO_USER_PERMISSION') {
          this.tell('Please grant the permission to set reminders.')
        } else {
          console.log('error')
          console.log(error)
          // Do something
        }
      }
    },
    NoIntent() {
      //repromt user for time
      this.followUpState('SingleTimeState.TimeIntent').ask(
        'At what time do you want to take your pill?'
      )
    },
  },
})

module.exports = { app }
