<template>
  <div></div>
</template>

<script>
import L from 'leaflet'
import dateFormat from 'dateformat'
import {EventBus} from '../event-bus.js'
import { compress as lzStringCompress, decompress as lzStringDecompress } from 'lz-string'

export default {
  name: 'Route',
  props: {
    settings: Object,
    debug: Boolean,
    priv: Boolean,
    race: String,
    boat: String,
    map: Object,
    layerControl: Object,
    current: Object,
    races: Object
  },
  data: function() {
    const squareSize = 20
    const roundSize = 20
    const _editIcon = new L.DivIcon({
                    iconSize: new L.Point(squareSize, squareSize),
                    shadowSize: new L.Point(squareSize + 4, squareSize + 4),
                    className: 'leaflet-div-icon leaflet-editing-icon leaflet-touch-icon'
    })
    const _changedIcon = new L.DivIcon({
                    iconSize: new L.Point(roundSize, roundSize),
                    className: 'leaflet-div-icon leaflet-editing-icon leaflet-touch-icon changed'
    })
    const _nightIcon = new L.DivIcon({
                    iconSize: new L.Point(squareSize, squareSize),
                    className: 'leaflet-div-icon leaflet-editing-icon leaflet-touch-icon night'
    })
    const _nightChangedIcon = new L.DivIcon({
                    iconSize: new L.Point(roundSize, roundSize),
                    className: 'leaflet-div-icon leaflet-editing-icon leaflet-touch-icon night-changed'
    })
    const _icon = new L.DivIcon({
                    iconSize: new L.Point(20, 20),
                    className: 'leaflet-div-icon leaflet-editing-icon leaflet-touch-icon standard'
    })
    const _darkIcon = new L.DivIcon({
                    iconSize: new L.Point(20, 20),
                    className: 'leaflet-div-icon leaflet-editing-icon leaflet-touch-icon dark'
    })
    return {
      night: {
        sunset: 21*60,
        dawn: 7*60
      },
      last: null,
      isochrones: null,
      previous: null,
      isoLayer: null,
      previousLayer: null,
      markers: [],
      editIcon: _editIcon,
      changedIcon: _changedIcon,
      nightIcon: _nightIcon,
      nightChangedIcon: _nightChangedIcon,
      icon: _icon,
      darkIcon: _darkIcon,
      routeBuoys: null,
      expes: {},
      position: null
    }
  },
  created() {
    this.isoLayer = L.layerGroup()

    if (this.settings && this.settings.sunset && this.settings.dawn) {
      this.night.sunset = this.settings.sunset.split(":")[0] * 60 - -1*this.settings.sunset.split(":")[1]
      this.night.dawn = this.settings.dawn.split(":")[0] * 60 - -1*this.settings.dawn.split(":")[1]
    }

    EventBus.$on('buoys', (buoys) => {this.routeBuoys = buoys})
    EventBus.$on('expes', (expes) => {this.expes = expes})

    EventBus.$on('boat', (position) => {this.position = position})
  },
  mounted: function() {
    this.isoLayer.addTo(this.map)
    this.load()
    setTimeout(() => this.loadIsochones())
  },
  watch: {
    race: function() {
      this.load()
      setTimeout(() => this.loadIsochones())
    },
    boat: function() {
      this.load()
      setTimeout(() => this.loadIsochones())
    }
  },
  methods: {
    load() {
      this.isoLayer.eachLayer((layer) => {
        this.layerControl.removeLayer(layer)
      })
      this.isoLayer.clearLayers()

      this.last = JSON.parse(localStorage.getItem("_last_" + ((this.boat && this.boat != "-") ? this.boat + "_" : "") + this.race))

      if(this.last) {
        this.last.date = new Date(this.last.date)
        this.drawRoute()
        EventBus.$emit('route', this.last)
      }

      var previous = JSON.parse(localStorage.getItem("_previous_" + ((this.boat && this.boat != "-") ? this.boat + "_" : "") + this.race))

      if(previous && previous.length > 0) {
        this.previousLayer = L.layerGroup().addTo(this.isoLayer)
        this.layerControl.addOverlay(this.previousLayer, "<i class='fas fa-history'></i> History");

        this.previous = previous[0]
        this.previous.date = new Date(this.previous.date)
        this.drawPreviousRoute()
      }
    },
    loadIsochones() {
      try {
        this.isochrones = JSON.parse(lzStringDecompress(localStorage.getItem("_last_isochrones_" + ((this.boat && this.boat != "-") ? this.boat + "_" : "") + this.race)))
        if(this.isochrones) {
          this.drawIsochrones()
        }
      } catch (e)  {
        console.log("error loading isochrones")
      }
    },
    convertDMSToDD: function(p, d, m, s, wrap) {
      var res = Number(p) * (Number(d) + Number(m)/60 + Number(s)/3600)
      if (wrap === true && res < 0) {
        res += 360
      }
      return res
    },
    go: function() {

      console.log("RUN AT ", this.position.startTime.toString())

      const params = {
          expes: this.expes,
          start: {
            lat: this.position.lat,
            lon: this.position.lon
          },
          bearing: this.current.bearing,
          currentSail: this.current.sail,
          race: {...this.races[this.race]},
          delta: this.current.delta,
          maxDuration: 1728.0,
          startTime: this.position.startTime,
          sail: this.current.sails,
          foil: this.current.foil,
          hull: this.current.hull,
          winch: this.current.winch,
          malus: 1.0,
          stop: this.current.stop
      }

      if(this.routeBuoys) {
        params.race.waypoints = this.routeBuoys.slice(1, this.routeBuoys.length)
      }

      this.$emit('loading', true)
      var url = '/debug/nav/run'
      if (this.priv) {
        url = '/private/nav/run'
      }
      this.$http.post(url, params).then(response => {

        this.isoLayer.eachLayer((layer) => {
          this.layerControl.removeLayer(layer)
        })
        this.isoLayer.clearLayers()
        if (this.last) {
          this.previousLayer = L.layerGroup().addTo(this.isoLayer)
          this.layerControl.addOverlay(this.previousLayer, "<i class='fas fa-history'></i> History");
        }

        this.displayNotification(response.body.sumup)

        var navs = response.body.navs

        var windline = response.body.windline

        this.last = {
          date: this.position.startTime,
          sumup: response.body.sumup,
          windline: windline
        }
        this.isochrones = navs
        this.saveRoute()
        this.drawRoute()
        this.drawIsochrones()
        if (this.previous) {
          this.drawPreviousRoute()
        }
      }, () => {
        this.$emit('error', {
            level: "error",
            duration: 20000,
            message: "An error occured. Please retry"
        })
      }).finally(() => {
        this.$emit('loading', false)
      })
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
    drawRoute: function() {
      this.markers.splice(0, this.markers.length);
      for(var w in this.last.windline) {
        var wl = this.last.windline[w];

        var date = new Date(this.last.date.getTime())
        date.setMinutes(date.getMinutes() + wl.duration * 60);
        wl.date = date
        if(date.getHours() * 60 + date.getMinutes() > this.night.sunset || date.getHours() * 60 + date.getMinutes() < this.night.dawn) {
            wl.night = true
        }
        var icon = this.editIcon
        if(wl.change === true)
          icon = this.changedIcon
        if(wl.night === true)
          if(wl.change === true)
            icon = this.nightChangedIcon
          else
            icon = this.nightIcon
        const pt = wl
        var marker = L.marker([wl.lat, wl.lon], {icon: icon, zIndexOffset: 25, wl: pt})
          .bindTooltip(this.getTooltip, {permanent: false, opacity: 0.9, offset: L.point(0, 30), className: 'draw-tooltip', direction: 'right'})
          .on('click', () => {
            this.$emit('select', pt)
          })
          .addTo(this.isoLayer)
        this.markers.push(marker)
      }
      var polylineOptions = {
        color: 'green',
        weight: 2,
        smoothFactor: 2,
        lineJoin: 'round'
      }
      L.polyline(this.last.windline, polylineOptions).addTo(this.isoLayer)
      this.$emit('select', this.last.windline[this.last.windline.length-1])
    },
    drawPreviousRoute: function() {
      if (!this.previous) {
        return
      }
      for(var w in this.previous.windline) {
        var wl = this.previous.windline[w];

        var date = new Date(this.previous.date.getTime())
        date.setMinutes(date.getMinutes() + wl.duration * 60);
        wl.date = date
        if(date.getHours() > this.night.sunset || date.getHours() < this.night.dawn) {
            wl.night = true
        }
        var icon = this.darkIcon
        const pt = wl
        L.marker([wl.lat, wl.lon], {icon: icon, wl: pt})
          .bindTooltip(this.getTooltip, {permanent: false, opacity: 0.7, offset: L.point(0, 30), className: 'draw-tooltip', direction: 'right'})
          .on('click', () => {
            this.$emit('select', pt)
          })
          .addTo(this.previousLayer)
      }
      var polylineOptions = {
        color: '#777777',
        weight: 1,
        smoothFactor: 2,
        lineJoin: 'round',
        opacity: 0.7
      }
      L.polyline(this.previous.windline, polylineOptions).addTo(this.previousLayer)
    },
    drawIsochrones: function() {
      const navs = this.isochrones
      var first = true
      for(var d in navs) {
        var layer = L.layerGroup().addTo(this.isoLayer);
        this.layerControl.addOverlay(layer, "<i class='fas fa-map-marker-alt'></i> " + navs[d].name);
        if (!first) {
          this.map.removeLayer(layer)
        }
        first = false
        for(var iso in navs[d].isochrones) {
            for(var i in navs[d].isochrones[iso].paths) {
                var path = [];
                // if(false && iso >= 19 && iso <= 20) {
                //     for(var j in navs[d].isochrones[iso].paths[i]) {
                //          path.push(navs[d].isochrones[iso].paths[i][j].latlon);
                //     }
                //     L.Polyline.Plotter(path, {color: navs[d].isochrones[iso].color, weight: 1, smoothFactor: 2, lineJoin: 'round'}).addTo(layer);
                // } else {
                    for(var j in navs[d].isochrones[iso].paths[i]) {
                         var pt = new L.LatLng(navs[d].isochrones[iso].paths[i][j].latlon.lat, navs[d].isochrones[iso].paths[i][j].latlon.lon);
                         path.push(pt);
                    }
                    const myLayer = layer
                    var poly = L.polyline(path, {color: navs[d].isochrones[iso].color, weight: 0.5, smoothFactor: 2, lineJoin: 'round'}).addTo(layer);
                    if (this.priv) {
                      poly.on('click', function() {
                        this._latlngs.forEach(p => {
                          L.marker([p.lat, p.lng], {icon: this.icon}).addTo(myLayer)
                        })
                      })
                    }
                // }
            }
        }
      }
    },
    showTooltip: function() {
      for(var m in this.markers) {
        if(this.map.getBounds().contains(this.markers[m].getLatLng())) {
          this.markers[m].openTooltip()
        }
      }
    },
    saveRoute: function() {
      var previous = JSON.parse(localStorage.getItem("_last_" + ((this.boat && this.boat != "-") ? this.boat + "_" : "") + this.race))

      if(previous) {
        this.previous = previous
        this.previous.date = new Date(this.previous.date)
        localStorage.setItem("_previous_" + (this.boat ? this.boat + "_" : "") + this.race, JSON.stringify([this.previous]))
      }

      localStorage.setItem("_last_" + (this.boat ? this.boat + "_" : "") + this.race, JSON.stringify(this.last))
      try {
        localStorage.setItem("_last_isochrones_" + (this.boat ? this.boat + "_" : "") + this.race, lzStringCompress(JSON.stringify(this.isochrones)))
      } catch (e)  {
        console.log("error loading isochrones")
      }

      EventBus.$emit('route', this.last)
    },
    displayNotification: function(sumup) {

      var format = function(v, h) {

        var res = ""

        if(Math.floor(h/24) > 0) {
          res += Math.floor(h/24) + "j"
        }

        if(Math.floor(h%24) > 0) {
          if(res.length > 0) res += " "
          res += Math.floor(h%24) + "h"
        }

        if(res.length > 0) {
          res = v + " "+ res
        }

        return res
      }

      var n = sumup.sailsDuration[0] + sumup.sailsDuration[1]
      var l = sumup.sailsDuration[3] + sumup.sailsDuration[6]
      var c = sumup.sailsDuration[4]
      var h = sumup.sailsDuration[2] + sumup.sailsDuration[5]

      var title = dateFormat(sumup.start, "dd mmm HH:MM") + " " + Math.floor(sumup.duration/24) + "j" + (sumup.duration%24).toFixed(1)
      var message = format("Std", n) + " | " + format("LG", l) + " | " + format("C0", c) + " | " + format("HG", h) + " | " + format("Foil", sumup.foilDuration)
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
        });
      }

      this.$emit('error', {
          level: sumup.success ? "info" : "warning",
          duration: 60000,
          message: title + ' --- ' + message
      })
    }
  }
}
</script>
