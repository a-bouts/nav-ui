<template>
  <div>
    <div v-show="notification.active" class="notification" v-bind:class="level" style="display: block; position: fixed; z-index: 5000; left: 70px; right: 70px; top: 20px">
      <button class="delete" @click="notification.active = false"></button>
      {{ notification.message }}
    </div>
    <div style="height:100%" id="map" width="100%" height="100%">
      <SideBar ref="sidebar" v-if="map != null" v-bind:boat="boat" v-bind:priv="priv" v-bind:debug="debug" v-bind:map="map" v-bind:races="races" v-bind:loading="loading" v-bind:position="current.position" v-on:configure="configure" v-on:center="center" v-on:run="go" v-on:show-tooltip="showTooltip" v-on:error="error"></SideBar>
    </div>
    <Graticule v-if="map != null" v-bind:map="map"></Graticule>
    <Geodesic ref="geodesic" v-if="map != null" v-bind:from="current.position" v-bind:map="map"></Geodesic>
    <Race v-if="map != null" v-bind:boat="boat" v-bind:map="map" v-bind:races="races" v-bind:current="current" v-on:nextdoor="onNextDoor"></Race>
    <Route ref="route" v-if="map != null" v-bind:priv="priv" v-bind:debug="debug" v-bind:boat="boat" v-bind:map="map" v-bind:races="races" v-bind:layerControl="layerControl" v-bind:current="current" v-on:loading="onLoading" v-on:error="error" v-on:select="selectPoint"></Route>
    <BoatLines ref="boatlines" v-if="map != null" v-bind:map="map" v-bind:races="races" v-bind:layerControl="layerControl" v-bind:current="current" v-bind:priv="priv"></BoatLines>
  </div>
</template>

<script>
import Vue from 'vue'
import L from 'leaflet'
import * as esri from "esri-leaflet"
import 'leaflet-extra-markers'
import WindControl from './WindControl.vue'
import SideBar from './SideBar.vue'
import Graticule from './Graticule.vue'
import Geodesic from './Geodesic.vue'
import Race from './Race.vue'
import Route from './Route.vue'
import BoatLines from './BoatLines.vue'

