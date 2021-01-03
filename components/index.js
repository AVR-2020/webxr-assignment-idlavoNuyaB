if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

let score = 0;
let times = 30;

AFRAME.registerComponent('firebase', {
  schema: {
    apiKey: {type: 'string'},
    authDomain: {type: 'string'},
    databaseURL: {type: 'string'},
    storageBucket: {type: 'string'}
  },
  init: function(){
    var el = this.el;
    var config = {
      apiKey: this.data.apiKey,
      authDomain: this.data.authDomain,
      databaseURL: this.data.databaseURL,
      storageBucket: this.data.storageBucket
    };
    if (!(config instanceof Object)) {
      config = AFRAME.utils.styleParser.parse(config);
    }
    this.start = false;
    this.message = document.getElementById('startMessage');
    this.firebase = firebase.initializeApp(config);
    this.database = firebase.database();
    this.entities = {};
    this.highscore = document.getElementById('highscore');
    this.data = this.database.ref('user/').orderByChild('score');
    var usernames = [];
    var scores = [];
    var key = [];
    var add = this.addEntity.bind(this);
    var keys = this.key.bind(this);
    var scoress = this.scores.bind(this);
    var usernamess = this.username.bind(this);
    this.data.once('value',function(snapshot){
      snapshot.forEach(function(child){
        if(child.val().username != undefined){
          usernames.unshift(child.val().username);
          scores.unshift(child.val().score);
          key.unshift(child.key);
        }
      })  
      add(usernames,scores,key);
    })
    this.usernames = usernames;
    this.scores = scores;
    this.key = key;
    this.database.ref('user').on('child_added',function(snapshot){
      add(usernamess(),scoress(),keys());
    })
    el.addEventListener('insert',this.insert.bind(this));
  },
  username: function(){
    return this.usernames;
  },
  scores: function(){
    return this.scores;
  },
  key: function(){
    return this.key;
  },
  addEntity: function(usernames,scores,key){
    for(var j = 0; j< usernames.length; j++){
      if(this.start == true){
        var entity = document.createElement('a-gui-label');
        this.entities[key[j]] = entity;
        entity.setAttribute('height',0.25);
        entity.setAttribute('width',2);
        entity.setAttribute('opacity',0);
        entity.setAttribute('font-family','Roboto');
        entity.setAttribute('font-size','100px');
        entity.setAttribute('font-color','#FFFFFF');
        var i = j+1;
        if(scores[j] < 100 && scores[j] > 9 && j<11 && j!=10){
          entity.setAttribute('value',i + "." + usernames[j] + "                      " + scores[j]);
        } else if(scores[j] >= 100 && j!=10 && j<11){
          entity.setAttribute('value',i + "." + usernames[j] + "                     " + scores[j]);
        } 
        if(j==9){
          if(scores[j] < 100 && scores[j] > 9){
            entity.setAttribute('value',i + "." + usernames[j] + "                    " + scores[j]);
          } else if(scores[j] >= 100){
            entity.setAttribute('value',i + "." + usernames[j] + "                   " + scores[j]);
          }
        }
        this.highscore.appendChild(this.entities[key[j]]);  
      } else if(this.start == false){
        var entity = document.createElement('a-gui-label');
        this.entities[key[j]] = entity;
        entity.setAttribute('height',0.25);
        entity.setAttribute('width',2);
        var i = j+1;
        if(scores[j] < 100 && scores[j] > 9 && j<11 && j!=10){
          entity.setAttribute('value',i + "." + usernames[j] + "                      " + scores[j]);
        } else if(scores[j] >= 100 && j!=10 && j<11){
          entity.setAttribute('value',i + "." + usernames[j] + "                     " + scores[j]);
        } 
        if(j==9){
          if(scores[j] < 100 && scores[j] > 9){
            entity.setAttribute('value',i + "." + usernames[j] + "                    " + scores[j]);
          } else if(scores[j] >= 100){
            entity.setAttribute('value',i + "." + usernames[j] + "                   " + scores[j]);
          }
        }
        entity.setAttribute('opacity',0);
        entity.setAttribute('font-family','Roboto');
        entity.setAttribute('font-size','100px');
        entity.setAttribute('font-color','#FFFFFF');
        this.highscore.appendChild(entity);  
        if(i==10){
          this.start = true;
          return;
        }
      }
    }
  },
  insert: function(){
    var highscore = document.getElementById('highscore')
    highscore.object3D.visible = true;
    highscore.setAttribute('position','0 2.2 -2.5')
    highscore.setAttribute('rotation','0 0 0');
    var keyboard = document.getElementById('keyboard');
    var position = 0;
    for(var j = 0; j < this.usernames.length; j++){
      if(this.scores[9] < score){
        keyboard.setAttribute('super-keyboard','show:true;');
        var entity = this.entities[this.key[j]];
        if (!entity) { return; }
        this.highscore.removeChild(entity);  
        var fail = false;    
      }else {
        keyboard.setAttribute('super-keyboard','show:false;');
        var fail = true;
        score = 0;
        document.getElementById('score2').setAttribute('value','Score: ' + score);
      }
    }
    var ui = this.makeUI.bind(this);
    var check = this.checkScore.bind(this);
    var start = this.message;
    keyboard.addEventListener('superkeyboardinput',function(event){
      check(position,ui,start,event,fail)
    });
    if(fail){
      setTimeout(function () {
        highscore.setAttribute('position','3 2.2 -2')
        highscore.setAttribute('rotation','0 -45 0');
        start.object3D.visible = true;
        document.getElementById('title').object3D.visible = true;
        document.getElementById('howtoplay').object3D.visible = true;  
      },2000)
    }
  },
  checkScore: function(position,ui,start,event,fail){
    for(var j = 0; j < this.usernames.length; j++){
      if(this.scores[j]<score){
        for(var i = j; i < this.scores.length; i++){
          if(this.scores[j]>=this.scores[i]){
            if(i==9){
              this.database.ref('user/' + this.key[i]).remove();
            } 
          } 
        }
        delete this.entities[this.key[9]];
        this.key.pop();
        this.usernames.pop();
        this.scores.pop();
        position = j;
        var insert = this.database.ref('user').push();
        this.key.splice(position,0,insert.key);
        if(fail == true){
          var name = "RRR"
          score = 0;
        } else if (fail == false){
          var name = event.detail.value;
        }
        var user = {
          username: name,
          score: score
        }
        ui(insert.key,position,user);
        insert.set(user);
        score = 0;
        document.getElementById('score2').setAttribute('value','Score: ' + score);
        setTimeout(function () {
          highscore.setAttribute('position','3 2.2 -2')
          highscore.setAttribute('rotation','0 -45 0');
          start.object3D.visible = true;
          document.getElementById('title').object3D.visible = true;
          document.getElementById('howtoplay').object3D.visible = true;  
        },2000)
        break;
      }
    }
  },
  makeUI: function(key,position,user){
    this.usernames.splice(position,0,user.username);
    this.scores.splice(position,0,user.score);
    var entity = document.createElement('a-gui-label');
    this.entities[key] = entity;
    entity.setAttribute('height',0.25);
    entity.setAttribute('width',2);
    var i = position+1;
    if(this.scores[position] < 100 && this.scores[position] > 9 && position<11 && position!=10){
      entity.setAttribute('value',i + "." + this.usernames[position] + "                      " + this.scores[position]);
    } else if(this.scores[position] >= 100 && position!=10 && position<11){
      entity.setAttribute('value',i + "." + this.usernames[position] + "                     " + this.scores[position]);
    } 
    if(position==9){
      if(this.scores[position] < 100 && this.scores[position] > 9){
        entity.setAttribute('value',i + "." + this.usernames[position] + "                    " + this.scores[position]);
      } else if(this.scores[position] >= 100){
        entity.setAttribute('value',i + "." + this.usernames[position] + "                   " + this.scores[position]);
      }
    }
    entity.setAttribute('opacity',0);
    entity.setAttribute('font-family','Roboto');
    entity.setAttribute('font-size','100px');
    entity.setAttribute('font-color','#2BEB01');
  }
});

