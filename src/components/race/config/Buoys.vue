<template>
  <div>
    <div class="card mb-3">
      <div class="card-content p-2">
        <div class="media mb-1">
          <div class="media-content">
            <div class="title is-4 mb-3">{{ race.name }}</div>
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
          <fieldset disabled>
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
                    <input class="input is-small" type="text" :value="startTime">
                  </p>
                  <p class="control">
                    <a class="button is-small is-static"><i class="fas fa-angle-right"></i></a>
                  </p>
                  <p class="control is-expanded">
                    <input class="input is-small" type="text" :value="endTime">
                  </p>
                </div>
              </div>
            </div>
          </fieldset>

          <!-- <bulma_calendar v-if="dates" type="datetime" v-model="dates" :options="calendarOptions" dialog range /> -->
          <div class="is-4">départ {{ fromNow(race.start_time) }}</div>
        </div>
      </div>
    </div>
    <!-- <div class="droptarget" v-for="(buoy, index) in buoys" :key="index" :draggable="edit && buoy.type !=='START' && buoy.type !== 'END'" @dragstart="dragstart(index)" @dragenter="dragenter(buoy, $event)" @dragover="dragover(buoy, $event)" @dragleave="dragleave(buoy, $event)" @dragend="dragend" @drop="drop(index, $event)">
      <Buoy :buoyInit="buoy" :index="index" :edit="edit"></Buoy>
    </div> -->

    <draggable v-model="buoys" draggable=".draggable" @change="moveBuoy">
      <Buoy :class="{draggable: edit && buoy.type !=='START' && buoy.type !== 'END'}" v-for="(buoy, index) in buoys" :key="index" :buoyInit="buoy" :index="index" :edit="edit"></Buoy>
    </draggable>
  </div>
</template>

<script>
const moment = require('moment');
import Buoy from './Buoy.vue'
import {EventBus} from '../../../event-bus.js';
//import bulma_calendar from "bulma-calendar/dist/components/vue/bulma_calendar.vue";
import polarService from '../../../lib/polar.js';
import draggable from 'vuedraggable'

export default {
  name: 'Buoys',
  components: {
    Buoy,
    draggable
  },
  props: {
    raceInit: Object,
  },
  data: function() {
    return {
      race: null,
      edit: false,
      dates: null,
      polars: null,
      buoys: [],
      dragBuoy: null,
      dropTarget: null,
      calendarOptions: {
        type: "datetime",
        lang: navigator.language || "fr-FR",
        color: "info",
        dateFormat: "dd/MM/yyyy",
        displayMode: "default",
        showFooter: true,
        weekStart: 1
      }
    }
  },
  created: function() {
    this.race = this.raceInit
    EventBus.$on('buoys', this.onBuoys)

    if (!this.polars)
      polarService.loadAll().then(polars => { this.polars = polars })

    this.dates = [new Date(this.race.start_time), new Date(this.race.end_time)]
  },
  watch: {
    raceInit: function() {
      this.race = this.raceInit
      this.dates = [new Date(this.race.start_time), new Date(this.race.end_time)]
    }
  },
  computed: {
    startTime: function() {
      return moment.utc(this.race.start_time).local().format('L LT')
    },
    endTime: function() {
      return moment.utc(this.race.end_time).local().format('L LT')
    },
  },
  methods: {
    fromNow(date) {
      return moment.utc(date).fromNow()
    },
    findDropTarget(target) {
      while (!target.classList || !target.classList.contains("droptarget")) {
        if(!target.parentElement) {
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

      // if (this.dropTarget.classList.contains("insert-before"))
      //   this.dropTarget.classList.remove("insert-before")
      // if (this.dropTarget.classList.contains("insert-after"))
      //   this.dropTarget.classList.remove("insert-after")
      // this.dropTarget = null
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
    moveBuoy(event) {
      if (event.moved) {
        console.log({from: event.moved.oldIndex, to: event.moved.newIndex})
        EventBus.$emit('order-buoy', {from: event.moved.oldIndex, to: event.moved.newIndex});
      }
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
  }
}
</script>

<style scoped>

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

<style>
.datetimepicker-clear-button {
  display: none;
}
.datetimepicker-dummy .datetimepicker-dummy-wrapper .datetimepicker-dummy-input:first-child {
  text-indent: 1.75rem !important;
}

.datetimepicker-dummy .datetimepicker-dummy-wrapper .datetimepicker-dummy-input {
  text-indent: 0.5rem !important;
}
</style>
