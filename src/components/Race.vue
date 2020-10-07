<template>
  <div></div>
</template>

<script>
import L from 'leaflet'
import 'leaflet-extra-markers'

export default {
  name: 'Race',
  props: {
    map: Object,
    current: Object,
    races: Object
  },
  data: function() {
    return {
      raceLayer: null,
      validated: []
    }
  },
  mounted: function() {
    this.raceLayer = L.layerGroup().addTo(this.map)
  },
  watch: {
    current: function() {
      this.drawRace()
    }
  },
  methods: {
    drawRace() {
      var it = this

      this.validated = JSON.parse(localStorage.getItem("_validated_" + this.current.id))

      this.raceLayer.clearLayers()

      var startMarkerIcon = L.ExtraMarkers.icon({shape: 'circle', markerColor: 'green' , prefix: 'fa'})
      var endMarkerIcon = L.ExtraMarkers.icon({shape: 'circle', markerColor: 'red' , prefix: 'fa'});

      var start = this.races[this.current.id].start
      L.marker([start.lat, start.lon], {icon: startMarkerIcon}).addTo(this.raceLayer)

      for(var i in this.races[this.current.id].waypoints) {
        var door = this.races[this.current.id].waypoints[i];

        if(door.name === "end") {
          if(door.latlons.length == 1) {
            L.marker([door.latlons[0].lat, door.latlons[0].lon], {icon: endMarkerIcon}).addTo(this.raceLayer);
          } else {
            L.marker([door.latlons[0].lat, door.latlons[0].lon], {icon: endMarkerIcon}).addTo(this.raceLayer);
            L.marker([door.latlons[1].lat, door.latlons[1].lon], {icon: endMarkerIcon}).addTo(this.raceLayer);
            L.polyline([[door.latlons[0].lat, door.latlons[0].lon], [door.latlons[1].lat, door.latlons[1].lon]], {color: 'red'}).addTo(this.raceLayer);
          }
          continue;
        }

        if(this.validated && this.validated.indexOf(door.name) >= 0) {
            door.validated = true;
        }
        var markerIcon = L.ExtraMarkers.icon({icon: 'fa-number', number: door.name, shape: 'penta', markerColor: door.validated === true ? 'green-light' : 'yellow'});

        L.marker([door.latlons[0].lat, door.latlons[0].lon], {door: door, icon: markerIcon}).on('click', function() {
            it.validateBuoy(this)
        }).addTo(this.raceLayer);

        if(door.latlons.length > 1) {
          var markerIconTribord = L.ExtraMarkers.icon({icon: 'fa-number', number: door.name, shape: 'penta', markerColor: door.validated === true ? 'green-light' : 'orange'});
          L.marker([door.latlons[1].lat, door.latlons[1].lon], {door: door, icon: markerIconTribord}).on('click', function() {
              it.validateBuoy(this)
          }).addTo(this.raceLayer)
          L.polyline([[door.latlons[0].lat, door.latlons[0].lon], [door.latlons[1].lat, door.latlons[1].lon]], {color: 'red', dashArray: '4, 8', dashOffset: '0', weight: 1}).addTo(this.raceLayer);
        }
      }

      for(var j in it.races[it.current.id].waypoints) {
        var d = it.races[it.current.id].waypoints[j];
        if(!d.validated) {
          it.$emit('nextdoor', d)
          break
        }
      }
    },
    validateBuoy(marker) {
      marker.options.door.validated = !marker.options.door.validated;

      if(marker.options.door.validated === true) {
        if(!this.validated) this.validated = []
        this.validated.push(marker.options.door.name);
      } else {
        this.validated.splice(this.validated.indexOf(marker.options.door.name), 1);
      }
      localStorage.setItem("_validated_" + this.current.id, JSON.stringify(this.validated))

      for(var i in this.races[this.current.id].waypoints) {
        var door = this.races[this.current.id].waypoints[i];
        if(!door.validated) {
          this.$emit('nextdoor', door)
          break
        }
      }

      this.drawRace()
    }
  }
}
</script>
