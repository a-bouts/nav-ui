<template>
  <div>
    <div class="modal" v-bind:class="{'is-active': active && !isNew}" style="z-index:4000">
      <div class="modal-background"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Choose your race</p>
          <button class="button" @click="addRace">
            <span class="icon">
              <i class="fas fa-plus"></i>
            </span>
          </button>
        </header>
        <section class="modal-card-body">
          <div class="tile is-vertical">
            <div class="columns" v-for="(race, r) in activeRaces" :key="r">
              <div class="column">
                <a class="tile is-child" @click="selectRace(r)">
                  <p class="title">{{race.name}}</p>
                </a>
              </div>
              <div class="column is-1">
                <button v-if="race.custom" class="button is-white" @click="deleteRace(r)">
                  <span class="icon">
                    <i class="fas fa-trash"></i>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
    <div class="modal" v-bind:class="{'is-active': active && isNew}" style="z-index:4000">
      <div class="modal-background"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Create race</p>
        </header>
        <section class="modal-card-body">
          <div class="tile is-vertical">
            <div class="field is-horizontal">
              <div class="field-label is-normal">
                <label class="label" style="white-space: nowrap;">Name</label>
              </div>
              <div class="field-body">
                <div class="field">
                  <p class="control is-expanded">
                    <input class="input is-small" :class="{'is-danger': required['name']}" type="text" v-model="newRace.name" @input="editName">
                  </p>
                </div>
              </div>
            </div>
            <div class="field is-horizontal">
              <div class="field-label is-normal">
                <label class="label" style="white-space: nowrap;">Id</label>
              </div>
              <div class="field-body">
                <div class="field">
                  <p class="control is-expanded">
                    <input disabled class="input is-small" :class="{'is-danger': required['id']}" type="text" v-model="newRace.id">
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
                    <input class="input is-small" :class="{'is-danger': required['shortName']}" type="text" v-model="newRace.shortName">
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
                    <div class="select is-fullwidth is-small" :class="{'is-danger': required['boat']}">
                      <select v-model="newRace.boat">
                        <option v-for="polar in polars" :key="polar.id" :value="polar.id">{{ polar.id }}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <footer class="modal-card-foot">
          <button class="button is-success" @click="createRace">Create</button>
          <button class="button" @click="cancelNewRace">Cancel</button>
        </footer>
      </div>
    </div>
    <router-view></router-view>
  </div>
</template>

<script>
import {EventBus} from './event-bus.js';
import polarService from './lib/polar.js';
import dataService from './lib/data.js'

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
      active: !this.race,
      isNew: false,
      newRace: {},
      polars: null,
      required: {},
      hash: (Math.random() + 1).toString(36).substring(7)
    }
  },
  computed: {
    activeRaces: function() {
      this.hash

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
    dataService.loadRaces().then(() => {
      next(vm => {
        vm.races = dataService.getRaces()
        if (vm.race && !(vm.race in vm.races)) {
          vm.$router.push({ path: `/${vm.boat}` })
        }
      })
    })  
  },
  created() {
    polarService.loadAll().then(polars => { this.polars = polars })
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
    },
    addRace() {
      this.isNew = true
      this.required = {}
    },
    cancelNewRace() {
      this.isNew = false
      this.required = {}
    },
    editName() {
      this.newRace.id = this.newRace.name.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, "").replace(/ +/g, "-")
    },
    deleteRace(race) {
      dataService.removeRace(race)
      delete this.races[race]
      this.hash = (Math.random() + 1).toString(36).substring(7)
      dataService.clean(this.races)
      if (race == this.race) {
        this.$router.push({ path: `/${this.boat}` })
      }
    },
    createRace() {
      this.required = {}
      if (!this.newRace.name || this.newRace.name == "") {
        this.required["name"] = true
      }
      if (!this.newRace.id || this.newRace.id == "") {
        this.required["id"] = true
      }
      if (!this.newRace.boat) {
        this.required["boat"] = true
      }
      if (!this.newRace.shortName || this.newRace.shortName == "") {
        this.newRace.shortName = this.newRace.name
      }

      if (Object.keys(this.required).length) {
        return
      }

      this.newRace.custom = true
      this.newRace.start = {lat: 0.0, lon: 0.0}
      this.newRace.waypoints = [{
        name: "end",
        radius: 5,
        latlons: [{lat: 0.0, lon: 1.0}]
      }]

      dataService.addRace(this.newRace)
      this.races[this.newRace.id] = this.newRace
      this.hash = (Math.random() + 1).toString(36).substring(7)

      this.isNew = false
      this.required = {}
      this.selectRace(this.newRace.id)
      this.newRace = {}
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
