<template>
  <div></div>
</template>

<script>
import L from 'leaflet'
import {EventBus} from '../event-bus.js';

export default {
  name: 'BoatLines',
  props: {
    settings: Object,
    map: Object,
    layerControl: Object,
    current: Object,
    races: Object,
    priv: Boolean
  },
  data: function() {
    return {
      layer: null,
      markerLayer: null,
      linesLayer: null,
      boatLines: null,
      sneakPosition: null
    }
  },
  mounted: function() {
    const self = this
    EventBus.$on('center-sneak', () => {this.center()})

    this.layer = L.layerGroup().addTo(this.map)
    this.markerLayer = L.layerGroup().addTo(this.layer)
    this.linesLayer = L.layerGroup().addTo(this.layer)
    this.layerControl.addOverlay(this.layer, "<i class='fa fa-route'></i> Sneak")
    this.map.on("overlayremove", function(event) {
      if (event.layer === self.layer) {
        self.$emit("move", null)
        self.bearing = -1
      }
    })
    this.map.on("overlayadd", function(event) {
      if (event.layer === self.layer) {
        self.display()
      }
    })

    this.center()
  },
  watch: {
    current: function() {
      this.go()
    }
  },
  methods: {
    convertDMSToDD: function(p, d, m, s) {
      return Number(p) * (Number(d) + Number(m)/60 + Number(s)/3600);
    },
    convertDDToDMS: function(D){
      return {
        p : D<0?-1:1,
        d : 0|(D<0?D=-D:D),
        m : 0|D%1*60,
        s :(0|D*60%1*6000)/100
      };
    },
    center: function() {
      const it = this
      this.markerLayer.clearLayers()

      var lineMarker = L.ExtraMarkers.icon({ icon: 'fa-route', markerColor: 'black', shape: 'star', prefix: 'fa' })
      L.marker(this.map.getCenter(),
        {icon: lineMarker, draggable: true, zIndexOffset: 5000}
      ).addTo(this.markerLayer).on('drag', function() {
        it.sneakPosition = this.getLatLng();
        it.display()
      })
      this.sneakPosition = this.map.getCenter()
    },
    bearingTo: function(from, to) {
      const toRadians = (a) => a * π / 180.0
      const toDegrees = (a) => a * 180.0 / π
      const wrap360 = (d) => {
        if (0.0 <= d && d < 360.0) {
          return d
        }
        return (d + 360)%360
      }

      const π = Math.PI

      const φ1 = toRadians(from.lat)
      const φ2 = toRadians(to.lat)

      var Δλ = toRadians(to.lng - from.lng)
      if (Math.abs(Δλ) > π) {
        if (Δλ > 0) {
          Δλ = -(2*π - Δλ)
        } else {
          Δλ = (2*π + Δλ)
        }
      }

      const Δψ = Math.log(Math.tan(φ2/2+π/4) / Math.tan(φ1/2+π/4))

      const θ = Math.atan2(Δλ, Δψ)

      const b = toDegrees(θ)

      return wrap360(b)
    },
    onMouseMove: function(e) {
      this.sneakPosition = this.map.containerPointToLatLng(L.point(e.containerPoint.x, e.containerPoint.y))

      this.display()
    },
    go: function() {
      if(!this.current || !this.current.position)
        return

        var startTime = new Date()
        startTime.setHours(startTime.getHours() + this.current.delay)
        if (this.settings && this.settings.routeLastUpdate === true) {
          startTime.setMilliseconds(0)
          startTime.setSeconds(0)
          startTime.setMinutes(startTime.getMinutes()  - startTime.getMinutes()%10)
        }

        console.log("RUN AT ", startTime.toString())

      const params = {
          start: {
            lat: this.convertDMSToDD(this.current.position.lat.p, this.current.position.lat.d, this.current.position.lat.m, this.current.position.lat.s),
            lon: this.convertDMSToDD(this.current.position.lng.p, this.current.position.lng.d, this.current.position.lng.m, this.current.position.lng.s)
          },
          bearing: this.current.bearing,
          currentSail: this.current.sail,
          race: this.races[this.current.id],
          delta: this.current.delta,
          maxDuration: 480.0,
          delay: this.current.delay,
          startTime: startTime,
          sail: this.current.sails,
          foil: this.current.foil,
          hull: this.current.hull,
          winch: this.current.winch,
          malus: 1.0,
          stop: this.current.stop
      }

      var url = '/debug/nav/boatlines'
      if (this.priv) {
        url = '/private/nav/boatlines'
      }
      this.$http.post(url, params).then(response => {

        this.boatLines = response.body
        this.display()
      })
    },
    display: function() {
      if(!this.sneakPosition || !this.current || !this.current.position) {
        this.$emit("move", null)
        return
      }

      const start = {
        lat: this.convertDMSToDD(this.current.position.lat.p, this.current.position.lat.d, this.current.position.lat.m, this.current.position.lat.s),
        lng: this.convertDMSToDD(this.current.position.lng.p, this.current.position.lng.d, this.current.position.lng.m, this.current.position.lng.s)
      }

      var b = Math.round(this.bearingTo(start, this.sneakPosition))
      if(b == 360) b = 0
      if(this.bearing == b) {
        return
      }
      this.bearing = b

      this.linesLayer.clearLayers()

      this.$emit("move", {bearing: this.bearing, twa: this.boatLines[1][this.bearing].twa})

      for(var l in this.boatLines) {
        var path = [];
        const boatLine = this.boatLines[l][this.bearing].line
        for(var i in boatLine) {
          path.push(new L.LatLng(boatLine[i].lat, boatLine[i].lon));
        }
        var color = "#3bdbd5"
        var icon = new L.DivIcon({
            iconSize: new L.Point(5, 5),
            className: 'leaflet-div-icon leaflet-bearingline-icon leaflet-touch-icon'
        })
        if (l == 1) {
          color = "#ef1780"
          icon = new L.DivIcon({
             iconSize: new L.Point(5, 5),
             className: 'leaflet-div-icon leaflet-twaline-icon leaflet-touch-icon'
         })
       }
        L.polyline(path, {color: color, weight: 1, smoothFactor: 2, lineJoin: 'round', opacity: 0.9}).addTo(this.linesLayer);
        for(var p in path) {
          L.marker([path[p].lat, path[p].lng], {icon: icon}).addTo(this.linesLayer)
        }
      }
    }
  }
}
</script>
