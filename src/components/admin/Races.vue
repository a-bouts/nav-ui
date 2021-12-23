<template>
  <div class="container" style="overflow-x:scroll;">
    <div class="field">
      <input class="is-checkradio is-info" id="archived" type="checkbox" name="archived" v-model="archived" >
      <label for="archived">Courses archivées</label>
    </div>

    <table class="table is-fullwidth is-narrow is-bordered monospace" style="white-space: nowrap;">
      <thead>
        <tr>
          <th>Name</th>
          <th class="has-text-centered">Start</th>
          <th class="has-text-centered">End</th>
          <th></th>
        </tr>
      </thead>
      <tr v-for="r in races" :key="r.id" @click="race = r">
        <td width="100%">{{ r.name }}</td>
        <td>{{ r.start_time }}</td>
        <td>{{ r.end_time }}</td>
        <td>
          <span class="icon is-clickable" v-if="!archived" @click.stop="archive(r.id)"><i class="fas fa-box"></i></span>
          <span class="icon is-clickable" v-if="archived" @click.stop="restore(r.id)"><i class="fas fa-box-open"></i></span>
        </td>
      </tr>
    </table>

    <div v-if="race" class="modal" v-bind:class="{'is-active': race}" style="z-index:4000">
      <div class="modal-background"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Edit race</p>
        </header>
        <section class="modal-card-body">

          <fieldset>
            <div class="field is-horizontal">
              <div class="field-label is-normal">
                <label class="label" style="white-space: nowrap;">Id</label>
              </div>
              <div class="field-body">
                <div class="field">
                  <p class="control is-expanded">
                    <input class="input is-small" type="text" v-model="race.id">
                  </p>
                </div>
              </div>
            </div>
            <div class="field is-horizontal">
              <div class="field-label is-normal">
                <label class="label" style="white-space: nowrap;">Short</label>
              </div>
              <div class="field-body">
                <div class="field">
                  <p class="control is-expanded">
                    <input class="input is-small" type="text" v-model="race.shortName">
                  </p>
                </div>
              </div>
            </div>
            <div class="field is-horizontal">
              <div class="field-label is-normal">
                <label class="label" style="white-space: nowrap;">Polar</label>
              </div>
              <div class="field-body">
                <div class="field">
                  <div class="control is-expanded">
                    <div class="select is-fullwidth is-small">
                      <select v-model="race.boat">
                        <option v-for="polar in polars" :key="polar.id" :value="polar.id">{{ polar.id }}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="field is-horizontal">
              <div class="field-body">
                <div class="field has-addons">
                  <p class="control">
                    <a class="button is-small is-static"><i class="far fa-calendar-alt"></i></a>
                  </p>
                  <p class="control is-expanded">
                    <input class="input is-small" type="text" :value="race.start_time">
                  </p>
                  <p class="control">
                    <a class="button is-small is-static"><i class="fas fa-angle-right"></i></a>
                  </p>
                  <p class="control is-expanded">
                    <input class="input is-small" type="text" :value="race.end_time">
                  </p>
                </div>
              </div>
            </div>
          </fieldset>

        </section>
      </div>
      <button class="modal-close is-large" aria-label="close"></button>
    </div>
  </div>
</template>

<script>
const moment = require('moment');

export default {
  name: 'Races',
  props: {
  },
  data() {
    return {
      races: [],
      race: null,
      archived: false
    }
  },
  watch: {
    archived: function() {
      this.refresh()
    }
  },
  methods: {
    refresh() {
      const self = this
      fetch('races/api/v1/races?archived=' + this.archived)
        .then(response => response.json())
        .then(races => {
          for (var race of races) {
            if (race.start_time)
              race.start_time = moment.utc(race.start_time).local().format('L LT')
            if (race.end_time)
              race.end_time = moment.utc(race.end_time).local().format('L LT')
          }
          self.races = races
        })
    },
    archive(race_id) {
      const self = this

      fetch('/races/api/v1/races/' + race_id + "/archive", {
        method: "POST"
      }).then(function(response) {
        if (response.ok) {
          if (response.redirected) {
            self.$emit('disconnected')
            return
          }
          for (var r in self.races) {
            if (self.races[r].id === race_id) {
              self.races.splice(r, 1)
              break
            }
          }
        }
      })

    },
    restore(race_id) {
      const self = this

      fetch('/races/api/v1/races/' + race_id + "/restore", {
        method: "POST"
      }).then(function(response) {
        if (response.ok) {
          if (response.redirected) {
            self.$emit('disconnected')
            return
          }
          for (var r in self.races) {
            if (self.races[r].id === race_id) {
              self.races.splice(r, 1)
              break
            }
          }
        }
      })

    },
  }
}
</script>

<style>
</style>
