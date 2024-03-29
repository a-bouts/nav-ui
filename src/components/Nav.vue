<template>
  <div>
    <div style="height:100%" id="map" width="100%" height="100%">
      <div v-show="notification.active" class="notification" v-bind:class="level" style="display: block; position: fixed; z-index: 1999; ">
        <button class="delete" @click="notification.active = false"></button>
        {{ notification.message }}
      </div>
      <SideBar ref="sidebar" v-bind:settings="settings" v-if="map != null" v-bind:boat="boat" v-bind:race="race" v-bind:priv="priv" v-bind:debug="debug" v-bind:map="map" v-bind:loading="loading" v-bind:position="current.position" v-on:configure="configure" v-on:center="center" v-on:run="go" v-on:show-tooltip="showTooltip" v-on:error="error"></SideBar>
    </div>
    <Graticule v-if="map != null" v-bind:map="map"></Graticule>
    <Race v-if="map != null" v-bind:boat="boat" v-bind:race="race" v-bind:map="map" v-on:nextdoor="onNextDoor"></Race>
    <Route ref="route" v-if="map != null" v-bind:priv="priv" v-bind:debug="debug" v-bind:settings="settings" v-bind:race="race" v-bind:boat="boat" v-bind:map="map" v-bind:layerControl="layerControl" v-bind:current="current" v-on:loading="onLoading" v-on:error="error" v-on:select="selectPoint"></Route>
    <BoatLines v-if="map != null" v-bind:settings="settings" v-bind:map="map" v-bind:race="race" v-bind:layerControl="layerControl" v-bind:current="current" v-bind:priv="priv" v-on:move="onSnakeMove" v-on:select="selectPoint"></BoatLines>
    <Geodesic v-if="map != null" v-bind:map="map"></Geodesic>
  </div>
</template>

<script>
import dataService from '../lib/data.js';
import Vue from 'vue'
import {EventBus} from '../event-bus.js'
import L from 'leaflet'
import * as esri from "esri-leaflet"
import 'leaflet-providers'
import 'leaflet-extra-markers'
import TitleControl from './TitleControl.vue'
import WindControl from './WindControl.vue'
import SideBar from './SideBar.vue'
import Graticule from './Graticule.vue'
import Geodesic from './Geodesic.vue'
import Race from './race/Race.vue'
import Route from './Route.vue'
import BoatLines from './BoatLines.vue'
import VConsole from 'vconsole'

