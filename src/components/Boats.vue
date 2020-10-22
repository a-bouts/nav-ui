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
          <input v-model="boat.name" @change="onEdit(boat)" class="input is-small" type="text">
        </td>
        <td v-else @click="editBoat(index)">
          {{ boat.name }}
        </td>
        <td><div class="has-text-centered" @click="editBoat(index)"><i class="fas fa-edit"></i></div></td>
        <td><div class="has-text-centered" @click="remove(index)"><i class="fas fa-trash"></i></div></td>
      </tr>
    </table>
    <div class="buttons has-addons is-right">
      <button class="button is-small is-primary" @click="add()">Add</button>
    </div>
  </div>
</template>

<script>
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
    this.boats = JSON.parse(localStorage.getItem("_boats_"))
    if (!this.boats) {
      this.boats = []
    }
  },
  methods: {
    onEdit() {
      localStorage.setItem("_boats_", JSON.stringify(this.boats))
      this.edit = null
    },
    editBoat(index) {
      if (this.edit != index) {
        this.edit = index
      } else {
        this.edit = null
      }
    },
    remove(index) {
      this.boats.splice(index, 1)
      this.onEdit()
    },
    add() {
      this.boats.push({name: ""})
      this.edit =this.boats.length - 1
    }
  }
}
</script>

<style scoped>
</style>
