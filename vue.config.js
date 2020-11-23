module.exports = {
  devServer: {
    // proxy: {
    //   // '^/debug/nav/boatlines': {
    //   //   //target: 'http://localhost:8888'
    //   //   target: 'https://nav.apps-k3s.no-cloud.fr'
    //   // },
    //   '^/debug': {
    //     target: 'http://localhost:8888'
    //   },
    //   '^/private': {
    //     target: 'http://localhost:8888'
    //   },
    //   '^/winds': {
    //     target: 'http://localhost:8090'
    //     //target: 'https://nav.apps-k3s.no-cloud.fr'
    //   },
    //   '^/polars': {
    //     // target: 'http://localhost:7777'
    //     target: 'https://nav.apps-k3s.no-cloud.fr'
    //   }
    // }
    proxy: 'https://route.phtheirichthys.fr'
  }
}
