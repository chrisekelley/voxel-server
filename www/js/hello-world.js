var createClient = require('voxel-client')
var highlight = require('voxel-highlight')
var extend = require('extend')
var voxelPlayer = require('voxel-player')
var game
var THREE = require('three')
var Label = require('./Label.js')(THREE)

//var font = require('../fonts/helvetiker_regular.typeface')
//var helvetiker = require('./helvetiker_regular_module.js')()

//var helvetiker = require(['three'], function(){
//  require(
//      ['../fonts/helvetiker_regular.typeface']
//      , function(module){
//    // module will be per define in that file.
//  }
//  )
//})

module.exports = function(opts, setup) {
  setup = setup || defaultSetup
  opts = extend({}, opts || {})

  var client = createClient("ws://localhost:8080/")
  
  client.emitter.on('noMoreChunks', function(id) {
    console.log("Attaching to the container and creating player")
    var container = opts.container || document.body
    game = client.game
    game.appendTo(container)
    if (game.notCapable()) return game
    var createPlayer = voxelPlayer(game)

    // create the player from a minecraft skin file and tell the
    // game to use it as the main player
    var playerSettings = {playerName :game.settings.username, gravitar :game.settings.gravitar}
    //var label = require('./Label.js')(game.THREE)
    var avatar = createPlayer('player.png', playerSettings)
    new Label(avatar, game.settings.username);
    window.avatar = avatar
    avatar.possess()
    var settings = game.settings.avatarInitialPosition
    var username = game.settings.username
    console.log("Username: " + username)
    avatar.position.set(settings[0],settings[1],settings[2])

//    Label.prototype.buildElement = function() {
//      var el = document.createElement('div');
//      el.textContent = this.content;
//      el.style.backgroundColor = 'white';
//      el.style.position = 'absolute';
//      el.style.padding = '1px 4px';
//      el.style.borderRadius = '2px';
//      el.style.maxWidth = (window.innerWidth * 0.25) + 'px';
//      el.style.maxHeight = (window.innerHeight * 0.25) + 'px';
//      el.style.overflowY = 'auto';
//      document.body.appendChild(el);
//      return el;
//    };
//
//    Label.prototype.track = function() {
//      var p3d = this.object.position.clone();
//      p3d.y = p3d.y + this.object.boundRadius;
//
//      var projector = new THREE.Projector(),
//          pos = projector.projectVector(p3d, this.camera),
//          width = window.innerWidth,
//          height = window.innerHeight,
//          w = this.el.offsetWidth,
//          h = this.el.offsetHeight;
//      this.el.style.top = '' + (height/2 - height/2 * pos.y - 1.5*h) + 'px';
//      this.el.style.left = '' + (width/2 * pos.x + width/2 - w/2) + 'px';
//
//      var that = this;
//      setTimeout(function(){that.track();}, 1000/60);
//    };


    //var label = new Label(avatar, game.camera, username)
    //window.avatarLabel = label

//    var text3d = new THREE.TextGeometry( username, {
//
//      size: 80,
//      height: 20,
//      curveSegments: 2,
//      font: "helvetiker"
//
//    });
//
//    text3d.computeBoundingBox();
//    var centerOffset = -0.5 * ( text3d.boundingBox.max.x - text3d.boundingBox.min.x );
//
//    var textMaterial = new THREE.MeshBasicMaterial( { color: Math.random() * 0xffffff, overdraw: true } );
//    text = new THREE.Mesh( text3d, textMaterial );
//
//    text.position.x = centerOffset;
//    text.position.y = 100;
//    text.position.z = 0;
//
//    text.rotation.x = 0;
//    text.rotation.y = Math.PI * 2;
//
//    avatar.add( text );

    setup(game, avatar, client)
  })

  return game
}


var LabelPlugin = {
  labels: [],
  init: function() {},
  add: function(l) {this.labels.push(l);},
  remove: function(l) {
    this.labels = this.labels.filter(function (label) {
      return label != l;
    });
  },
  render: function() {
    for (var i=0; i<this.labels.length; i++) {
      var args = Array.prototype.slice.call(arguments);
      this.labels[i].render.apply(this.labels[i], args);
    }
  }
};

var OriginalWebGLRenderer = THREE.WebGLRenderer;
THREE.WebGLRenderer = function(parameters) {
  var orig = new OriginalWebGLRenderer(parameters);
  orig.addPostPlugin(LabelPlugin);
  return orig;
};

var OriginalCanvasRenderer = THREE.CanvasRenderer;
THREE.CanvasRenderer = function(parameters) {
  var orig = new OriginalCanvasRenderer(parameters);
  orig.addPostPlugin(LabelPlugin);
  return orig;
};

function defaultSetup(game, avatar, client) {
  // highlight blocks when you look at them, hold <Ctrl> for block placement
  var blockPosPlace, blockPosErase
  var hl = game.highlighter = highlight(game, { color: 0xff0000 })
  hl.on('highlight', function (voxelPos) { blockPosErase = voxelPos })
  hl.on('remove', function (voxelPos) { blockPosErase = null })
  hl.on('highlight-adjacent', function (voxelPos) { blockPosPlace = voxelPos })
  hl.on('remove-adjacent', function (voxelPos) { blockPosPlace = null })

  // toggle between first and third person modes
  window.addEventListener('keydown', function (ev) {
    if (ev.keyCode === 'R'.charCodeAt(0)) avatar.toggle()
  })

  // block interaction stuff, uses highlight data
  var currentMaterial = 1

  game.on('fire', function (target, state) {
    var position = blockPosPlace
    if (position) {
      game.createBlock(position, currentMaterial)
      client.emitter.emit('set', position, currentMaterial)
    } else {
      position = blockPosErase
      if (position) {
        game.setBlock(position, 0)
        console.log("Erasing point at " + JSON.stringify(position))
        client.emitter.emit('set', position, 0)
      }
    }
  })
}