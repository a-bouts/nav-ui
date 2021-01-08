<template>
  <div>
    <div class="modal" v-bind:class="{'is-active': active}" style="z-index:4000">
      <div class="modal-background"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Choose your boat</p>
        </header>
        <section class="modal-card-body">
          <div class="tile is-vertical">
            <a class="tile is-child" v-for="b in boats" :key="b.name" @click="selectBoat(b.name, race)">
              <p class="title">{{b.name}}</p>
            </a>
          </div>
        </section>
      </div>
      <button class="modal-close is-large" aria-label="close"></button>
    </div>
    <router-view :debug="debug" :priv="priv"></router-view>
  </div>
</template>

<script>
import {EventBus} from './event-bus.js';

export default {
  name: 'Boats',
  components: {
  },
  props: {
    boat: String,
    debug: Boolean,
    priv: Boolean
  },
  data : function() {
    return {
      boats: null,
      race: null,
      active: !this.boat
    }
  },
  created: function() {
    this.boats = JSON.parse(localStorage.getItem("_boats_"))
    if (!this.boats || this.boats.length == 0) {
      this.selectBoat("-")
    } else if (this.boats && this.boats.length == 1) {
      this.selectBoat(this.boats[0].name)
    }
  },
  mounted: function() {
    EventBus.$on("set-boats", (boats) => {
      this.boats = boats
      if (!this.checkBoat()) {
        if (!this.boats || this.boats.length == 0) {
          this.selectBoat("-")
        } else {
          this.active = true
        }
      }
    })
    EventBus.$on("select-boat", (params) => {
      if (this.boats && this.boats.length == 1) {
        this.selectBoat(this.boats[0].name, params.race)
      } else {
        this.race = params.race
        this.active = true
      }
    })
  },
  methods: {
    selectBoat(boat, race) {
      this.active = false
      if (this.boat == boat)
        return

      if (race) {
        this.$router.push({ path: `/${boat}/${this.race}` })
      } else {
        this.$router.push({ path: `/${boat}` })
      }
    },
    checkBoat() {
      for (var b in this.boats) {
        if (this.boats[b].name == this.boat) {
          return true
        }
      }
      if (!this.boats || this.boats.length == 0) {
        if (this.boat == "-")
          return true
        else
          return false
      }
      return false
    }
  },
  watch: {
    boat: function() {
      if (!this.checkBoat()) {
        if (!this.boats || this.boats.length == 0) {
          this.selectBoat("-")
        } else {
          this.active = true
        }
      }
    }
  }
}
</script>

<style>
</style>
