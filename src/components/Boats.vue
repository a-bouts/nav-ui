<template>
  <div>
    <table class="table is-fullwidth">
      <thead>
        <tr>
          <th>Boat</th>
        </tr>
      </thead>
      <tr v-for="(boat, index) in boats" :key="index">
        <td v-if="index == edit">
          <input v-model="boat.name" class="input is-small" type="text">
        </td>
        <td v-else @click="editBoat(index)">
          {{ boat.name }}
        </td>
        <td><div class="has-text-right" @click="remove(index)"><i class="fas fa-trash"></i></div></td>
      </tr>
    </table>
    <div class="buttons is-right">
      <button class="button is-small is-primary" @click="save()">Save</button>
      <button class="button is-small is-primary" @click="add()">Add</button>
    </div>
  </div>
</template>

<script>
import dataService from '../lib/data.js';
import {EventBus} from '../event-bus.js'

export default {
  name: 'Boats',
  props: {
  },
  data: function() {
    return {
      boats: [],
      edit: null
    }
  },
  mounted: function() {
    this.boats = dataService.getBoats()
    if (!this.boats) {
      this.boats = []
    }
  },
  methods: {
    editBoat(index) {
      if (this.edit != index) {
        this.edit = index
      } else {
        this.edit = null
      }
    },
    remove(index) {
      this.boats.splice(index, 1)
    },
    add() {
      this.boats.push({name: ""})
      this.edit = this.boats.length - 1
    },
    save() {
      dataService.saveBoats(this.boats)
      this.edit = null
      EventBus.$emit("set-boats", this.boats)
    }
  }
}
</script>

<style scoped>
</style>
