<template>
  <div>
    <router-view :debug="debug" :priv="priv"></router-view>
  </div>
</template>

<script>
import VConsole from 'vconsole'

export default {
  name: 'App',
  components: {
  },
  data : function() {
    return {
      debug: false,
      priv: false
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
          it.debug = true
        } else if(v == 'private') {
          new VConsole()
          it.priv = true
        }
      });
    }

    if (typeof Notification !== 'undefined') {
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
    }
  }
}
</script>

<style>

body {
    margin: 0px;
}
</style>
