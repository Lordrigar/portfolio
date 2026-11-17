import Phaser from 'phaser';

export function createGame(parent) {
  class Street extends Phaser.Scene {
    preload() {
      this.load.image('street', '/games/fox-adventure/maps/street.png');
      this.load.image('crouch-source', '/games/fox-adventure/sprites/crouch-source.png');
      for (const [name, frames] of [['idle', 4], ['walk', 8], ['run', 8], ['jump', 4], ['throw', 6], ['projectile', 4], ['hit', 3]]) {
        this.load.spritesheet(name, `/games/fox-adventure/sprites/${name}.png`, { frameWidth: 192, frameHeight: 176, endFrame: frames - 1 });
      }
    }

    create() {
      if (!this.textures.exists('crouch')) {
        // Fit the generated pose to the existing frame and remove faint alpha
        // outside its outline so it stays crisp against the street backdrop.
        const texture = this.textures.createCanvas('crouch', 192, 176);
        const context = texture.context;
        context.imageSmoothingEnabled = false;
        context.drawImage(this.textures.get('crouch-source').getSourceImage(), 311, 258, 814, 721, 32, 52, 128, 113);
        const pixels = context.getImageData(0, 0, 192, 176);
        for (let i = 3; i < pixels.data.length; i += 4) {
          pixels.data[i] = pixels.data[i] >= 200 ? 255 : 0;
        }
        context.putImageData(pixels, 0, 0);
        texture.refresh();
      }
      this.wasJump = false;
      this.throwUntil = 0;
      this.nextThrow = 0;
      this.crouching = false;
      const viewHeight = 540;
      const source = this.textures.get('street').getSourceImage();
      const mapScale = viewHeight / source.height;
      const openingWidth = Math.round(source.width * mapScale);
      const extensionWidth = 360;
      this.levelWidth = openingWidth + extensionWidth;
      const pavementY = 461;
      const spawnX = Math.round(openingWidth * 0.185);
      this.physics.world.setBounds(20, 0, this.levelWidth - 40, viewHeight);
      this.cameras.main.setBounds(0, 0, this.levelWidth, viewHeight);
      this.add.image(0, 0, 'street').setOrigin(0).setDisplaySize(openingWidth, viewHeight);
      // Only the opening contains the neon shop. The short continuation uses
      // a crop well to its right, without tiling the shop into the street.
      const street = this.textures.get('street');
      if (!street.has('continuation')) {
        street.add('continuation', 0, Math.round(source.width * 0.375), 0,
          Math.round(extensionWidth / mapScale), source.height);
      }
      this.add.image(openingWidth, 0, 'street', 'continuation').setOrigin(0)
        .setDisplaySize(extensionWidth, viewHeight);

      // One continuous invisible walking surface across the opening and extension.
      const platforms = this.physics.add.staticGroup();
      const pavement = this.add.rectangle(this.levelWidth / 2, pavementY + 40, this.levelWidth, 80).setVisible(false);
      this.physics.add.existing(pavement, true);
      platforms.add(pavement);
      for (const [key, end, rate] of [['idle',3,4], ['walk',7,9], ['run',7,14]]) {
        if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, { start: 0, end }), frameRate: rate, repeat: -1 });
      }
      for (const [key, end, rate, repeat] of [['throw', 5, 14, 0], ['projectile', 3, 12, -1], ['hit', 2, 16, 0]]) {
        if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, { start: 0, end }), frameRate: rate, repeat });
      }
      this.bottles = this.physics.add.group();
      this.physics.add.collider(this.bottles, platforms, (bottle) => this.breakBottle(bottle));
      this.fox = this.physics.add.sprite(spawnX, pavementY, 'idle').setOrigin(0.5, 165 / 176).setScale(0.55).setCollideWorldBounds(true);
      this.fox.setVisible(false);
      this.fox.body.setSize(78, 130).setOffset(57, 35);
      this.foxArt = this.add.sprite(spawnX, pavementY, 'idle').setOrigin(0.5, 165 / 176).setScale(0.55);
      // Render one visible character after physics has finished positioning it.
      const syncArtwork = () => {
        this.foxArt.setPosition(this.fox.x, this.fox.y).setFlipX(this.fox.flipX);
        this.foxArt.setScale(0.55);
      };
      this.events.on('postupdate', syncArtwork);
      this.events.once('shutdown', () => this.events.off('postupdate', syncArtwork));
      this.physics.add.collider(this.fox, platforms);
      this.keys=this.input.keyboard.addKeys('W,A,S,D,SPACE,SHIFT,R');
      // Register after Phaser's listener: preventing default earlier would make
      // Phaser discard Space before the throw action can receive it.
      const preventScroll = (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.target instanceof HTMLElement &&
            (event.target.isContentEditable || event.target.closest('input, textarea, select, button, a'))) return;
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      };
      window.addEventListener('keydown', preventScroll, { passive: false });
      this.events.once('shutdown', () => window.removeEventListener('keydown', preventScroll));
      this.cameras.main.startFollow(this.fox, true, 0.1, 1);
      this.cameras.main.setDeadzone(300, 540);
      this.cameras.main.setScroll(0, 0);
    }


    breakBottle(bottle) {
      if (!bottle.active) return;
      const splash = this.add.sprite(bottle.x, bottle.y, 'hit').setOrigin(0.5, 0.75).setScale(0.55);
      bottle.destroy();
      splash.play('hit');
      splash.once('animationcomplete', () => splash.destroy());
    }

    throwBottle(time) {
      const direction = this.fox.flipX ? -1 : 1;
      const bottle = this.bottles.create(this.fox.x + direction * 35, this.fox.y - (this.crouching ? 32 : 52), 'projectile');
      bottle.setOrigin(0.5, 0.75).setScale(0.55).setFlipX(direction < 0);
      bottle.body.setSize(65, 45).setOffset(63, 105);
      bottle.setVelocity(direction * 380, -220).setGravityY(-600);
      bottle.play('projectile');
      this.time.delayedCall(2500, () => { if (bottle.active) bottle.destroy(); });
      this.throwUntil = time + 430;
      this.nextThrow = time + 500;
      this.foxArt.play('throw', true);
    }

    update(time) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.R)) { this.scene.restart(); return; }
      const grounded = this.fox.body.blocked.down;
      const crouching = this.keys.S.isDown && grounded;
      if (crouching !== this.crouching) {
        const body = this.fox.body;
        const previousHeight = body.height;
        // Change only the collision rectangle; the physics sprite never scales.
        body.setSize(78, crouching ? 80 : 130, false).setOffset(57, crouching ? 85 : 35);
        const resizeOffset = previousHeight - body.height;
        body.position.y += resizeOffset;
        body.prev.y += resizeOffset;
        body.prevFrame.y += resizeOffset;
        body.updateCenter();
        this.crouching = crouching;
      }
      const direction = Number(this.keys.D.isDown) - Number(this.keys.A.isDown);
      const run = this.keys.SHIFT.isDown;
      this.fox.setVelocityX(crouching ? 0 : direction * (run ? 310 : 185));
      if (direction && !crouching) this.fox.setFlipX(direction < 0);
      const jump = this.keys.W.isDown;
      if (jump && !this.wasJump && grounded && !crouching) this.fox.setVelocityY(-480);
      this.wasJump = jump;
      if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) && time >= this.nextThrow) this.throwBottle(time);
      if (crouching) {
        this.foxArt.anims.stop();
        this.foxArt.setTexture('crouch');
      } else if (time < this.throwUntil) {
        this.foxArt.play('throw', true);
      } else if (!grounded) {
        this.foxArt.anims.stop();
        this.foxArt.setTexture('jump', this.fox.body.velocity.y < 0 ? 1 : 2);
      } else {
        this.foxArt.play(crouching ? 'idle' : direction ? (run ? 'run' : 'walk') : 'idle', true);
      }

    }
  }
  return new Phaser.Game({type:Phaser.AUTO,parent,width:960,height:540,pixelArt:true,backgroundColor:'#121c30',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},physics:{default:'arcade',arcade:{gravity:{y:1100}}},scene:Street});
}
