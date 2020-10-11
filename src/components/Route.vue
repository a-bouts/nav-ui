<template>
  <div></div>
</template>

<script>
import L from 'leaflet'
import dateFormat from 'dateformat'
import {EventBus} from '../event-bus.js';

export default {
  name: 'Route',
  props: {
    experiment: Boolean,
    map: Object,
    layerControl: Object,
    current: Object,
    races: Object
  },
  data: function() {
    const squareSize = 7
    const roundSize = 9
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
    return {
      last: null,
      isoLayer: null,
      markers: [],
      editIcon: _editIcon,
      changedIcon: _changedIcon,
      nightIcon: _nightIcon,
      nightChangedIcon: _nightChangedIcon,
      routeBuoys: null
    }
  },
  mounted: function() {
    this.isoLayer = L.layerGroup().addTo(this.map)
    EventBus.$on('buoys', (buoys) => {this.routeBuoys = buoys})
  },
  watch: {
    current: function() {
      this.isoLayer.eachLayer((layer) => {
        this.layerControl.removeLayer(layer)
      })
      this.isoLayer.clearLayers()

      this.last = JSON.parse(localStorage.getItem("_last_" + this.current.id))

      if(this.last) {
        this.last.date = new Date(this.last.date)
        this.drawRoute(this.last)
      }
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
    go: function() {

      const params = {
          experiment: this.experiment,
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
          sail: this.current.sails,
          foil: this.current.foil,
          hull: this.current.hull,
          winch: this.current.winch,
          malus: 1.0,
          stop: this.current.stop
      }

      if(this.routeBuoys) {
        params.race.waypoints = this.routeBuoys
      }

      this.$emit('loading', true)
      this.$http.post('/debug/nav/run', params).then(response => {

        this.isoLayer.eachLayer((layer) => {
          this.layerControl.removeLayer(layer)
        })
        this.isoLayer.clearLayers()

        this.displayNotification(response.body.sumup)

        var navs = response.body.navs

        for(var d in navs) {
          var layer = L.layerGroup().addTo(this.isoLayer);
          this.layerControl.addOverlay(layer, navs[d].name);
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
                      L.polyline(path, {color: navs[d].isochrones[iso].color, weight: 1, smoothFactor: 2, lineJoin: 'round'}).addTo(layer);
                  // }
              }
          }
        }

        var windline = response.body.windline
        const runDate = new Date()
        console.log(runDate)
        console.log(params.delay)
        runDate.setHours(runDate.getHours() + 1*params.delay);
        console.log(runDate)

        this.last = {
          date: runDate,
          windline: windline
        }
        this.saveRoute()
        this.drawRoute()
      }).finally(() => {
        this.$emit('loading', false)
      })
    },
    getTooltip: function(date, wl) {
      const sails = ["Jib", "Spi", "Stay", "LJ", "C0", "HG", "LG"];

      const delta = Math.abs(date - new Date()) / 36e5;

      const j = Math.floor(delta / 24)
      const h = Math.floor(delta % 24)
      const m = Math.floor(60 * (delta - j * 24 - h))

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

      var primary = "<i class='fa fa-compass'></i> " + wl.bearing + "° <i class='fa fa-location-arrow'></i> " + wl.twa + "° <span class='sail'>" + sails[wl.sail] + "</span>";
      if(wl.foil > 0) {
        //primary += "<span class='foil' style='color:rgb(255," + 255 * (wl.foil / 100) + "," + 255 * (wl.foil / 100) + ");'><i class='fa fa-fighter-jet'></i></span>"
        primary += "<span class='foil' style='opacity:" + (wl.foil) + "%;'><i class='fa fa-fighter-jet'></i></span>"
      }
      const secondary = "<i class='fa fa-wind'></i> " + wl.wind + "° " + wl.windSpeed.toFixed(1) + "kt <i class='fa fa-ship'></i> " + wl.boatSpeed.toFixed(1) + "kt";

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
        if(date.getHours() > 21 || date.getHours() < 7) {
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
        var marker = L.marker([wl.lat, wl.lon], {icon: icon})
          .bindTooltip(this.getTooltip(date, wl), {permanent: false, opacity: 0.9, offset: L.point(0, 30), className: 'draw-tooltip', direction: 'right'})
          .on('click', () => {
            this.$emit('select', pt)
          })
          .addTo(this.isoLayer)
        this.markers.push(marker)
        //setTimeout(() => { marker.openTooltip() }, 0)
      }
      L.polyline(this.last.windline, {color: 'green', weight: 2, smoothFactor: 2, lineJoin: 'round'}).addTo(this.isoLayer)
      this.$emit('select', this.last.windline[this.last.windline.length-1])
    },
    showTooltip: function() {
      for(var m in this.markers) {
        if(this.map.getBounds().contains(this.markers[m].getLatLng())) {
          this.markers[m].openTooltip()
        }
      }
    },
    saveRoute: function() {
      localStorage.setItem("_last_" + this.current.id, JSON.stringify(this.last))
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
      if (Notification.permission === 'granted') {
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
