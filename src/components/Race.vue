<template>
  <div>
    <Buoy v-for="(buoy, index) in buoys" :key="current.id + buoy.id" v-bind:raceLayer="raceLayer" v-bind:buoy="buoy" v-bind:editable="buoy.custom" v-bind:validated="isValidated(buoy.id)" v-on:move-buoy="onMoveBuoy(index, $event)" v-on:validate="onValidate(buoy, $event)"></Buoy>
  </div>
</template>

<script>
import L from 'leaflet'
import 'leaflet-extra-markers'
import Buoy from './Buoy.vue'
import {EventBus} from '../event-bus.js'
import { v4 as uuidv4 } from 'uuid'

export default {
  name: 'Race',
  props: {
    boat: String,
    map: Object,
    current: Object,
    races: Object
  },
  components: {
    Buoy,
  },
  data: function() {
    return {
      raceLayer: null,
      iceLimitsLayer: null,
      customBuoys: [],
      validated: []
    }
  },
  mounted: function() {
    this.raceLayer = L.layerGroup().addTo(this.map)
    this.iceLimitsLayer = L.layerGroup().addTo(this.raceLayer)
    EventBus.$on('add-buoy', this.onAddBuoy)
    EventBus.$on('clear-buoy', this.onClearBuoy)
    EventBus.$on('up-buoy', this.onUpBuoy)
    EventBus.$on('down-buoy', this.onDownBuoy)
    EventBus.$on('remove-buoy', this.onRemoveBuoy)
    EventBus.$on('edit-buoy', this.onEditBuoy)

  },
  computed: {
    buoys: function() {
      const it = this

      if(!this.races || !this.current || !this.current.id)  return

      if(this.customBuoys && this.customBuoys.length > 0) {
        this.customBuoys.forEach(b => {
          b.validated = it.isValidated(b.id)
        });

        return this.customBuoys
      }

      var buoys = []
      buoys.push({id: "start", name: "start", type: "START", wrap: 0, latlons: [this.races[this.current.id].start], custom: false})

      this.races[this.current.id].waypoints.forEach(w => {
        var type = "WAYPOINT"
        if (w.latlons.length > 1)
          type = "DOOR"
        if (w.name == "end")
          type = "END"
        buoys.push({id: w.name, name: w.name, type: type, wrap: w.wrap, latlons: w.latlons, radius: w.radius, custom: false, validated: it.isValidated(w.name)})
      });

      return buoys
    }
  },
  watch: {
    current: function() {
      //this.raceLayer.clearLayers()
      this.customBuoys = JSON.parse(localStorage.getItem("_buoys_" + this.current.id))
      this.validated = JSON.parse(localStorage.getItem("_validated_" + (this.boat ? this.boat + "_" : "") + this.current.id))
      EventBus.$emit('buoys', this.buoys)
      this.drawRace()
      this.drawIceLimits()
    }
  },
  methods: {
    isValidated(id) {
      if(this.validated && this.validated.indexOf(id) >= 0) {
        return true
      }
      return false
    },
    drawIceLimits() {
      this.iceLimitsLayer.clearLayers()

      if(!this.races[this.current.id].ice_limits) {
        return
      }

      var latlngs = []
      for(var n = -1 ; n <= 1 ; n++) {
        this.races[this.current.id].ice_limits.south.forEach((item, i) => {
          if (n == -1 && i == 0) {
            latlngs.push([-90, item.lon + n * 360])
          }
          latlngs.push([item.lat, item.lon + n * 360])
          if (n == 1 && i == this.races[this.current.id].ice_limits.south.length - 1) {
            latlngs.push([-90, item.lon + n * 360])
          }
        })
      }
      L.polygon(latlngs, {color: 'white', weight: 1, opacity: 0.7}).addTo(this.iceLimitsLayer);

      latlngs = []
      for(n = -1 ; n <= 1 ; n++) {
        this.races[this.current.id].ice_limits.north.forEach((item, i) => {
          if (n == -1 && i == 0) {
            latlngs.push([90, item.lon + n * 360])
          }
          latlngs.push([item.lat, item.lon + n * 360])
          if (n == 1 && i == this.races[this.current.id].ice_limits.north.length - 1) {
            latlngs.push([90, item.lon + n * 360])
          }
        })
      }
      L.polygon(latlngs, {color: 'white', weight: 2, opacity: 0.7}).addTo(this.iceLimitsLayer);

    },
    drawRace() {
      var it = this

      for(var j in it.buoys) {
        var b = it.buoys[j]
        if(b.type != "START" && !it.isValidated(b.id)) {
          it.$emit('nextdoor', b)
          break
        }
      }
    },
    redraw() {
      this.raceLayer.clearLayers()
      this.$forceUpdate()
    },
    validateBuoy(marker) {
      marker.options.door.validated = !marker.options.door.validated;

      if(marker.options.door.validated === true) {
        if(!this.validated) this.validated = []
        this.validated.push(marker.options.door.name);
      } else {
        this.validated.splice(this.validated.indexOf(marker.options.door.name), 1);
      }
      localStorage.setItem("_validated_" + (this.boat ? this.boat + "_" : "") + this.current.id, JSON.stringify(this.validated))

      this.drawRace()
    },
    onClearBuoy() {
      this.customBuoys = []
      localStorage.removeItem("_buoys_" + this.current.id)
      EventBus.$emit('buoys', this.buoys)
    },
    onAddBuoy() {
      if(!this.customBuoys || this.customBuoys.length == 0) {
          this.customBuoys = this.buoys
      }

      this.customBuoys.splice(this.customBuoys.length - 1, 0, {
        id: uuidv4(),
        name: "",
        type: "WAYPOINT",
        latlons: [{
          lat: this.map.getCenter().lat,
          lon: this.map.getCenter().lng
        }],
        custom: true
      })
      this.saveBuoys()
    },
    onUpBuoy(index) {
      var elt = this.customBuoys[index]
      this.customBuoys[index] = this.customBuoys[index - 1]
      this.customBuoys[index - 1] = elt

      this.customBuoys = [...this.customBuoys]
      this.saveBuoys()
    },
    onDownBuoy(index) {
      var elt = this.customBuoys[index]
      this.customBuoys[index] = this.customBuoys[index + 1]
      this.customBuoys[index + 1] = elt

      this.customBuoys = [...this.customBuoys]
      this.saveBuoys()
    },
    onRemoveBuoy(index) {
      this.customBuoys.splice(index, 1)
      this.saveBuoys()
    },
    onMoveBuoy(index, event) {
      this.customBuoys[index].latlons[event.index] = {
        lat: event.position.lat,
        lon: event.position.lng
      }
      this.saveBuoys()
    },
    saveBuoys() {
      localStorage.setItem("_buoys_" + this.current.id, JSON.stringify(this.customBuoys))
      EventBus.$emit('buoys', this.buoys)
    },
    onValidate(buoy, validated) {
      console.log("validate", buoy.id, validated)
      if(validated) {
        if(!this.validated) this.validated = []
        this.validated.push(buoy.id);
      } else {
        this.validated.splice(this.validated.indexOf(buoy.id), 1);
      }
      buoy.validated = validated
      localStorage.setItem("_validated_" + (this.boat ? this.boat + "_" : "") + this.current.id, JSON.stringify(this.validated))
      EventBus.$emit('buoys', this.buoys)

      this.drawRace()
    },
    onEditBuoy(buoy) {
      const it = this
      console.log(buoy)
      this.customBuoys.forEach(b => {
        if(b.id == buoy.id) {
          b.name = buoy.name
          if(buoy.type === "DOOR" && b.latlons.length < 2) {
            b.latlons.push({
              lat: it.map.getCenter().lat,
              lon: it.map.getCenter().lng
            })
          } else if(buoy.type === "WAYPOINT" && b.latlons.length == 2) {
            b.latlons.pop()
          }
          b.type = buoy.type
        }
      });
      this.saveBuoys()
    }
  }
}
</script>
