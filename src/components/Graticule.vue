<template>
  <div></div>
</template>

<script>
import L from 'leaflet'
import 'leaflet-graticule'

export default {
  name: 'Graticule',
  props: {
    map: Object
  },
  mounted: function() {
    L.latlngGraticule({
      showLabel: true,
      color: '#fff',
      weight: 0.5,
      opacity: 0.5,
      dashArray: '1,1',
      zoomInterval: [
        {start: 1, end: 3, interval: 10},
        {start: 4, end: 7, interval: 5},
        {start: 8, end: 10, interval: 1}
      ]
    }).addTo(this.map);

  }
}
</script>
