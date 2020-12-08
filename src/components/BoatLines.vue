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
      sneakPosition: null,
      expes: {}
    }
  },
  mounted: function() {
    const self = this
    EventBus.$on('center-sneak', () => {this.center()})
    EventBus.$on('expes', (expes) => {this.expes = expes})

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
          params: {
            expes: this.expes
          },
          startTime: startTime,
          start: {
            lat: this.convertDMSToDD(this.current.position.lat.p, this.current.position.lat.d, this.current.position.lat.m, this.current.position.lat.s),
            lon: this.convertDMSToDD(this.current.position.lng.p, this.current.position.lng.d, this.current.position.lng.m, this.current.position.lng.s)
          },
          bearing: this.current.bearing,
          currentSail: this.current.sail,
          race: this.races[this.current.id],
          options: {
            sail: this.current.sails,
            foil: this.current.foil,
            hull: this.current.hull,
            winch: this.current.winch
          }
      }

      var url = '/route/api/v1/sneak'
      if (this.priv) {
        url = '/private/route/api/v1/sneak'
      }
      this.$http.post(url, params).then(response => {

        this.boatLines = response.body
        this.display()
      })
    },
    getTooltip: function(startTime, wl) {
      var date = new Date(startTime)
      date.setMinutes(date.getMinutes() + wl.duration * 60)

      const sails = ["Jib", "Spi", "Stay", "LJ", "C0", "HG", "LG"];

      const delta = Math.abs(date - new Date()) / 36e5;

      var j = Math.floor(delta / 24)
      var h = Math.floor(delta % 24)
      var m = Math.round(60 * (delta - j * 24 - h))
      if (m == 60) {
        m = 0
        h ++
      }
      if (h == 24) {
        h = 0
        j ++
      }

      var d = date > new Date()?"+":"-"
      if(j > 0) {
        d += j + "j"
      }
      if(h > 0) {
        if(d.length > 0) d += " "
        d += h + "h"
      }
      if(m > 0) {
        if(d.length > 0) d += " "
        d += m + "m"
      }

      var hrs = date.getHours();
      var min = date.getMinutes();
      if (min < 10) {
        min = "0" + min;
      }

      var primary = "<i class='fa fa-compass'></i> " + wl.bearing + "° <i class='fa fa-location-arrow'></i> " + wl.twa.toFixed(1) + "° <span class='sail'>" + sails[wl.sail] + "</span>";
      if(wl.ice) {
        primary += "<span class='ice'><i class='fas fa-igloo'></i></span>"
      } else if(wl.foil > 0) {
        //primary += "<span class='foil' style='color:rgb(255," + 255 * (wl.foil / 100) + "," + 255 * (wl.foil / 100) + ");'><i class='fa fa-fighter-jet'></i></span>"
        primary += "<span class='foil' style='opacity:" + (wl.foil) + "%;'><i class='fa fa-fighter-jet'></i></span>"
      }
      const secondary = "<i class='fa fa-wind'></i> " + wl.wind.toFixed(1) + "° " + wl.windSpeed.toFixed(1) + "kt <i class='fa fa-ship'></i> " + wl.boatSpeed.toFixed(1) + "kt";

      var res = '<div class="date"><span>' + d + '</span><span class="hour">' + hrs + ":" + min + '</span></div><div class="primary">' + primary + '</div>';
      if(secondary)
          res += '<div class="secondary">' + secondary + '</div>';

      return res;
    },
    displayLine: function(startTime, line, isTwa) {
      var path = [];
      const boatLine = line[this.bearing]

      var color = "#3bdbd5"
      var icon = new L.DivIcon({
          iconSize: new L.Point(20, 20),
          className: 'leaflet-div-icon leaflet-bearingline-icon leaflet-touch-icon'
      })
      if (isTwa) {
        color = "#ef1780"
        icon = new L.DivIcon({
           iconSize: new L.Point(20, 20),
           className: 'leaflet-div-icon leaflet-twaline-icon leaflet-touch-icon'
       })
     }

      for(var i in boatLine) {
        var wl = boatLine[i]
        const pt = wl
        L.marker([wl.lat, wl.lon], {icon: icon})
          .bindTooltip(this.getTooltip(startTime, wl), {permanent: false, opacity: 0.9, offset: L.point(0, 30), className: 'draw-tooltip', direction: 'right'})
          .on('click', () => {
            this.$emit('select', pt)
          })
          .addTo(this.linesLayer)
        path.push(new L.LatLng(wl.lat, wl.lon));
      }
      L.polyline(path, {color: color, weight: 1, smoothFactor: 2, lineJoin: 'round', opacity: 0.9}).addTo(this.linesLayer);
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

      this.$emit("move", {bearing: this.bearing, twa: this.boatLines.twa[this.bearing][0].twa})

      this.displayLine(this.boatLines.startTime, this.boatLines.bearing, false)
      this.displayLine(this.boatLines.startTime, this.boatLines.twa, true)
    }
  }
}
</script>
