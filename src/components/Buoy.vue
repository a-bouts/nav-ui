<template>
  <div></div>
</template>

<script>
import L from 'leaflet'

export default {
  name: 'Buoy',
  props: {
    raceLayer: Object,
    editable: Boolean,
    buoy: Object,
    validated: Boolean
  },
  data: function() {
    return {
      markers: []
    }
  },
  mounted: function() {
    this.drawBuoy()
  },
  beforeDestroy: function() {
    this.markers.forEach(item => {
      this.raceLayer.removeLayer(item)
    });
  },
  watch: {
    validated() {
      this.markers.forEach(item => {
        this.raceLayer.removeLayer(item)
      });
      this.drawBuoy()
    }
  },
  methods: {
    drawBuoy: function() {
      const it = this

      var startMarkerIcon = L.ExtraMarkers.icon({shape: 'circle', markerColor: 'green' , prefix: 'fa'})
      var endMarkerIcon = L.ExtraMarkers.icon({shape: 'circle', markerColor: 'red' , prefix: 'fa'});

      if(this.buoy.type === "END") {
        if(this.buoy.latlons.length == 1) {
          var endM = L.marker([this.buoy.latlons[0].lat, this.buoy.latlons[0].lon], {icon: endMarkerIcon}).addTo(this.raceLayer);
          this.markers.push(endM)
        } else {
          var endM1 = L.marker([this.buoy.latlons[0].lat, this.buoy.latlons[0].lon], {icon: endMarkerIcon}).addTo(this.raceLayer);
          var endM2 = L.marker([this.buoy.latlons[1].lat, this.buoy.latlons[1].lon], {icon: endMarkerIcon}).addTo(this.raceLayer);
          var endLine = L.polyline([[this.buoy.latlons[0].lat, this.buoy.latlons[0].lon], [this.buoy.latlons[1].lat, this.buoy.latlons[1].lon]], {color: 'red'}).addTo(this.raceLayer);
          this.markers.push(endM1)
          this.markers.push(endM2)
          this.markers.push(endLine)
        }
        return;
      } else if (this.buoy.type === "START") {
        var startM = L.marker([this.buoy.latlons[0].lat, this.buoy.latlons[0].lon], {icon: startMarkerIcon}).addTo(this.raceLayer)
        this.markers.push(startM)
        return;
      }

      var markerIcon = L.ExtraMarkers.icon({icon: 'fa-number', number: this.buoy.name, shape: 'penta', markerColor: this.validated === true ? 'green-light' : 'yellow'});

      var m1 = L.marker([this.buoy.latlons[0].lat, this.buoy.latlons[0].lon], {buoy: this.buoy, icon: markerIcon, draggable: this.editable, zIndexOffset: 5000}).on('click', function() {
        console.log("validate")
        it.$emit("validate", !it.validated)
      }).addTo(this.raceLayer).on('dragend', function() {
        var position = this.getLatLng();

        it.$emit("move-buoy", {index: 0, position: position})
        // it.buoy.latlons[0].lat = position.lat
        // it.buoy.latlons[0].lon = position.lng
      })
      this.markers.push(m1)

      if(this.buoy.latlons.length > 1) {
        var markerIconTribord = L.ExtraMarkers.icon({icon: 'fa-number', number: this.buoy.name, shape: 'penta', markerColor: this.validated === true ? 'green-light' : 'orange'});
        var m2 = L.marker([this.buoy.latlons[1].lat, this.buoy.latlons[1].lon], {buoy: this.buoy, icon: markerIconTribord}).on('click', function() {
          it.$emit("validate", !it.validated)
        }).addTo(this.raceLayer)
        var line = L.polyline([[this.buoy.latlons[0].lat, this.buoy.latlons[0].lon], [this.buoy.latlons[1].lat, this.buoy.latlons[1].lon]], {color: 'red', dashArray: '4, 8', dashOffset: '0', weight: 1}).addTo(this.raceLayer);
        this.markers.push(m2)
        this.markers.push(line)
      }
    },
  }
}
</script>
