// const { TWEEN } = require("aframe");

// /* global AFRAME */
// require(TWEEN)

if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

let score = 0;
let times = 30;

AFRAME.registerComponent('timer-countdown', {
  init: function(){
    var el = this.el;
    this.message = document.getElementById('startMessage');
    this.timer = document.getElementById('time2');
    this.interval = null;
    el.addEventListener('timer',this.run.bind(this));
    el.emit('timer');
  },
  run:function(){
    var countdown = this.countdown.bind(this);
    this.interval = setInterval(countdown,1000);
  },
  countdown: function(){
    if(this.message.object3D.visible == false){
      if(times <= 0){
        times = 1
      }
      times -= 1;
      this.timer.setAttribute('value','Time: ' + times);
    }
  },
  endRun:function(){
    clearInterval(this.interval);
  }
});

AFRAME.registerComponent('in-vr', {
  init: function(){
    var vr = document.getElementById('scene');
    var scoreTitle = document.getElementById("score2");
    var timeTitle = document.getElementById("time2");
    vr.addEventListener('enter-vr', function() {
      timeTitle.setAttribute('position','-0.2 0.9 -1');
      scoreTitle.setAttribute('position','-0.2 -0.9 -1');
    })
    vr.addEventListener('exit-vr', function() {
      timeTitle.setAttribute('position','-0.2 0.7 -1');
      scoreTitle.setAttribute('position','-0.2 -0.7 -1');
    })
    if(document.getElementById('startMessage').object3D.visible == true){
      scoreTitle.object3D.visible = false
      timeTitle.object3D.visible = false
    }
  }
});

AFRAME.registerComponent('click-to-shoot', {
  init: function () {
    document.body.addEventListener('mousedown', () => { this.el.emit('shoot'); });
  }
});

AFRAME.registerComponent('resize-text', {
  init: function() {  
    var self = this;
    window.addEventListener('resize', function(e) {
      var width = window.innerWidth;      
      self.el.setAttribute('width', ( width / 600 ));
    });
  }
});

/**
 * Shooter. Entity that spawns bullets and handles bullet types.
 */
AFRAME.registerComponent('shooter', {
  schema: {
    activeBulletType: {type: 'string', default: 'normal'},
    bulletTypes: {type: 'array', default: ['normal']},
    cycle: {default: false}
  },

  init: function () {
    this.el.addEventListener('shoot', this.onShoot.bind(this));
    this.el.addEventListener('changebullet', this.onChangeBullet.bind(this));
    this.bulletSystem = this.el.sceneEl.systems.bullet;
  },

  /**
   * Listent to `shoot` action / event to tell bullet system to fire a bullet.
   */
  onShoot: function () {
    this.bulletSystem.shoot(this.data.activeBulletType, this.el.object3D);
  },

  /**
   * Listen to `changebullet` action / event telling the shooter to change bullet type.
   */
  onChangeBullet: function (evt) {
    var data = this.data;
    var el = this.el;
    var idx;

    // Cycle to next bullet type.
    if (evt.detail === 'next') {
      idx = data.bulletTypes.indexOf(data.activeBulletType);
      if (idx === -1) { return; }
      idx = data.cycle
        ? (idx + 1) % data.bulletTypes.length
        : Math.min(data.bulletTypes.length - 1, idx + 1);
      data.activeBulletType = data.bulletTypes[idx];
      el.setAttribute('shooter', 'activeBulletType', data.bulletTypes[idx]);
      return;
    }

    // Cycle to previous bullet type.
    if (evt.detail === 'prev') {
      idx = data.bulletTypes.indexOf(data.activeBulletType);
      if (idx === -1) { return; }
      idx = data.cycle
        ? (idx - 1) % data.bulletTypes.length
        : Math.max(0, idx - 1);
      data.activeBulletType = data.bulletTypes[idx];
      el.setAttribute('shooter', 'activeBulletType', data.bulletTypes[idx]);
      return;
    }

    // Direct set bullet type.
    el.setAttribute('shooter', 'activeBulletType', evt.detail);
  }
});

/**
 * Bullet template component
 */
AFRAME.registerComponent('bullet', {
  dependencies: ['material'],

  schema: {
    damagePoints: {default: 1.0, type: 'float'},
    maxTime: {default: 4.0, type: 'float'},  // seconds.
    name: {default: 'normal', type: 'string'},
    poolSize: {default: 10, type: 'int', min: 0},
    speed: {default: 8.0, type: 'float'}  // meters / sec.
  },

  init: function () {
    var el = this.el;
    el.object3D.visible = false;
    el.addEventListener('object3dset', evt => {
      el.sceneEl.systems.bullet.registerBullet(this);
    });
  }
});

/**
 * Bullet system for collision detection.
 */
