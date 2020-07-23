<template>
  <Nav v-bind:experiment="experiment"></Nav>
</template>

<script>
import Nav from './components/Nav.vue'

import VConsole from 'vconsole'

export default {
  name: 'App',
  components: {
    Nav
  },
  data : function() {
    return {
      experiment: false
    }
  },
  created: function() {
    var it = this
    let uri = window.location.href.split('?');
    if (uri.length == 2)
    {
      let vars = uri[1].split('&');
      vars.forEach(function(v){
        if(v == 'debug') {
          new VConsole()
        } else if(v == 'experiment') {
          it.experiment = true
        }
      });
    }

    if (Notification.permission === 'granted') {
      // show notification here
    } else {
      // request permission from user
      Notification.requestPermission().then(function(p) {
       if(p === 'granted') {
           // show notification here
       } else {
           console.log('User blocked notifications.');
       }
      }).catch(function(err) {
          console.error(err);
      });
    }
  },
}
</script>

<style>

body {
    margin: 0px;
}
</style>
