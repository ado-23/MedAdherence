module.exports = {
  SetupState1: {
    Base() {
      this.followUpState('SetupState2').ask(
        "Alright let's set up your reminders, how many pills do you take a day?"
      )
    },
  },
  SetupState2: {
    //this state clarifies the number of pills the user is taking per day and filters them appropriately to SetupState3.Multiple or SetupState3.Single
    NumberIntent() {
      this.$session.$data.perDiem = this.$inputs.number.value

      this.followUpState('SetupState2').ask(
        'Okay so to clarify, you have been prescribed ' +
          this.$session.$data.perDiem +
          ' pills per day, is this correct?'
      )
    },
    TimeIntent() {
      //AMAZON.TimeIntent picks up a time here, just grab the hour and use it as the number of pills
      var pills = this.$inputs.time.value.toLowerCase().split(':')[0]
      this.$session.$data.perDiem = parseInt(pills)
      if (parseInt(pills) > 1) {
        //multiple pills per day
        this.followUpState('SetupState2').ask(
          'Okay so to clarify, you have been prescribed ' +
            parseInt(pills) +
            ' pills per day. Is this correct?'
        )
      } else {
        //one pill per day
        this.followUpState('SetupState2').ask(
          'Okay so to clarify, you have been prescribed ' +
            parseInt(pills) +
            ' pill per day. Is this correct?'
        )
      }
    },
    YesIntent() {
      if (this.$session.$data.perDiem > 1) {
        this.toStateIntent('SetupState3', 'Multiple')
      } else {
        this.toStateIntent('SetupState3', 'Single')
      }
    },
    NoIntent() {
      this.followUpState('SetupState2').ask(
        'Okay. Let`s try again. How many pills do you take a day?'
      )
    },
  },
  SetupState3: {
    //this state prompts users for the time they want to take all their pills (once per day) / their first pill (multiple per day)
    Multiple() {
      this.followUpState('IntervalState1.TimeIntent').ask(
        'At what time do you want to take your first pill?'
      )
    },
    Single() {
      this.followUpState('SingleTimeState.TimeIntent').ask(
        'At what time do you want to take your pill?'
      )
    },
  },
}
