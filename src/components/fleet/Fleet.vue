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
      fleet: {}
    }
  },
  created() {
    this.fleetLayer = L.layerGroup()
    this.layerControl.addOverlay(this.fleetLayer, "<i class='fas fa-user-friends'></i> Fleet")
    EventBus.$on('dash-fleet', this.onFleet)
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
        fleet[f].id = uuidv4()
        if (!this.fleet[f]) {
          this.$set(this.fleet, f, fleet[f])
        } else {
          Object.keys(fleet[f]).forEach(k => {
            this.$set(this.fleet[f], k, fleet[f][k])
          })
        }
      }
    }
  }
}
</script>