AFRAME.registerComponent('timer-countdown', {
  init: function(){
    var el = this.el;
    this.message = document.getElementById('startMessage');
    this.timer = document.getElementById('time2');
    this.interval = null;
    this.scaling = 1;
    this.adder = 1;
    el.addEventListener('timer',this.run.bind(this));
    el.addEventListener('end',this.endRun.bind(this));
  },
  run:function(){
    var countdown = this.countdown.bind(this);
    this.interval = setInterval(countdown,1000);
  },
  countdown: function(){
    if(this.message.object3D.visible == false){
      if(times <= 0){
        clearInterval(this.interval);
        this.interval = null;
        if(this.interval == null){
          var run = this.endRun.bind(this);
          times = 31;
          let enemy = document.querySelectorAll('.enemy');
          for(let i=0 ; i<enemy.length;i++){
            enemy[i].emit('end');
          }
          run();
        }
      }
      if(times >= 60){
        times == 45;
      }
      if(score >= 50 * this.scaling){
        if(score == 50 * this.scaling){
          this.scaling = this.scaling + this.adder;
        }
        console.log(this.scaling);
        times -= this.scaling;
      } else {
        if(score == 13){
          times -= 6;
          if(times <= 0){
            times = 1;
          }
        }
        times -= this.scaling;
      }
      this.timer.setAttribute('value','Time: ' + times);
    }
  },
  endRun:function(){
    this.timer.object3D.visible = false;
    var scene = document.getElementById('scene');
    scene.emit('insert');
  }
});

