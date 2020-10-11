<template>
  <div>
    <table class="table is-fullwidth">
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Type</th>
          <th></th>
          <th></th>
          <th></th>
        </tr>
      </thead>
      <tr v-for="(buoy, index) in buoys" :key="index">
        <td>{{ index }}</td>
        <td>{{ buoy.name }}</td>
        <td>{{ buoy.type }}</td>
        <td><div class="has-text-centered" v-if="buoy.custom && index > 1" @click="up(index)"><i class="fas fa-caret-up"></i></div></td>
        <td><div class="has-text-centered" v-if="buoy.custom && index < buoys.length - 2" @click="down(index)"><i class="fas fa-caret-down"></i></div></td>
        <td><div class="has-text-centered" v-if="buoy.custom" @click="remove(index)"><i class="fas fa-trash"></i></div></td>
      </tr>
    </table>
    <div class="buttons has-addons is-right">
      <button class="button is-small is-primary" @click="add()">Add</button>
    </div>
  </div>
</template>

<script>
import {EventBus} from '../event-bus.js';

export default {
  name: 'Buoys',
  props: {
    races: Object,
    current: Object,
  },
  data: function() {
    return {
      buoys: []
    }
  },
  mounted: function() {
    EventBus.$on('buoys', this.onBuoys)
  },
  methods: {
    onBuoys(buoys) {
      this.buoys = buoys
    },
    add() {
      EventBus.$emit('add-buoy')
    },
    up(index) {
      EventBus.$emit('up-buoy', index)
    },
    down(index) {
      EventBus.$emit('down-buoy', index)
    },
    remove(index) {
      EventBus.$emit('remove-buoy', index)
    },
    save() {
      this.$emit('buoys', this.buoys)
    },
    setBuoy(index, buoy) {
      this.customBuoys[index] = buoy
    }
  }
}
</script>

<style scoped>
</style>