export default {
  name: 'Nav',
  props: {
    boat: String,
    race: String
  },
  components: {
    SideBar,
    Graticule,
    Geodesic,
    Race,
    Route,
    BoatLines
  },
  data: function() {
    return {
      debug: this.boat === 'Stoub',
      priv: this.boat === 'Stoub',
      settings: null,
      notification: {
        active: false,
        message: "NOAA toujours en panne... mais les vents sont là, pour peu que l'on soit patient",
        level: "warning"
      },
      loading: false,
      map: null,
      tileLayer: null,
      boatMarker: null,
      boatLineLayer: null,
      layerControl: null,
      layers: [],
      current: {},
      nextDoor: null,
      windControl: null,
      legend: null,
      cursor: null,
      snake: null,
      wind: null
    }
  },
  watch: {
    boat: function() {
      this.titleControl.boat = this.boat
      this.setTitle()

      var zoom;
      var pan;
      zoom = dataService.getZoom(this.boat, this.race)
      pan = dataService.getPan(this.boat, this.race)
      if(!zoom)
        zoom = 3;
      if(!pan)
        pan = [0, 0];
      this.map.setView(pan, zoom)
    },
    race: function() {
      this.titleControl.race = this.race
      this.setTitle()

      var zoom;
      var pan;
      zoom = dataService.getZoom(this.boat, this.race)
      pan = dataService.getPan(this.boat, this.race)
      if(!zoom)
        zoom = 3;
      if(!pan)
        pan = [0, 0];
      this.map.setView(pan, zoom)
    }
  },
  created: function() {
    if (this.priv) {
      new VConsole()
    }
    this.settings = dataService.getSettings()
  },
  mounted: function() {
    dataService.clean(dataService.getRaces())

    this.setTitle()

    //const it = this

    EventBus.$on('settings', this.onSettings)
    EventBus.$on('boat', this.onBoat)

    this.map = L.map('map', {zoomControl: true, worldCopyJump: false}).setView([51.505, -0.09], 13)

    //var imagery = esri.basemapLayer('Imagery').addTo(this.map)
    var imagery = L.tileLayer.provider('GeoportailFrance.orthos').addTo(this.map)
    var darkGray = esri.basemapLayer('DarkGray')

    var lightGrey = L.tileLayer.provider('Stamen.TonerLite')
    var stamen1 = L.tileLayer.provider('Stamen.Watercolor')
    var stamen2 = L.tileLayer.provider('Stamen.Terrain')
    var night = L.tileLayer.provider('NASAGIBS.ViirsEarthAtNight2012')

    var baseLayers = {
      "Satellite": imagery,
      "Dark Gray": darkGray,
      "Light Grey": lightGrey,
      "Stamen 1": stamen1,
      "Stamen 2": stamen2,
      "Night": night,
    }

    this.layerControl = L.control.layers(baseLayers).addTo(this.map)

    this.layerControl.addOverlay(L.tileLayer.provider('OpenSeaMap'), "Sea Markers");
    this.layerControl.addOverlay(L.tileLayer.provider('OpenRailwayMap'), "Railways");


    this.boatLineLayer = L.layerGroup().addTo(this.map)

    var zoom;
    var pan;
    zoom = dataService.getZoom(this.boat, this.race)
    pan = dataService.getPan(this.boat, this.race)
    if(!zoom)
      zoom = 3;
    if(!pan)
      pan = [0, 0];
    this.map.setView(pan, zoom)

    this.map.on('zoomend', this.zoomend);
    this.map.on('moveend', this.zoomend);

    this.initWindControls()

    let it = this

    L.Control.Legend = L.Control.extend({
      onAdd: function() {
        it.legend = L.DomUtil.create("div", "leaflet-control-velocity")
        return it.legend
      },
      onRemove: function() {
      }
    })
    L.control.legend = function(opts) {
        return new L.Control.Legend(opts)
    }
    L.control.legend({ position: 'bottomleft' }).addTo(this.map)

    this.initTitle()

    this.map.on("mousemove", this.onMouseMove, this)

    var boatMarkerIcon = L.ExtraMarkers.icon({ icon: 'fa-anchor', markerColor: 'pink', shape: 'square', prefix: 'fa' })

    this.boatMarker = L.marker(pan,
      {icon: boatMarkerIcon, draggable: true, zIndexOffset: 5000}
    ).addTo(this.map).on('dragend', function() {
      var position = this.getLatLng();

      var startTime = new Date()
      startTime.setMinutes(startTime.getMinutes() - 1 + it.current.delay*60)
      if (it.settings && it.settings.routeLastUpdate === true) {
        startTime.setMilliseconds(0)
        startTime.setSeconds(0)
        startTime.setMinutes(startTime.getMinutes() - startTime.getMinutes()%5)
      }

      EventBus.$emit("boat", {lat: position.lat, lon: position.lng, startTime: startTime})
    })

  },
  computed: {
    level: function() {
      return {
        'is-danger': this.notification.level == "error",
        'is-info': this.notification.level == "info",
        'is-warning': this.notification.level == "warning",
      }
    }
  },
  methods: {
    onSettings(settings) {
      console.log("on settings")
      this.settings = settings
    },
    onBoat(latlon) {
      console.log("boat", this.race, [latlon.lat, latlon.lon, latlon.startTime])
      this.boatMarker.setLatLng(latlon)
    },
    setTitle: function() {
      var title = dataService.getRace(this.race).shortName ? dataService.getRace(this.race).shortName : this.race
      if (this.boat && this.boat != "-") {
        title += " - " + this.boat
      }
      title += " - " + "Phtheirichthys"
      document.title = title
    },
    onMouseMove: function(e) {
      this.cursor = this.map.containerPointToLatLng(L.point(e.containerPoint.x, e.containerPoint.y))

      this.wind = this.windControl.getWindAt(this.cursor)
      this.displayLegend()
    },
    onSnakeMove: function(snake) {
      this.snake = snake
      this.displayLegend()
    },
    displayLegend: function() {
      const pad = (num, places) => String(num).padStart(places, '0')
      if (this.legend) {
        var legend = ""
        if (this.snake) {
          legend += "<div><strong><i class='fa fa-compass'></i></strong> " + this.snake.bearing + "° <strong><i class='fa fa-location-arrow'></i></strong> " + this.snake.twa.toFixed(1) + "°<div>"
        }
        if (this.wind) {
          legend += "<div><strong><i class='fa fa-wind'></i> </strong>" + this.wind.direction.toFixed(1) + "° " + this.wind.speed.toFixed(1) + "kt</div>"
        }
        if (this.cursor) {
          var lat = this.convertDDToDMS(this.cursor.lat)
          var lon = this.convertDDToDMS(this.cursor.lng)
          legend += "<div>" + pad(lat.d, 2) + "°" + (lat.p < 0 ? "S" : "N") + " " + pad(lat.m, 2) + "'" + pad(lat.s.toFixed(0), 2) + "\" - " + pad(lon.d, 2) + "°" + (lon.p < 0 ? "W" : "E") + " " + pad(lon.m, 2) + "'" + pad(lon.s.toFixed(0), 2) + "\"</div>"
        }
        this.legend.innerHTML = legend
      }
    },
    onLoading: function(loading) {
      this.loading = loading
    },
    convertDMSToDD: function(p, d, m, s, wrap) {
      var res = Number(p) * (Number(d) + Number(m)/60 + Number(s)/3600)
      if (wrap === true && res < 0) {
        res += 360
      }
      return res
    },
    convertDDToDMS: function(D){
      var wrap = false
      if (D > 180) {
        D -= 360
        wrap = true
      }
      const res = {
        p : D<0?-1:1,
        d : 0|(D<0?D=-D:D),
        m : 0|D%1*60,
        s :(0|D*60%1*6000)/100
      }
      if (wrap === true) {
        res.wrap = true
      }
      return res
    },
    zoomend: function() {
      dataService.saveZoom(this.boat, this.race, this.map.getZoom())
      dataService.savePan(this.boat, this.race, [this.map.getCenter().lat, this.map.getCenter().lng])
    },
    initTitle: function() {
      const it = this
      const map = this.map
      L.Control.TitleControl = L.Control.extend({
        onAdd: function() {
          const TitleControlConstructor = Vue.extend(TitleControl)
          it.titleControl = new TitleControlConstructor({
            propsData: { race: it.race, boat: it.boat, map: map, debug: it.debug },
            parent: it
          })
          it.titleControl.$mount()

          L.DomEvent
              .disableClickPropagation(it.titleControl.$el)
              .disableScrollPropagation(it.titleControl.$el)

          return it.titleControl.$el;
        },
        onRemove: function() {
        }
      })
      L.control.titlecontrol = function(opts) {
          return new L.Control.TitleControl(opts)
      }
      L.control.titlecontrol({ position: 'topleft' }).addTo(this.map)
    },
    initWindControls: function() {
      const it = this
      const map = this.map
      L.Control.WindControl = L.Control.extend({
        onAdd: function() {

          const WindControlConstructor = Vue.extend(WindControl)
          it.windControl = new WindControlConstructor({
            propsData: { settings: it.settings, map: map, debug: it.debug, layerControl: it.layerControl }
          })
          it.windControl.$mount()

          L.DomEvent
              .disableClickPropagation(it.windControl.$el)
              .disableScrollPropagation(it.windControl.$el)

          return it.windControl.$el;
        },

        onRemove: function() {
            // Nothing to do here
        }
      });

      L.control.windcontrol = function(opts) {
          return new L.Control.WindControl(opts);
      }

      L.control.windcontrol({ position: 'topright' }).addTo(map);
    },
    configure: function(current) {
      this.current = current
      this.current.position = {
        lat: current.position.lat,
        lng: current.position.lng
      }
    },
    center: function() {
      var pan = [
        this.convertDMSToDD(this.current.position.lat.p, this.current.position.lat.d, this.current.position.lat.m, this.current.position.lat.s),
        this.convertDMSToDD(this.current.position.lng.p, this.current.position.lng.d, this.current.position.lng.m, this.current.position.lng.s, this.current.position.lng.wrap)]
      this.map.setView(pan)
    },
    go: function() {
      this.$refs.route.go()
    },
    showTooltip: function() {
      this.$refs.route.showTooltip()
    },
    error: function(notification) {
      const it = this
      this.notification = {
        active: true,
        message: notification.message,
        level: notification.level
      }

      setTimeout(() => {it.notification.active = false}, notification.duration)
    },
    onNextDoor: function(door) {
      this.nextDoor = door
    },
    selectPoint(point) {
      this.$refs.sidebar.selectPoint(point)
      this.windControl.loadWindAt(point.date)
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
#map {
    position: absolute;
    height: 100%;
    width: 100%;
    background-color: #333;
}


svg text {
    -webkit-user-select: none;
       -moz-user-select: none;
        -ms-user-select: none;
            user-select: none;
}
svg text::selection {
    background: none;
}

.leaflet-control-velocity {
	box-shadow: 0 1px 5px rgba(0,0,0,0.4) !important;
	background: #fff !important;
	border-radius: 5px !important;
  font: 12px/1.5 "Helvetica Neue", Arial, Helvetica, sans-serif !important;
}

.leaflet-touch .leaflet-control-velocity {
	box-shadow: none  !important;
}
.leaflet-touch .leaflet-control-velocity {
	border: 2px solid rgba(0,0,0,0.2) !important;
	background-clip: padding-box !important;
}
.leaflet-left .leaflet-control-velocity {
	margin-left: 10px !important;
}
.leaflet-top .leaflet-control-velocity {
	margin-top: 10px !important;
}
.leaflet-bottom .leaflet-control-velocity {
  margin-bottom: 10px !important;
}

.notification {
  right: 70px;
  top: 20px;
}

@media (min-width: 768px) {
  .leaflet-sidebar-left ~ .notification {
    transition: left 500ms;
  }
}

@media (min-width: 768px) and (max-width: 991px) {
  .leaflet-sidebar-left.extended ~ .leaflet-control-container .leaflet-left {
    left: 400px;
  }
  .leaflet-sidebar-left.extended ~ .notification {
    left: 456px;
  }
  .leaflet-sidebar-left ~ .notification {
    left: 371px;
  }
}

@media (min-width: 992px) and (max-width: 1199px) {
  .leaflet-sidebar-left.extended ~ .leaflet-control-container .leaflet-left {
    left: 600px;
  }
  .leaflet-sidebar-left.extended ~ .notification {
    left: 656px;
  }
  .leaflet-sidebar-left ~ .notification {
    left: 456px;
  }
}

@media (min-width: 1200px) {
  .leaflet-sidebar-left.extended ~ .leaflet-control-container .leaflet-left {
    left: 900px;
  }
  .leaflet-sidebar-left.extended ~ .notification {
    left: 956px;
  }
  .leaflet-sidebar-left ~ .notification {
    left: 556px;
  }
}

.leaflet-sidebar-left.collapsed ~ .notification {
  left: 106px;
}

@media (min-width: 768px) {
  .leaflet-sidebar.extended {
    top: 10px;
    bottom: 10px;
    transition: width 500ms; } }
@media (min-width: 768px) and (max-width: 991px) {
  .leaflet-sidebar.extended {
    width: 390px; /*305*/
    max-width: 390px; } }
@media (min-width: 992px) and (max-width: 1199px) {
  .leaflet-sidebar.extended {
    width: 590px; /*390*/
    max-width: 590px; } }
@media (min-width: 1200px) {
  .leaflet-sidebar.extended {
    width: 890px; /*460*/
    max-width: 890px; } }

</style>