export default {
  name: 'Nav',
  props: {
    boat: String,
    debug: Boolean,
    priv: Boolean
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
      notification: {
        active: false,
        message: "NOAA toujours en panne... mais les vents sont là, pour peu que l'on soit patient",
        level: "warning"
      },
      loading: false,
      map: null,
      tileLayer: null,
      boatLayer: null,
      boatLineLayer: null,
      layerControl: null,
      layers: [],
      races: null,
      current: {},
      nextDoor: null,
      boatLines: null,
      windControl: null
    }
  },
  created: function() {
    this.$http.get('races/races.json').then(response => {
      this.races = response.body
    }, () => {
      console.log("Error loading races")
    })
  },
  mounted: function() {
    this.map = L.map('map', {zoomControl: true, worldCopyJump: false}).setView([51.505, -0.09], 13)

    var imagery = esri.basemapLayer('Imagery').addTo(this.map)
    var darkGray = esri.basemapLayer('DarkGray')

    var baseLayers = {
      "Satellite": imagery,
      "Dark Gray": darkGray
    }

    this.layerControl = L.control.layers(baseLayers).addTo(this.map)

    this.boatLayer = L.layerGroup().addTo(this.map)
    this.boatLineLayer = L.layerGroup().addTo(this.map)

    var zoom;
    var pan;
    zoom = localStorage.getItem('zoom');
    pan = JSON.parse(localStorage.getItem('pan'));
    if(!zoom)
      zoom = 3;
    if(!pan)
      pan = [0, 0];
    this.map.setView(pan, zoom);

    this.map.on('zoomend', this.zoomend);
    this.map.on('moveend', this.zoomend);

    this.initWindControls()
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
    onLoading: function(loading) {
      this.loading = loading
    },
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
    zoomend: function() {
      localStorage.setItem('zoom', this.map.getZoom());
      localStorage.setItem('pan', JSON.stringify([this.map.getCenter().lat, this.map.getCenter().lng]));
    },
    initWindControls: function() {
      const it = this
      const map = this.map
      L.Control.WindControl = L.Control.extend({
        onAdd: function() {

          const WindControlConstructor = Vue.extend(WindControl)
          it.windControl = new WindControlConstructor({
            propsData: { map: map, debug: it.debug, layerControl: it.layerControl }
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
    save: function() {
      localStorage.setItem((this.boat ? this.boat + "_" : "") + this.current.id, JSON.stringify(this.current))
    },
    configure: function(current) {
      this.boatLayer.clearLayers()

      this.current = current
      this.current.position = {
        lat: current.position.lat,
        lng: current.position.lng
      }
      this.$refs.boatlines.go()

      var pan = [
        this.convertDMSToDD(current.position.lat.p, current.position.lat.d, current.position.lat.m, current.position.lat.s),
        this.convertDMSToDD(current.position.lng.p, current.position.lng.d, current.position.lng.m, current.position.lng.s)]

      var boatMarker = L.ExtraMarkers.icon({ icon: 'fa-anchor', markerColor: 'red', shape: 'square', prefix: 'fa' })

      this.$refs.geodesic.setGeodesic()

      const it = this
      L.marker(pan,
        {icon: boatMarker, draggable: true, zIndexOffset: 5000}
      ).addTo(this.boatLayer).on('dragend', function() {
        var position = this.getLatLng();
        console.log([position.lat, position.lng])
        it.current.position = {
          lat: it.convertDDToDMS(position.lat),
          lng: it.convertDDToDMS(position.lng)
        }
        it.$refs.boatlines.go()
      });
    },
    center: function() {
      var pan = [
        this.convertDMSToDD(this.current.position.lat.p, this.current.position.lat.d, this.current.position.lat.m, this.current.position.lat.s),
        this.convertDMSToDD(this.current.position.lng.p, this.current.position.lng.d, this.current.position.lng.m, this.current.position.lng.s)]
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

.leaflet-div-icon.leaflet-editing-icon.leaflet-touch-icon.dark {
    background: "#cccccc";
    border-radius: 50%;
    color: "#777777";
    opacity: 40%;
}

.leaflet-div-icon.leaflet-editing-icon.leaflet-touch-icon.standard {
    background: white;
    border-radius: 50%;
    color: "#ffffff";
}

.leaflet-div-icon.leaflet-editing-icon.leaflet-touch-icon.night {
    background: red;
    color: "#ff0000";
}

.leaflet-div-icon.leaflet-editing-icon.leaflet-touch-icon.changed {
    background: blue;
    border-radius: 50%;
}

.leaflet-div-icon.leaflet-editing-icon.leaflet-touch-icon.night-changed {
    background: orange;
    color: "#ff0000";
    border-radius: 50%;
}

.leaflet-div-icon.leaflet-bearingline-icon.leaflet-touch-icon {
    background: #3bdbd5;
    color: #3bdbd5;
    border-radius: 50%;
}

.leaflet-div-icon.leaflet-twaline-icon.leaflet-touch-icon {
    background: #ef1780;
    color: #ef1780;
    border-radius: 50%;
}

.leaflet-tooltip.draw-tooltip .date {
  color: #c0d7f9;
  font-weight: bold;
}

.leaflet-tooltip.draw-tooltip .date .hour {
  float: right;
}

.leaflet-tooltip.draw-tooltip .primary {
  color: #ffffff;
}

.leaflet-tooltip.draw-tooltip .primary .sail {
  font-weight: bold;
}

.leaflet-tooltip.draw-tooltip .primary .foil {
  float: right;
}

.leaflet-tooltip.draw-tooltip .primary .ice {
  float: right;
}

.leaflet-tooltip.draw-tooltip .secondary {
  color: #f8d5e4;
}

.leaflet-tooltip.draw-tooltip {
    background: rgb(54, 54, 54);
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid transparent;
    -webkit-border-radius: 4px;
    border-radius: 4px;
    color: #fff;
    font: 12px/18px "Helvetica Neue", Arial, Helvetica, sans-serif;
    margin-left: 10px;
    margin-top: -21px;
    padding: 4px 8px;
    white-space: nowrap;
    z-index: 6;
    box-shadow: 0 0 0;
}

.leaflet-tooltip.draw-tooltip:before {
    border-right: 6px solid black;
    border-right-color: rgba(0, 0, 0, 0.5);
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    content: "";
    position: absolute;
    top: 22px;
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

</style>
