<template>
  <div class="race-title">
    <span v-if="boat && boat != '-'">
      <span  class="is-clickable" @click="selectBoat()">
        {{ this.boat }}
      </span>
    </span>
    <i class="fas fa-exchange-alt"></i>
    <span class="is-clickable" @click="selectRace()">
      {{ this.races[this.race].name }}
    </span>
  </div>
</template>

<script>
import {EventBus} from '../event-bus.js';

export default {
  name: 'TitleControl',
  props: {
    race: String,
    races: null,
    boat: String
  },
  data: function () {
    return {}
  },
  mounted: function() {
  },
  computed: {
  },
  methods: {
    selectRace() {
      EventBus.$emit("select-race")
    },
    selectBoat() {
      EventBus.$emit("select-boat", {race: this.race})
    }
  }
}
</script>

<style scoped>
.race-title {
  color: white;
  font-weight: bolder;
  font-size: 15px;
  float: left;
  clear: right !important;
  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0,0,0,0.2);
  border-radius: 4px;
  padding: 4px 10px 3px 10px;
}
</style>
