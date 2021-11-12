<template>
  <div></div>
</template>

<script>
import L from 'leaflet'

export default {
  name: 'Boat',
  props: {
    fleetLayer: Object,
    boat: Object
  },
  data: function() {
    return {
      markers: [],
      trackLayer: null,
      track: false
    }
  },
  created: function() {
    this.trackLayer = L.layerGroup()
  },
  mounted: function() {
    this.trackLayer.addTo(this.fleetLayer)
    this.drawBoat()
  },
  beforeDestroy: function() {
    this.fleetLayer.removeLayer(this.trackLayer)
    this.markers.forEach(item => {
      this.fleetLayer.removeLayer(item)
    });
  },
  methods: {
    drawBoat: function() {
      var className = 'leaflet-boat-icon small ' + (this.boat.type || 'normal')

      if (this.boat.followed) {
        className += " followed"
      }
      if (this.boat.team) {
        className += " team"
      }

      let boatIcon = new L.DivIcon({
        iconSize: [13, 40],
        iconAnchor: [7, 27],
        className: className
      })

      let marker = L.marker([this.boat.pos.lat, this.boat.pos.lon], {icon: boatIcon, rotationAngle: this.boat.heading, boat: this.boat})
        .bindTooltip(this.getTooltip, {permanent: false, opacity: 0.9, offset: L.point(0, 0), className: 'draw-tooltip boat', direction: 'top'})
        .on('click', this.drawTrack)
        .addTo(this.fleetLayer)

      this.markers.push(marker)
    },
    getTooltip: function() {
      const sails = [0, "Jib", "Spi", "Stay", "LJ", "C0", "HG", "LG", 8, 9,
                   // VR sends sailNo + 10 to indicate autoSail. We use sailNo mod 10 to find the sail name sans Auto indication.
                   "Auto", "Jib", "Spi", "Stay", "LJ", "C0", "HG", "LG"]

      var fixed = 3

      var ts = new Date(this.boat.ts)
      var hrs = ts.getHours()
      var min = ts.getMinutes()
      if (min < 10) {
        min = "0" + min;
      }

      var cap = "is"
      var regulated = ""
      if (this.boat.regulated === true) {
        regulated = "is"
        cap = ""
      }

      var primary = "<span class='" + cap + "'><i class='fa fa-compass'></i> " + this.boat.heading.toFixed(fixed) + "°</span> <span class='" + regulated + "'><i class='fa fa-location-arrow'></i> " + this.boat.twa.toFixed(fixed) + "°</span> <span class='sail'>" + sails[this.boat.sail] + "</span>"
      if(this.boat.sail > 10) {
        primary += " <span class='auto'><i class='fas fa-sync-alt'></i></span>"
      }
      const secondary = "<i class='fa fa-wind'></i> " + this.boat.wd.toFixed(1) + "° " + this.boat.ws.toFixed(1) + "kt <i class='fa fa-ship'></i> " + this.boat.bs.toFixed(1) + "kt"

      var res = '<div class="name">'
      if (this.boat.rank) {
        res += '<span>' + this.boat.rank + '</span> '
      }
      res += '<span>' + this.boat.displayName + '</span><span class="hour">' + hrs + ":" + min + '</span></div><div class="primary">' + primary + '</div>'
      if(secondary)
          res += '<div class="secondary">' + secondary + '</div>'


      return res
    },
    drawTrack() {
      this.track = !this.track

      this.trackLayer.clearLayers()

      if(this.track) {
        let polylineOptions = {
          color: 'white',
          weight: 1,
          smoothFactor: 2,
          lineJoin: 'round'
        }
        L.polyline(this.boat.track, polylineOptions).addTo(this.trackLayer)
      }
    }
  }
}
</script>

<style>
.leaflet-boat-icon {
  background: url('/images/boats.png') no-repeat 0 0;
  background-size: 184px 60px;
  background-position: -2px 0px;
  opacity: 0.7;
}

.leaflet-boat-icon.small {
  background: url('/images/boats-2.png') no-repeat 0 0;
  background-size: 120px 40px;
  background-position: -1px 0px;
}

.leaflet-boat-icon.small.normal {
  background-position: -16px 0px;
}

.leaflet-boat-icon.small.normal.team {
  background-position: -31px 0px;
}

.leaflet-boat-icon.small.normal.followed {
  background-position: -46px 0px;
  opacity: 0.7;
}

.leaflet-boat-icon.small.certified {
  background-position: -61px 0px;
}

.leaflet-boat-icon.small.real {
  background-position: -76px 0px;
}

.leaflet-boat-icon.small.top {
  background-position: -91px 0px;
}

.leaflet-boat-icon.small.sponsor {
  background-position: -106px 0px;
}

.leaflet-boat-icon.small.normal:hover,
.leaflet-boat-icon.small.normal.team:hover,
.leaflet-boat-icon.small.normal.followed:hover,
.leaflet-boat-icon.small.certified:hover,
.leaflet-boat-icon.small.real:hover,
.leaflet-boat-icon.small.top:hover,
.leaflet-boat-icon.small.sponsor:hover {
  opacity: 1;
}


.leaflet-tooltip.draw-tooltip.boat:before {
    content: none;
}

.leaflet-tooltip.draw-tooltip .name {
  color: #c0d7f9;
  font-weight: bold;
}

.leaflet-tooltip.draw-tooltip .name .hour {
  float: right;
}

.leaflet-tooltip.draw-tooltip .is {
  font-weight: bold;
}

</style>
