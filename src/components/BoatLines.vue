<template>
  <div></div>
</template>

<script>
import dataService from '../lib/data.js';
import routeService from '../lib/route.js';
import L from 'leaflet'
import {EventBus} from '../event-bus.js';

export default {
  name: 'BoatLines',
  props: {
    race: String,
    settings: Object,
    map: Object,
    layerControl: Object,
    current: Object,
    priv: Boolean
  },
  data: function() {
    return {
      layer: null,
      markerLayer: null,
      linesLayer: null,
      boatLines: null,
      snakePosition: null,
      start: null,
      startTime: null,
      progs: [],
      expes: {}
    }
  },
  watch: {
    current: {
      deep: true,
      handler() {
        this.startSnake(this.params.startTime)
      }
    }
  },
  created: function() {
    this.layer = L.layerGroup()
    this.markerLayer = L.layerGroup().addTo(this.layer)
    this.linesLayer = L.layerGroup().addTo(this.layer)
    this.layerControl.addOverlay(this.layer, "<i class='fa fa-route'></i> Snake")

    EventBus.$on('center-snake', () => {this.center()})
    EventBus.$on('expes', (expes) => {this.expes = expes})
    EventBus.$on('boat', this.onBoat)
  },
  mounted: function() {
    const self = this

    this.layer.addTo(this.map)
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
  methods: {
    convertDMSToDD: function(p, d, m, s, wrap) {
      var res = Number(p) * (Number(d) + Number(m)/60 + Number(s)/3600)
      if (wrap === true && res < 0) {
        res += 360
      }
      return res
    },
    onBoat(latlon) {
      this.go(latlon)
    },
    center: function() {
      const it = this
      this.markerLayer.clearLayers()

      var lineMarker = L.ExtraMarkers.icon({ icon: 'fa-route', markerColor: 'black', shape: 'star', prefix: 'fa' })
      L.marker(this.map.getCenter(),
        {icon: lineMarker, draggable: true, zIndexOffset: 5000}
      ).addTo(this.markerLayer).on('drag', function() {
        it.moveSnake(this.getLatLng())
        it.evalSnake()
      })
      this.moveSnake(this.map.getCenter())
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

      var Δλ = toRadians(to.lon - from.lon)
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
    go: function(latlon) {
      if(!latlon)
        return

      this.start = {lat: latlon.lat, lon: latlon.lon}

      this.progs = []
      return this.startSnake(latlon.startTime)
    },
    moveSnake: function(snakePosition) {
      this.snakePosition = {
        lat: snakePosition.lat,
        lon: snakePosition.lng
      }
    },
    evalSnake: function() {
      if(!this.snakePosition || !this.start) {
        this.$emit("move", null)
        return
      }

      if(!this.params) {
        return
      }

      var b = Math.round(this.bearingTo(this.start, this.snakePosition))
      if(b == 360) b = 0
      this.bearing = b

      if (this.boatLines && this.boatLines.bearing && this.boatLines.bearing[this.bearing]) {
        this.display()
        return
      }

      routeService.evalSneak(this.params, this.bearing).then(res => {
        if (this.boatLines) {
          this.boatLines.bearing[this.bearing] = res.bearing[this.bearing]
          this.boatLines.twa[this.bearing] = res.twa[this.bearing]
        } else {
          this.boatLines = res
        }
        this.display()
      })
    },
    startSnake: function(startTime) {
      var duration = 24
      if (this.settings && this.settings.snakeDuration) {
        duration = this.settings.snakeDuration
      }

      const params = {
          params: {
            expes: this.expes,
            maxDuration: duration
          },
          startTime: startTime,
          start: this.start,
          bearing: this.current.bearing,
          currentSail: this.current.sail,
          race: dataService.getRace(this.race),
          options: {
            sail: this.current.sails,
            foil: this.current.foil,
            hull: this.current.hull,
            winch: this.current.winch
          }
      }

      this.params = params

      this.boatLines = null

      routeService.init(params).then(() => this.evalSnake())
    },
    addProg: function(from) {
      var prog = {
        isTwa: from.isTwa,
        line: []
      }
      var line = this.boatLines.bearing[this.bearing]
      if (from.isTwa) {
        line = this.boatLines.twa[this.bearing]
      }
      prog.startTime = line[0].date
      for (var i in line) {
        prog.line.push(line[i])
        if (line[i].duration == from.duration) {
          break
        }
      }

      this.progs.push(prog)

      EventBus.$emit('progs', this.progs)

      return this.nextSnake(from)
    },
    nextSnake: function(from) {

      var startTime = from.date

      var duration = 24
      if (this.settings && this.settings.snakeDuration) {
        duration = this.settings.snakeDuration
      }

      this.start = {
        lat: from.lat,
        lon: from.lon
      }

      const params = {
          params: {
            expes: this.expes,
            maxDuration: duration
          },
          startTime: startTime,
          start: this.start,
          bearing: from.bearing,
          currentSail: from.sail,
          race: dataService.getRace(this.race),
          options: {
            sail: this.current.sails,
            foil: this.current.foil,
            hull: this.current.hull,
            winch: this.current.winch
          }
      }

      this.params = params

      this.boatLines = null

      return this.evalSnake()
    },
    getTooltip: function(marker) {
      const sails = ["Jib", "Spi", "Stay", "LJ", "C0", "HG", "LG"];

      let wl = marker.options.wl

      const delta = Math.abs(wl.date - new Date()) / 36e5;

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

      var d = wl.date > new Date()?"+":"-"
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

      var hrs = wl.date.getHours();
      var min = wl.date.getMinutes();
      if (min < 10) {
        min = "0" + min;
      }

      var primary = ""
      if (wl.bearing !== undefined) {
        primary += "<i class='fa fa-compass'></i> " + wl.bearing.toFixed(1) + "° "
      }
      if (wl.twa !== undefined) {
        primary += "<i class='fa fa-location-arrow'></i> " + wl.twa.toFixed(1) + "° "
      }
      if (wl.sail !== undefined) {
        primary += "<span class='sail'>" + sails[wl.sail] + "</span>"
      }
      if(wl.ice === true) {
        primary += "<span class='ice'><i class='fas fa-igloo'></i></span>"
      } else if(wl.foil > 0) {
        primary += "<span class='foil' style='opacity:" + (wl.foil) + "%;'><i class='fa fa-fighter-jet'></i></span>"
      }
      var secondary = ""
      if (wl.wind && wl.windSpeed && wl.boatSpeed) {
        secondary += "<i class='fa fa-wind'></i> " + wl.wind.toFixed(1) + "° " + wl.windSpeed.toFixed(1) + "kt <span style='padding-left: 10px'><i class='fa fa-ship'></i></span> " + wl.boatSpeed.toFixed(1) + "kt"
      }

      var res = '<div class="date"><span>' + d + '</span><span class="hour">' + hrs + ":" + min + '</span></div><div class="primary" style="display: inline">' + primary + '</div>';
      if(secondary)
          res += '<div class="secondary">' + secondary + '</div>'

      return res;
    },
    displayLine: function(startTime, line, isTwa, prog) {
      var path = [];
      const boatLine = line

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
        var nbProgToKeep = prog
        if (i == 0 && !prog) {
          nbProgToKeep = this.progs.length - 1
        }

        var wl = boatLine[i]
        wl.i = i
        wl.isTwa = isTwa
        wl.nbProgToKeep = nbProgToKeep
        wl.date = new Date(startTime)
        wl.date.setMinutes(wl.date.getMinutes() + wl.duration * 60)

        const pt = wl
        L.marker([wl.lat, wl.lon], {icon: icon, zIndexOffset: isTwa ? 75 : 50, wl: pt})
          .bindTooltip(this.getTooltip, {permanent: false, opacity: 0.9, offset: L.point(0, 30), className: 'draw-tooltip', direction: 'right'})
          .on('click', () => {
            if (pt.nbProgToKeep !== undefined) {
              var prev = this.progs[pt.nbProgToKeep].line[pt.i]
              if (pt.i > 0) {
                this.progs = this.progs.slice(0, pt.nbProgToKeep - -1)
                this.progs[pt.nbProgToKeep].line = this.progs[pt.nbProgToKeep].line.slice(0, pt.i - -1)
              } else {
                this.progs = this.progs.slice(0, pt.nbProgToKeep)
              }
              EventBus.$emit('progs', this.progs)
              this.$emit('select', prev)
              this.nextSnake(prev)
            } else {
              this.$emit('select', pt)
              this.addProg(pt)
            }
          })
          .addTo(this.linesLayer)
        path.push(new L.LatLng(wl.lat, wl.lon));
      }
      L.polyline(path, {color: color, weight: 1, smoothFactor: 2, lineJoin: 'round', opacity: 0.9}).addTo(this.linesLayer);
    },
    displayProgs() {
      for (var i in this.progs) {
        this.displayLine(this.progs[i].startTime, this.progs[i].line, this.progs[i].isTwa, i)
      }
    },
    display: function() {
      this.linesLayer.clearLayers()

      if (this.boatLines && this.boatLines.twa && this.boatLines.twa[this.bearing]) {
        this.$emit("move", {bearing: this.bearing, twa: this.boatLines.twa[this.bearing][0].twa})

        this.displayProgs()
        this.displayLine(this.boatLines.startTime, this.boatLines.bearing[this.bearing], false)
        this.displayLine(this.boatLines.startTime, this.boatLines.twa[this.bearing], true)
      }
    }
  }
}
</script>
