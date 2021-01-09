<template>
  <div>
    <div class="modal" v-bind:class="{'is-active': active}" style="z-index:4000">
      <div class="modal-background"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Choose your race</p>
        </header>
        <section class="modal-card-body">
          <div class="tile is-vertical">
            <a class="tile is-child" v-for="(race, r) in activeRaces" :key="r" @click="selectRace(r)">
              <p class="title">{{race.name}}</p>
            </a>
          </div>
        </section>
      </div>
      <button class="modal-close is-large" aria-label="close"></button>
    </div>
    <router-view></router-view>
  </div>
</template>

<script>
import {EventBus} from './event-bus.js';

export default {
  name: 'Races',
  components: {
  },
  props: {
    boat: String,
    race: String,
    debug: Boolean,
    priv: Boolean
  },
  data : function() {
    return {
      races: null,
      active: !this.race
    }
  },
  computed: {
    activeRaces: function() {

      var races = {}

      for(var id in this.races) {
        if (!this.races[id].archived) {
          races[id] = this.races[id]
        }
      }

      return races
    }
  },
  beforeRouteEnter (to, from, next) {
    fetch('races/races.json', {headers: {'Cache-Control': 'no-cache'}})
      .then(response => response.json())
      .then(response => {
        next(vm => {
          vm.races = response
        })
      })
  },
  mounted: function() {
    EventBus.$on("select-race", () => {
      this.active = true
    })
  },
  methods: {
    selectRace(race) {
      this.active = false
      if (this.race == race)
        return

      this.$router.push({ path: `/${this.boat}/${race}` })
    },
    checkRace() {
      return this.race && this.races[this.race] !== undefined
    }
  },
  watch: {
    race() {
      if (!this.checkRace())
        this.active = true
      else
        this.active = false
    }
  }
}
</script>

<style>
</style>