AFRAME.registerSystem('bullet', {
  init: function () {
    var bulletContainer;
    bulletContainer = document.createElement('a-entity');
    bulletContainer.id = 'superShooterBulletContainer';
    this.el.sceneEl.appendChild(bulletContainer);

    this.container = bulletContainer.object3D;
    this.pool = {};
    this.targets = [];
  },

  /**
   * Register and initialize bullet type.
   */
  registerBullet: function (bulletComponent) {
    var bullet;
    var bulletData;
    var i;
    var model;

    model = bulletComponent.el.object3D;
    if (!model) { return; }
    bulletData = bulletComponent.data;

    // Initialize pool and bullets.
    this.pool[bulletData.name] = [];
    for (i = 0; i < bulletData.poolSize; i++) {
      bullet = model.clone();
      bullet.damagePoints = bulletData.damagePoints;
      bullet.direction = new THREE.Vector3(0, 0, -1);
      bullet.maxTime = bulletData.maxTime * 1000;
      bullet.name = bulletData.name + i;
      bullet.speed = bulletData.speed;
      bullet.time = 0;
      bullet.visible = false;
      this.pool[bulletData.name].push(bullet);
    }
  },

  /**
   * Register single target.
   */
  registerTarget: function (targetComponent, isStatic) {
    var targetObj;
    this.targets.push(targetComponent.el);
    if (!isStatic) { return; }

    // Precalculate bounding box of bullet.
    targetObj = targetComponent.el.object3D;
    targetObj.boundingBox = new THREE.Box3().setFromObject(targetObj);
  },

  shoot: function (bulletName, gun) {
    var i;
    var oldest = 0;
    var oldestTime = 0;
    var pool = this.pool[bulletName];

    if (pool === undefined) { return null; }

    // Find available bullet and initialize it.
    for (i = 0; i < pool.length; i++) {
      if (pool[i].visible === false) {
        return this.shootBullet(pool[i], gun);
      } else if (pool[i].time > oldestTime){
        oldest = i;
        oldestTime = pool[i].time;
      }
    }

    // All bullets are active, pool is full, grab oldest bullet.
    return this.shootBullet(pool[oldest], gun);
  },

  shootBullet: function (bullet, gun) {
    bullet.visible = true;
    bullet.time = 0;
    gun.getWorldPosition(bullet.position);
    gun.getWorldDirection(bullet.direction);
    bullet.direction.multiplyScalar(-bullet.speed);
    this.container.add(bullet);
    return bullet;
  },

  tick: (function () {
    var bulletBox = new THREE.Box3();
    var bulletTranslation = new THREE.Vector3();
    var targetBox = new THREE.Box3();

    return function (time, delta) {
      var bullet;
      var i;
      var isHit;
      var targetObj;
      var t;

      for (i = 0; i < this.container.children.length; i++) {
        bullet = this.container.children[i];
        if (!bullet.visible) { continue; }
        bullet.time += delta;
        if (bullet.time >= bullet.maxTime) {
          this.killBullet(bullet);
          continue;
        }
        bulletTranslation.copy(bullet.direction).multiplyScalar(delta / 850);
        bullet.position.add(bulletTranslation);

        // Check collisions.
        bulletBox.setFromObject(bullet);
        for (t = 0; t < this.targets.length; t++) {
          let target = this.targets[t];
          if(target.getAttribute('target') != null){
            if (!target.getAttribute('target').active) { continue; }    
            targetObj = target.object3D;
            if (!targetObj.visible) { continue; }
            isHit = false;
            if (targetObj.boundingBox) {
              isHit = targetObj.boundingBox.intersectsBox(bulletBox);
            } else {
              targetBox.setFromObject(targetObj);
              isHit = targetBox.intersectsBox(bulletBox);
            }
            if (isHit) {
              this.killBullet(bullet);
              target.components.target.onBulletHit(bullet);
              target.emit('hit', null);
              break;
            }        
          }
          if(target.getAttribute('obstacle') != null){
            if (!target.getAttribute('obstacle').active) { continue; }    
            targetObj = target.object3D;
            if (!targetObj.visible) { continue; }
            isHit = false;
            if (targetObj.boundingBox) {
              isHit = targetObj.boundingBox.intersectsBox(bulletBox);
            } else {
              targetBox.setFromObject(targetObj);
              isHit = targetBox.intersectsBox(bulletBox);
            }
            if (isHit) {
              this.killBullet(bullet);
              break;
            }             
          }
        }
      }
    };
  })(),

  killBullet: function (bullet) {
    bullet.visible = false;
  }
});

/**
 * target component
 */
AFRAME.registerComponent('target', {
  schema: {
    active: {default: true},
    healthPoints: {default: 1, type: 'float'},
    static: {default: true},
  },

  init: function () {
    var el = this.el;
    el.addEventListener('object3dset', evt => {
      el.sceneEl.systems.bullet.registerTarget(this, this.data.static);
    });
  },

  update: function (oldData) {
    // `this.healthPoints` is current hit points with taken damage.
    // `this.data.healthPoints` is total hit points.
    this.healthPoints = this.data.healthPoints;
  },

  /**
   * Take damage.
   */
  onBulletHit: function (bullet) {
    if (!this.data.active) { return; }
    this.lastBulletHit = bullet;
    this.healthPoints -= bullet.damagePoints;
    // console.log(this.el.id)
    if (this.healthPoints <= 0) { this.el.emit('die'); }
  }
});

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
    el.addEventListener('end',this.endRun.bind(this));
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
    document.getElementById("score2").object3D.visible = true;
    document.getElementById("time2").object3D.visible = true;
    this.attribute();
    this.appear();
  },

  attribute: function(){
    time = 500;
    var el = this.el;
    this.vulnerable = true;

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
      this.vulnerable = true;
      el.emit('in');
    });

    el.addEventListener('animationcomplete__in',function(e){
      this.vulnerable = false;
      this.timeout = setTimeout(attribut,
        1000 + Math.floor(Math.random() * 3000));
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
    var scoreTitle = document.getElementById("score2");
    var timeTitle = document.getElementById("time2");
    if(document.getElementById('startMessage').object3D.visible == false){
      if(this.vulnerable){
        score += 1;
        times += 3;
        timeTitle.setAttribute('value','Time: ' + times);
        scoreTitle.setAttribute('value','Score: ' + score);
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
      else{
        return;
      }
    }
  },
  endRun: function(){
    var el = this.el;
    el.object3D.visible = false;
    el.object3D.position.y = this.hidingPos;
    this.stop();
    document.getElementById('startMessage').object3D.visible = true;
    document.getElementById("score2").object3D.visible = false;
    document.getElementById("time2").object3D.visible = false;
  } 
});