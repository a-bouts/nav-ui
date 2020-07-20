<template>
  <div></div>
</template>

<script>
import L from 'leaflet'
import 'leaflet.geodesic'

export default {
  name: 'Geodesic',
  props: {
    map: Object,
    from: Object,
    to: Object
  },
  data: function() {
    return {
      geodesic: null
    }
  },
  mounted: function() {
  },
  methods: {
    convertDMSToDD: function(coord) {
      return Number(coord.p) * (Number(coord.d) + Number(coord.m)/60 + Number(coord.s)/3600);
    },
    setGeodesic: function() {
      if(!this.from || !this.to) return
      const from = new L.LatLng(this.convertDMSToDD(this.from.lat), this.convertDMSToDD(this.from.lng))
      const to = new L.LatLng(this.to.latlons[0].lat, this.to.latlons[0].lon)
      if(this.geodesic) {
        this.geodesic.setLatLngs([from, to])
      } else {
        this.geodesic = L.geodesic([from, to], {weight: 1, opacity: 0.7}).addTo(this.map)
      }
    }
  },
  watch: {
    from: function() {
      this.setGeodesic()
    },
    to: function() {
      this.setGeodesic()
    }
  }
}
</script>
