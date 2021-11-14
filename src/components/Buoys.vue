<template>
  <div>
    <div class="card mb-3">
      <div class="card-content p-2">
        <div class="media mb-1">
          <div class="media-content">
            <div class="columns is-gapless is-vcentered">
              <div class="column">
                <div class="subtitle is-6">race</div>
              </div>
              <div class="column">
                <div class="title is-4">race</div>
              </div>
            </div>
          </div>
          <div class="media-right">
            <button v-show="!edit" class="button is-small is-white" @click="editMode(true)">
              <span class="icon is-small">
                <i class="far fa-edit"></i>
              </span>
            </button>
            <button v-show="edit" class="button is-small is-white" @click="reset">
              <span class="icon is-small">
                <i class="fas fa-sync"></i>
              </span>
            </button>
            <button v-show="edit" class="button is-small is-white" @click="add">
              <span class="icon is-small">
                <i class="fas fa-plus"></i>
              </span>
            </button>
            <button v-show="edit" class="button is-small is-white" @click="editMode(false)">
              <span class="icon is-small">
                <i class="fas fa-times"></i>
              </span>
            </button>
          </div>
        </div>

        <div class="content">
        </div>
      </div>
    </div>
    <div class="droptarget" v-for="(buoy, index) in buoys" :key="index" :draggable="edit && buoy.type !=='START' && buoy.type !== 'END'" @dragstart="dragstart(index)" @dragenter="dragenter(buoy, $event)" @dragover="dragover(buoy, $event)" @dragleave="dragleave(buoy, $event)" @dragend="dragend" @drop="drop(index, $event)">
      <div class="card mb-3">
        <div class="card-content p-2">
          <div class="media mb-1">
            <div class="media-content">
              <div class="columns is-gapless is-vcentered">
                <div class="column">
                  <div v-if="!edit || buoy.type === 'START'" class="subtitle is-6">{{ buoy.type }}</div>
                  <div v-if="edit && buoy.type !== 'START' && buoy.type !== 'END'" class="select is-small">
                    <select v-model="buoy.type" @change="onEdit(buoy)">
                      <option value="DOOR">DOOR</option>
                      <option value="WAYPOINT">WAYPOINT</option>
                    </select>
                  </div>
                  <div v-if="edit && buoy.type === 'END'" class="is-small">
                    <label class="checkbox">
                      <input type="checkbox" :checked="buoy.latlons.length > 1" @change="endIsADoor(buoy)">
                      Door
                    </label>
                  </div>
                </div>
                <div class="column">
                  <div v-if="!edit || buoy.type === 'START' || buoy.type === 'END'" class="title is-4">{{ buoy.name }}</div>
                  <input v-if="edit && buoy.type !== 'START' && buoy.type !== 'END'" v-model="buoy.name" @change="onEdit(buoy)" class="input is-small" type="text">
                </div>
              </div>
            </div>
            <div class="media-right">
              <button v-show="edit && buoy.type !== 'START' && buoy.type !== 'END'" class="button is-small is-white" @click="remove(index)">
                <span class="icon is-small">
                  <i class="fas fa-trash"></i>
                </span>
              </button>
            </div>
          </div>

          <div class="content">
            <div class="columns is-gapless is-vcentered">
              <div class="column">
                <div v-for="(b, index) in buoy.latlons" :key="index">
                  <span class="icon-text"><span class="icon">
                    <i v-show="buoy.type === 'START'" class="fas fa-square-full start"></i>
                    <i v-show="buoy.type === 'END'" class="fas fa-square-full end" :class="{'end-left': buoy.latlons.length > 1 && index == 0, 'end-right': buoy.latlons.length > 1 && index == 1}"></i>
                    <i v-show="buoy.type === 'WAYPOINT'" class="fas fa-square-full buoy"></i>
                    <i v-show="buoy.type === 'DOOR'" class="fas fa-square-full" :class="{'door-left': index == 0, 'door-right': index == 1}"></i>
                  </span>
                  <span>{{ b.lat }} - {{ b.lon }}</span></span>
                </div>
                <div v-if="buoy.type === 'END' && buoy.latlons.length == 1">
                  <span class="icon-text">
                    <span class="icon">
                      <i class="far fa-circle"></i>
                    </span>
                    <span v-show="!edit">{{ buoy.radius }} milles</span>
                    <span v-show="edit">
                      <div class="field has-addons">
                        <p class="control">
                          <a class="button  is-small is-static">
                            NM
                          </a>
                        </p>
                        <p class="control">
                          <input v-model="buoy.radius" @change="onEdit(buoy)" class="input is-small" type="text">
                        </p>
                      </div>
                    </span>
                  </span>
                </div>
              </div>
              <div class="column is-narrow">
                <button v-show="edit && buoy.type == 'DOOR'" class="button is-small is-white" @click="reverse(buoy)">
                  <span class="icon is-small">
                    <i class="fas fa-random"></i>
                  </span>
                </button>
                <!-- <span class="icon"><i v-if="buoy.latlons.length > 1" class="fas fa-lg fa-random"></i></span> -->
              </div>
            </div>
          </div>
        </div>
      </div>
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
      edit: false,
      buoys: [],
      dragBuoy: null,
      dropTarget: null,
    }
  },
  mounted: function() {
    EventBus.$on('buoys', this.onBuoys)
  },
  methods: {
    findDropTarget(target) {
      while (!target.classList || !target.classList.contains("droptarget")) {
        if(!target.parentElement) {
          console.log("OUPSSS")
          return null
        }
        target = target.parentElement
      }
      return target
    },
    dragstart(buoy) {
      this.dragBuoy = buoy
    },
    dragenter(buoy, event) {
      var target = this.findDropTarget(event.target)
      if (!target)
        return

      if (this.dropTarget) {
        this.dropTarget.classList.remove("insert-before")
      }

      if (buoy.type == 'START')
        return

      this.dropTarget = target
      this.dropTarget.classList.add("insert-before")
    },
    dragover(buoy, event) {
      event.preventDefault()

      // var target = this.findDropTarget(event.target)
      // if (!target)
      //   return

      // console.log("dragover", buoy.name, event)
      //
      // if (event.layerY - event.target.offsetTop < event.target.clientHeight / 2) {
      //   if (event.target.classList.contains("insert-after"))
      //     event.target.classList.remove("insert-after")
      //   if (!event.target.classList.contains("insert-before"))
      //     event.target.classList.add("insert-before")
      // } else {
      //   if (event.target.classList.contains("insert-before"))
      //     event.target.classList.remove("insert-before")
      //   if (!event.target.classList.contains("insert-after"))
      //     event.target.classList.add("insert-after")
      // }

      return false
    },
    dragleave(buoy, event) {
      console.log("dragleave", buoy.name, event.target)

      // var target = this.findDropTarget(event.target)
      // if (!target)
      //   return

      if (this.dropTarget.classList.contains("insert-before"))
        this.dropTarget.classList.remove("insert-before")
      if (this.dropTarget.classList.contains("insert-after"))
        this.dropTarget.classList.remove("insert-after")
      this.dropTarget = null
    },
    dragend() {
      this.dragBuoy = null
      if (this.dropTarget) {
        this.dropTarget.classList.remove("insert-before")
        this.dropTarget = null
      }
    },
    drop(buoyIndex, event) {
      event.stopPropagation();
      if (buoyIndex > 0)
        EventBus.$emit('order-buoy', {from: this.dragBuoy, to: buoyIndex});
      return false;
    },
    onBuoys(buoys) {
      this.buoys = buoys
    },
    editMode(edit) {
      this.edit = edit
      EventBus.$emit('edit-mode', edit)
    },
    add() {
      EventBus.$emit('add-buoy')
    },
    reset() {
      this.editMode(false)
      EventBus.$emit('clear-buoy')
    },
    remove(index) {
      EventBus.$emit('remove-buoy', index)
    },
    onEdit(buoy) {
      EventBus.$emit('edit-buoy', buoy)
    },
    reverse(buoy) {
      console.log("reverse", buoy.name)
      buoy.latlons = [
        buoy.latlons[1],
        buoy.latlons[0]
      ]
      this.onEdit(buoy)
    },
    save() {
      this.$emit('buoys', this.buoys)
    },
    setBuoy(index, buoy) {
      this.customBuoys[index] = buoy
    },
    editBuoy(buoy) {
      if(this.edit == buoy.id) {
        this.edit = null
      } else {
        this.edit = buoy.id
      }
    },
    endIsADoor(buoy) {
      if (buoy.latlons.length == 1) {
        buoy.latlons.push({
          lat: 0,
          lon: 0
        })
      } else {
        buoy.latlons.pop()
      }
      this.onEdit(buoy)
    }
  }
}
</script>

<style scoped>
.start {
  color: #008c38;
}
.buoy {
  color: #f5b72f;
}
.door-left {
  color: #9c272b;
}
.door-right {
  color: #008c38;
}
.end {
  color: #ee8b1c;
}
.end-left {
  color: #9c272b;
}
.end-right {
  color: #008c38;
}

.droptarget * {
  /* pointer-events: none; */
}

.insert-before::before,
.insert-after::after {
  content: "";

  background-color: white;
  height: 75px;
  display: block;
  border-radius: 0.25rem;
  border-style: dashed;
  box-shadow: 0 0.5em 1em -0.125em rgba(10, 10, 10, 0.1), 0 0px 0 1px rgba(10, 10, 10, 0.02);
  color: #4a4a4a;
  max-width: 100%;
  position: relative;
  margin-bottom: 0.75rem;
  opacity: 50%;
}
</style>
