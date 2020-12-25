/**
 * Enemy component.
 * Handle enemy animation and dying behavior.
 * Favor using threejs `object3D` property of entities rather than `setAttribute()`
 * for optimization.
 */
AFRAME.registerComponent('enemy', {
  schema: {
    // 1: behind bushes
    // 2: behind trees
    // 3: behind clouds
    type: {default: 1}
  },

  /**
   * Initialize listeners and component variables.
   * Find and link with the explosion object associated.
   */
  init: function () {
    var el = this.el;
    var explosionScale;

    this.hidingPos = el.object3D.position.y;
    this.timeout = null;             // Timeout for waiting for the next appearance.
    this.vulnerable = false;      // Cannot be shoot when it's hiding.
    this.showingPos = 0;
    // Link with explosion object.
    // Hide explosion object and set scale depending on type of enemy (further == bigger).
    this.explosion = document.getElementById(`${this.el.id}expl`).object3D;
    this.explosion.visible = false;
    explosionScale = this.data.type * 2.2;
    this.explosion.scale.set(explosionScale, explosionScale, explosionScale);

    el.addEventListener('run', this.run.bind(this));
    el.addEventListener('stop', this.stop.bind(this));
    el.addEventListener('hit', this.die.bind(this));
  },

  /**
   * Game start. When start message is shot.
   */
  run: function () {
    var lift;
    var el = this.el;
    // Save hidingPos (default position on the Supercraft site).
    this.hidingPos = el.object3D.position.y;
    // Depending the type of enemy, the further it is, the higher it has to rise.
    lift = this.data.type * 1.2;
    this.showingPos = this.hidingPos + lift;
    document.getElementById('startMessage').object3D.visible = false;
    document.getElementById("score2").object3D.visible = true
    document.getElementById("time2").object3D.visible = true
    this.attribute();
    this.appear();
  },

  attribute: function(){
    time = 500;
    var el = this.el;

    el.setAttribute('animation__out',
      `property: position;,
      from: ${el.object3D.position.x} ${this.hidingPos} ${el.object3D.position.z};
      to: ${el.object3D.position.x} ${this.showingPos} ${el.object3D.position.z};
      delay: ${this.timeout};
      dur: ${time};
      easing: easeOutElastic;
      startEvents: out`);

    el.setAttribute('animation__in',
      `property: position;,
      from: ${el.object3D.position.x} ${this.showingPos} ${el.object3D.position.z};
      to: ${el.object3D.position.x} ${this.hidingPos} ${el.object3D.position.z};
      dur: 200;
      delay: 1000;
      easing: easeOutCubic;
      startEvents: in`);
    el.emit('out');
  },

  appear:function(){
    var el = this.el;
    var attribut = this.attribute.bind(this);
    el.addEventListener('animationcomplete__out',function(e){
      this.vulnerable = false;
      el.emit('in');
    });

    el.addEventListener('animationcomplete__in',function(e){
      this.vulnerable = true;
      this.timeout = setTimeout(attribut,
        1000 + Math.floor(Math.random() * 3000));
    });

    el.addEventListener('animationbegin',function(e){
      this.vulnerable = false;
    });

    this.el.querySelector('[sound]').components.sound.playSound();
  },
  /**
   * Stop tweens and timeouts.
   */
  stop: function () {
    this.el.removeAttribute('animation__in');
    this.el.removeAttribute('animation__out');
    clearTimeout(this.timeout);
    this.vulnerable = false;
  },

  /**
   * Enemy was killed (this is called via `die` event thrown by the bullets when collide).
   */
  die: function (evt) {
    var el = this.el;
    console.log(this.el);

    if (!this.vulnerable) { return; }  // I'm hidden!

    this.stop();

    // Hide enemy, return it to hiding position.
    el.object3D.visible = false;
    el.object3D.position.y = this.hidingPos;

    // Play explosion sound.
    document.getElementById('commonExplosion').components.sound.playSound();

    // Show explosion on the hit position and make it look to center of stage.
    this.explosion.position.copy(this.el.components.target.lastBulletHit.position);
    this.explosion.lookAt(0, 1.6, 0);
    this.explosion.visible = true;

    // Wait 300 ms to hide explosion.
    setTimeout(() => {
      this.explosion.visible = false;
      this.el.object3D.visible = true;
      // After a random number of secs (2-5), appear again.
      setTimeout(this.attribute.bind(this),
                 2000 + Math.floor(Math.random() * 3000));
    }, 300);
  }
});