AFRAME.registerComponent('in-vr', {
  init: function(){
    var vr = document.getElementById('scene');
    var scoreTitle = document.getElementById("score2");
    var timeTitle = document.getElementById("time2");
    var rightGun = document.getElementById("rightGun");
    var leftGun = document.getElementById("leftGun");
    var gun = document.getElementById("gun");
    leftGun.object3D.visible = false;
    rightGun.object3D.visible = false;
    vr.addEventListener('enter-vr', function() {
      timeTitle.setAttribute('position','-0.2 0.9 -1');
      scoreTitle.setAttribute('position','-0.2 -0.9 -1');
      leftGun.object3D.visible = true;
      rightGun.object3D.visible = true;
      gun.object3D.visible = false;
      var keyboard = document.getElementById("keyboard");
      var entity = document.createElement('a-entity');
      keyboard.parentNode.removeChild(keyboard);
      entity.setAttribute('id','keyboard');
      entity.setAttribute('position','0 1.076 -0.5');
      entity.setAttribute('rotation','-30 0 0');
      entity.setAttribute('super-keyboard','hand: #rightGun; imagePath:asset/images/; maxLength:3; filters:allupper; font:roboto; show:false;');
      vr.appendChild(entity);
    })
    vr.addEventListener('exit-vr', function() {
      timeTitle.setAttribute('position','-0.2 0.7 -1');
      scoreTitle.setAttribute('position','-0.2 -0.7 -1');
      leftGun.object3D.visible = false;
      rightGun.object3D.visible = false;
      gun.object3D.visible = true;
      gun.setAttribute('position','0.07 -0.1 -0.15');
      var keyboard = document.getElementById("keyboard");
      var entity = document.createElement('a-entity');
      keyboard.parentNode.removeChild(keyboard);
      entity.setAttribute('id','keyboard');
      entity.setAttribute('position','0 1.076 -0.5');
      entity.setAttribute('rotation','-30 0 0');
      entity.setAttribute('super-keyboard','hand: #gun; imagePath:asset/images/; maxLength:3; filters:allupper; font:roboto; show:false;');
      vr.appendChild(entity);
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
    this.delay = 0;
    this.random = Math.floor((Math.random()*2)+1);
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
    el.object3D.visible = true;
    // Save hidingPos (default position on the Supercraft site).
    this.hidingPos = el.object3D.position.y;
    // Depending the type of enemy, the further it is, the higher it has to rise.
    lift = this.data.type * 1.2;
    this.showingPos = this.hidingPos + lift;
    document.getElementById('title').object3D.visible = false;
    document.getElementById('startMessage').object3D.visible = false;
    document.getElementById('highscore').object3D.visible = false;
    document.getElementById('howtoplay').object3D.visible = false;
    document.getElementById("score2").object3D.visible = true;
    document.getElementById("time2").object3D.visible = true;
    this.attribute();
    this.appear();
  },

  attribute: function(){
    var lift;
    var time = 500;
    var el = this.el;
    lift = this.data.type * 1.2;
    if(this.data.type == 4){
      if(this.random == 1){
        this.showingPos = this.hidingPos + lift;
      } else {
        this.showingPos = this.hidingPos - lift;
      }
      el.setAttribute('animation__out',
      `property: position;,
      from: ${el.object3D.position.x} ${this.hidingPos} ${el.object3D.position.z};
      to: ${el.object3D.position.x} ${this.showingPos} ${el.object3D.position.z};
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
      this.random = Math.floor((Math.random()*2)+1);
    } else {
      el.setAttribute('animation__out',
      `property: position;,
      from: ${el.object3D.position.x} ${this.hidingPos} ${el.object3D.position.z};
      to: ${el.object3D.position.x} ${this.showingPos} ${el.object3D.position.z};
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
    }
    el.emit('out');
  },

  appear:function(){
    var el = this.el;
    var endAppear = this.endAppear.bind(this);
    var endDisappear = this.endDisappear.bind(this);
    el.addEventListener('animationcomplete__out',endAppear);
    el.addEventListener('animationcomplete__in',endDisappear);

    this.el.querySelector('[sound]').components.sound.playSound();
  },
  endAppear:function(){
    var el = this.el;
    this.vulnerable = true;
    el.emit('in');
  },
  endDisappear:function(){
    var attribut = this.attribute.bind(this);
    this.vulnerable = false;
    this.delay = 1000 + Math.floor(Math.random() * 3000); 
    this.timeout = setTimeout(attribut,this.delay);
  },
  /**
   * Stop tweens and timeouts.
   */
  stop: function () {
    clearTimeout(this.timeout)
    this.timeout = null;
    if(this.timeout == null){
        this.el.removeAttribute('animation__in');
        this.el.removeAttribute('animation__out');
        this.vulnerable = false;  
    }
  },

  /**
   * Enemy was killed (this is called via `die` event thrown by the bullets when collide).
   */
  die: function (evt) {
    var el = this.el;
    var scoreTitle = document.getElementById("score2");
    var timeTitle = document.getElementById("time2");
    if(document.getElementById('startMessage').object3D.visible == false){
      if(!this.vulnerable){return;}
      if(this.data.type == 4){
        score += 1
      }
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
  },
  endRun: function(){
    var el = this.el;
    el.object3D.visible = false;
    el.object3D.position.y = this.hidingPos;
    this.stop();
    document.getElementById("score2").object3D.visible = false;
    document.querySelector('#music').components.sound.stopSound();
  } 
});
