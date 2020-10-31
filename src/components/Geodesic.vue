<template>
  <div></div>
</template>

<script>
import L from 'leaflet'
import 'leaflet.geodesic'
import {EventBus} from '../event-bus.js';

export default {
  name: 'Geodesic',
  props: {
    map: Object,
    from: Object
  },
  data: function() {
    return {
      layer: null,
      buoys: []
    }
  },
  mounted: function() {
    this.layer = L.layerGroup().addTo(this.map)
    EventBus.$on('buoys', this.onBuoys)
  },
  methods: {
    convertDMSToDD: function(coord) {
      return Number(coord.p) * (Number(coord.d) + Number(coord.m)/60 + Number(coord.s)/3600);
    },
    onBuoys: function(buoys) {
      this.buoys = buoys
      this.setGeodesic()
    },
    setGeodesic: function() {
      this.layer.clearLayers()

      if(!this.from) return

      var from = {lat: this.convertDMSToDD(this.from.lat), lon: this.convertDMSToDD(this.from.lng), wrap: 0}
      
      this.buoys.forEach(b => {
        if(b.type != "START" && !b.validated) {
          var to = b.latlons[0]
          if (b.latlons.length > 1) {
            to = {
              lat : (b.latlons[0].lat + b.latlons[1].lat) / 2,
              lon : (b.latlons[0].lon + b.latlons[1].lon) / 2
            }
          }
          to.wrap = b.wrap || 0
          this.addGeodesic(from, to)
          from = to
        }
      })
    },
    addGeodesic: function(from, to) {
      console.log("wrap", from.wrap, to.wrap)
      const fromLatLng = new L.LatLng(from.lat, from.lon + from.wrap * 360)
      const toLatLng = new L.LatLng(to.lat, to.lon + to.wrap * 360)
      L.geodesic([fromLatLng, toLatLng], {wrap: false, weight: 1, opacity: 0.7}).addTo(this.layer)
    }
  },
  watch: {
    from: function() {
      this.setGeodesic()
    }
  }
}
</script>
