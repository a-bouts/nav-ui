<template>
  <div>
    <Buoy v-for="(buoy, index) in buoys" :key="race + buoy.id" v-bind:raceLayer="raceLayer" v-bind:buoy="buoy" v-bind:editable="buoy.custom" v-bind:validated="isValidated(buoy.id)" v-on:move-buoy="onMoveBuoy(index, $event)" v-on:validate="onValidate(buoy, $event)"></Buoy>
  </div>
</template>

<script>
import dataService from '../lib/data.js'
import L from 'leaflet'
import 'leaflet-extra-markers'
import Buoy from './Buoy.vue'
import {EventBus} from '../event-bus.js'
import { v4 as uuidv4 } from 'uuid'

export default {
  name: 'Race',
  props: {
    race: String,
    boat: String,
    map: Object,
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
  created() {
    this.raceLayer = L.layerGroup()
    this.iceLimitsLayer = L.layerGroup().addTo(this.raceLayer)
    EventBus.$on('add-buoy', this.onAddBuoy)
    EventBus.$on('clear-buoy', this.onClearBuoy)
    EventBus.$on('up-buoy', this.onUpBuoy)
    EventBus.$on('down-buoy', this.onDownBuoy)
    EventBus.$on('remove-buoy', this.onRemoveBuoy)
    EventBus.$on('edit-buoy', this.onEditBuoy)
    EventBus.$on('pan', this.onPan)
  },
  mounted: function() {
    this.raceLayer.addTo(this.map)
    this.load()
  },
  computed: {
    buoys: function() {
      const it = this

      if(!this.races || !this.race)  return

      if(this.customBuoys && this.customBuoys.length > 0) {
        this.customBuoys.forEach(b => {
          b.validated = it.isValidated(b.id)
        });

        return this.customBuoys
      }

      var buoys = []
      buoys.push({id: "start", name: "start", type: "START", wrap: 0, latlons: [this.races[this.race].start], custom: false})

      this.races[this.race].waypoints.forEach(w => {
        var type = "WAYPOINT"
        if (w.latlons.length > 1)
          type = "DOOR"
        if (w.name == "end")
          type = "END"

        let latlons = []
        for(var l in w.latlons) {
          let lat = w.latlons[l].lat
          let lon = w.latlons[l].lon + (w.wrap ? w.wrap * 360 : 0)
          latlons.push({lat: lat, lon: lon})
        }
        buoys.push({id: w.name, name: w.name, type: type, wrap: 0, latlons: latlons, toAvoid: w.toAvoid, radius: w.radius, custom: false, validated: it.isValidated(w.name)})
      });

      return buoys
    }
  },
  watch: {
    race: function() {
      this.load()
    },
    boat: function() {
      this.load()
    }
  },
  methods: {
    load() {
      this.customBuoys = dataService.getBuoys(this.race)
      this.validated = dataService.getValidated(this.boat, this.race)
      EventBus.$emit('buoys', this.buoys)
      this.drawRace()
      this.drawIceLimits()
    },
    isValidated(id) {
      if(this.validated && this.validated.indexOf(id) >= 0) {
        return true
      }
      return false
    },
    drawIceLimits() {
      this.iceLimitsLayer.clearLayers()

      if(!this.races[this.race].ice_limits) {
        return
      }

      var latlngs = []
      for(var n = -1 ; n <= 1 ; n++) {
        this.races[this.race].ice_limits.south.forEach((item, i) => {
          if (n == -1 && i == 0) {
            latlngs.push([-90, item.lon + n * 360])
          }
          latlngs.push([item.lat, item.lon + n * 360])
          if (n == 1 && i == this.races[this.race].ice_limits.south.length - 1) {
            latlngs.push([-90, item.lon + n * 360])
          }
        })
      }
      L.polygon(latlngs, {color: 'white', weight: 1, opacity: 0.7}).addTo(this.iceLimitsLayer);

      latlngs = []
      for(n = -1 ; n <= 1 ; n++) {
        this.races[this.race].ice_limits.north.forEach((item, i) => {
          if (n == -1 && i == 0) {
            latlngs.push([90, item.lon + n * 360])
          }
          latlngs.push([item.lat, item.lon + n * 360])
          if (n == 1 && i == this.races[this.race].ice_limits.north.length - 1) {
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
    validateBuoy(marker) {
      marker.options.door.validated = !marker.options.door.validated;

      if(marker.options.door.validated === true) {
        if(!this.validated) this.validated = []
        this.validated.push(marker.options.door.name);
      } else {
        this.validated.splice(this.validated.indexOf(marker.options.door.name), 1);
      }
      dataService.saveValidated(this.boat, this.race, this.validated)

      this.drawRace()
    },
    onClearBuoy() {
      this.customBuoys = []
      dataService.cleanBuoys(this.race)
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
      dataService.saveBuoys(this.race, this.customBuoys)
      EventBus.$emit('buoys', this.buoys)
    },
    onValidate(buoy, validated) {
      if(validated) {
        if(!this.validated) this.validated = []
        this.validated.push(buoy.id);
      } else {
        this.validated.splice(this.validated.indexOf(buoy.id), 1);
      }
      buoy.validated = validated
      dataService.saveValidated(this.boat, this.race, this.validated)
      EventBus.$emit('buoys', this.buoys)

      this.drawRace()
    },
    onEditBuoy(buoy) {
      const it = this
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
    },
    onPan(boat) {
      var min_lat = boat.lat
      var max_lat = boat.lat
      var min_lon = boat.lon
      var max_lon = boat.lon

      this.buoys.forEach(buoy => {
        if (buoy.type == "START" || buoy.validated) {
          return
        }
        let w = buoy.wrap ? buoy.wrap * 360 : 0
        buoy.latlons.forEach(latlon => {
          min_lat = min_lat < latlon.lat ? min_lat : latlon.lat
          max_lat = max_lat > latlon.lat ? max_lat : latlon.lat
          min_lon = min_lon < latlon.lon + w ? min_lon : latlon.lon + w
          max_lon = max_lon > latlon.lon + w ? max_lon : latlon.lon + w
        })
      })

      this.map.flyToBounds([[min_lat, min_lon], [max_lat, max_lon]])
    }
  }
}
</script>
