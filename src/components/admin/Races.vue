<template>
  <table class="table is-fullwidth is-narrow is-bordered monospace" style="white-space: nowrap;">
    <thead>
      <tr>
        <th>Name</th>
        <th class="has-text-centered">Start</th>
        <th class="has-text-centered">End</th>
        <th></th>
      </tr>
    </thead>
    <tr v-for="race in races" :key="race.id">
      <td>{{ race.name }}</td>
      <td>{{ race.start_time }}</td>
      <td>{{ race.end_time }}</td>
      <td><span class="icon" @click="archive(race.id)"><i class="fas fa-box"></i></span></td>
    </tr>
  </table>
</template>

<script>
export default {
  name: 'Races',
  props: {
  },
  data() {
    return {
      races: []
    }
  },
  mounted() {
    const it = this
    fetch('races/api/v1/races')
      .then(response => response.json())
      .then(response => {
        it.races = response
      })
  },
  methods: {
    archive(race_id) {
      const self = this

      fetch('/races/api/v1/races/' + race_id + "/archive", {
        method: "POST"
      }).then(function(response) {
        if (response.ok) {
          if (response.redirected) {
            this.$emit('disconnected')
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
            this.$emit('disconnected')
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
