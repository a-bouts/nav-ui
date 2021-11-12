<template>
  <div>
    <Boat v-for="boat in fleet" :key="boat.id" v-bind:fleetLayer="fleetLayer" v-bind:boat="boat"></Boat>
  </div>
</template>

<script>
import L from 'leaflet'
import Boat from './Boat.vue'
import {EventBus} from '../../event-bus.js'
import { v4 as uuidv4 } from 'uuid'

export default {
  name: 'Fleet',
  props: {
    map: Object,
    layerControl: Object,
  },
  components: {
    Boat,
  },
  data: function() {
    return {
      fleetLayer: null,
      fleet: {},
      race: null
    }
  },
  created() {
    this.fleetLayer = L.layerGroup()
    this.layerControl.addOverlay(this.fleetLayer, "<i class='fas fa-user-friends'></i> Fleet")
    EventBus.$on('dash-fleet', this.onFleet)
    EventBus.$on("race-selected", (message) => {
      this.race = message.race
    })
  },
  mounted: function() {
    this.map.addControl( new L.Control.Search({
      layer: this.fleetLayer,
      propertyLoc: ['boat.pos.lat', 'boat.pos.lon'],
      propertyName: 'boat.displayName',
      hideMarkerOnCollapse: true,
      firstTipSubmit: true,
      initial: false
    }) )
    // this.fleetLayer.addTo(this.map)
  },
  methods: {
    onFleet(fleet) {
      for(var f in fleet) {
        this.collectWindData(fleet[f])
        fleet[f].id = uuidv4()
        if (!this.fleet[f]) {
          this.$set(this.fleet, f, fleet[f])
        } else {
          Object.keys(fleet[f]).forEach(k => {
            this.$set(this.fleet[f], k, fleet[f][k])
          })
        }
      }
    },
    collectWindData(boat) {
      console.log("\"" + boat.displayName + "\"", boat)

      let boatId = boat.displayName.replace(/[^0-9a-zA-Z]+/g, "-");

      fetch('/boats/' + boatId + '/races/' + this.race + '/infos', {
        method: "POST",
        body: JSON.stringify({
          id: boatId,
          timestamp: boat.ts,
          displayName: boat.displayName,
          lat: boat.pos.lat,
          lon: boat.pos.lon,
          rank: boat.rank,
          boatSpeed: boat.bs,
          heading: boat.heading,
          sail: boat.sail,
          twa: boat.twa,
          windDirection: boat.wd,
          windSpeed: boat.ws
        }),
        headers: {
          "Content-type": "application/json; charset=UTF-8"
        }
      })
      .then(response => response.json())
      .then(json => console.log(json))

    }
  }
}
</script>
