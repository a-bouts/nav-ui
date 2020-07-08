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
      raceLayer: null
    }
  },
  mounted: function() {
    this.raceLayer = L.layerGroup().addTo(this.map)
  },
  watch: {
    current: function() {
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

        // if(this.current_race.validated.indexOf(door.name) >= 0) {
        //     door.validated = true;
        // }
        var markerIcon = L.ExtraMarkers.icon({icon: 'fa-number', number: door.name, shape: 'penta', markerColor: door.validated === true ? 'green-light' : 'yellow'});

        L.marker([door.latlons[0].lat, door.latlons[0].lon], {door: door, icon: markerIcon}).on('click', function() {
            this.options.door.validated = !this.options.door.validated;
            this.setIcon(L.ExtraMarkers.icon({icon: 'fa-number', number: this.options.door.name, shape: 'penta', markerColor: this.options.door.validated === true ? 'green-light' : 'yellow'}));

            // if(this.options.door.validated === true) {
            //     this.current_race.validated.push(this.options.door.name);
            // } else {
            //     this.current_race.validated.splice(this.current_race.validated.indexOf(this.options.door.name), 1);
            // }
            // saveRace();

        }).addTo(this.raceLayer);
      }
    }
  }
}
</script>
