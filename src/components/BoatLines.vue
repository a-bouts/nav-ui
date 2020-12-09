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
      snakePosition: null,
      start: null,
      progs: [],
      expes: {}
    }
  },
  mounted: function() {
    const self = this
    EventBus.$on('center-snake', () => {this.center()})
    EventBus.$on('expes', (expes) => {this.expes = expes})

    this.layer = L.layerGroup().addTo(this.map)
    this.markerLayer = L.layerGroup().addTo(this.layer)
    this.linesLayer = L.layerGroup().addTo(this.layer)
    this.layerControl.addOverlay(this.layer, "<i class='fa fa-route'></i> Snake")
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
      this.go(this.current.position)
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
        it.snakePosition =  {
          lat: this.getLatLng().lat,
          lon: this.getLatLng().lng
        }
        it.display()
      })
      this.snakePosition = {
          lat: this.map.getCenter().lat,
          lon: this.map.getCenter().lng
      }
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
    onMouseMove: function(e) {
      var snakePosition = this.map.containerPointToLatLng(L.point(e.containerPoint.x, e.containerPoint.y))
      this.snakePosition = {
        lat: snakePosition.lat,
        lon: snakePosition.lng
      }

      this.display()
    },
    go: function(position) {
      if(!position)
        return

      this.start = {
        lat: this.convertDMSToDD(position.lat.p, position.lat.d, position.lat.m, position.lat.s),
        lon: this.convertDMSToDD(position.lng.p, position.lng.d, position.lng.m, position.lng.s)
      }

      if (!this.current || !this.current.id)
        return

      return this.startSnake()
    },
    evalSnake: function(params) {
      var url = '/route/api/v1/sneak'
      if (this.priv) {
        url = '/private/route/api/v1/sneak'
      }
      this.$http.post(url, params).then(response => {
        this.boatLines = response.body
        this.display()
      })
    },
    startSnake: function() {
      var startTime = new Date()
      startTime.setHours(startTime.getHours() + this.current.delay)
      if (this.settings && this.settings.routeLastUpdate === true) {
        startTime.setMilliseconds(0)
        startTime.setSeconds(0)
        startTime.setMinutes(startTime.getMinutes()  - startTime.getMinutes()%10)
      }

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
          race: this.races[this.current.id],
          options: {
            sail: this.current.sails,
            foil: this.current.foil,
            hull: this.current.hull,
            winch: this.current.winch
          }
      }

      return this.evalSnake(params)
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
          race: this.races[this.current.id],
          options: {
            sail: this.current.sails,
            foil: this.current.foil,
            hull: this.current.hull,
            winch: this.current.winch
          }
      }

      return this.evalSnake(params)
    },
    getTooltip: function(wl) {
      const sails = ["Jib", "Spi", "Stay", "LJ", "C0", "HG", "LG"];

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

      var primary = "<i class='fa fa-compass'></i> " + wl.bearing + "° <i class='fa fa-location-arrow'></i> " + wl.twa.toFixed(1) + "° <span class='sail'>" + sails[wl.sail] + "</span>";
      if(wl.ice) {
        primary += "<span class='ice'><i class='fas fa-igloo'></i></span>"
      } else if(wl.foil > 0) {
        //primary += "<span class='foil' style='color:rgb(255," + 255 * (wl.foil / 100) + "," + 255 * (wl.foil / 100) + ");'><i class='fa fa-fighter-jet'></i></span>"
        primary += "<span class='foil' style='opacity:" + (wl.foil) + "%;'><i class='fa fa-fighter-jet'></i></span>"
      }
      const secondary = "<i class='fa fa-wind'></i> " + wl.wind.toFixed(1) + "° " + wl.windSpeed.toFixed(1) + "kt <span style='padding-left: 10px'><i class='fa fa-ship'></i></span> " + wl.boatSpeed.toFixed(1) + "kt";

      var res = '<div class="date"><span>' + d + '</span><span class="hour">' + hrs + ":" + min + '</span></div><div class="primary" style="display: inline">' + primary + '</div>';
      if(secondary)
          res += '<div class="secondary">' + secondary + '</div>';

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
        L.marker([wl.lat, wl.lon], {icon: icon, zIndexOffset: isTwa ? 75 : 50})
          .bindTooltip(this.getTooltip(wl), {permanent: false, opacity: 0.9, offset: L.point(0, 30), className: 'draw-tooltip', direction: 'right'})
          .on('click', () => {
            if (pt.nbProgToKeep !== undefined) {
              var prev = this.progs[pt.nbProgToKeep].line[pt.i]
              if (pt.i > 0) {
                this.progs = this.progs.slice(0, pt.nbProgToKeep - -1)
                this.progs[pt.nbProgToKeep].line = this.progs[pt.nbProgToKeep].line.slice(0, pt.i - -1)
              } else {
                this.progs = this.progs.slice(0, pt.nbProgToKeep)
              }
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
      if(!this.snakePosition || !this.start) {
        this.$emit("move", null)
        return
      }

      var b = Math.round(this.bearingTo(this.start, this.snakePosition))
      if(b == 360) b = 0
      // if(this.bearing == b) {
      //   return
      // }
      this.bearing = b

      this.linesLayer.clearLayers()

      if (this.boatLines && this.boatLines.twa) {
        this.$emit("move", {bearing: this.bearing, twa: this.boatLines.twa[this.bearing][0].twa})

        this.displayProgs()
        this.displayLine(this.boatLines.startTime, this.boatLines.bearing[this.bearing], false)
        this.displayLine(this.boatLines.startTime, this.boatLines.twa[this.bearing], true)
      }
    }
  }
}
</script>
