import Phaser from 'phaser';
import { PowerupState, POWER_DURATION } from './powerup.mjs';
import { SOLO_HEALTH, BOTTLE_DAMAGE, PUNCH_DAMAGE, SLIPPER_GRAVITY, slipperTrajectory, remainingSoloHealth } from './combat.mjs';

export function createGame(parent, { onComplete } = {}) {
  class Intro extends Phaser.Scene {
    constructor() { super('Intro'); }

    create() {
      this.cameras.main.setBackgroundColor('#000000');
      // A small bitmap alphabet keeps the title pixel-sharp without web fonts.
      const glyphs = {
        P: ['11110','10001','10001','11110','10000','10000','10000'],
        o: ['00000','00000','01110','10001','10001','10001','01110'],
        w: ['00000','00000','10001','10001','10101','10101','01010'],
        i: ['00100','00000','01100','00100','00100','00100','01110'],
        ś: ['00010','00100','01111','10000','01110','00001','11110'],
        l: ['01100','00100','00100','00100','00100','00100','01110'],
        e: ['00000','00000','01110','10001','11111','10000','01111'],
        '2': ['01110','10001','00001','00010','00100','01000','11111'],
        '0': ['01110','10001','10011','10101','11001','10001','01110'],
        '6': ['00110','01000','10000','11110','10001','10001','01110'],
      };
      const label = 'Powiśle 2026';
      const pixel = 4;
      const title = this.add.graphics({ x: (960 - (label.length * 6 - 1) * pixel) / 2, y: 256 });
      title.fillStyle(0xf3e9d3);
      [...label].forEach((letter, index) => {
        glyphs[letter]?.forEach((row, y) => {
          [...row].forEach((bit, x) => {
            if (bit === '1') title.fillRect((index * 6 + x) * pixel, y * pixel, pixel, pixel);
          });
        });
      });
      title.setAlpha(0);
      this.tweens.add({ targets: title, alpha: 1, duration: 800, hold: 700, yoyo: true,
        onComplete: () => this.scene.start('Street') });
    }
  }
  class Street extends Phaser.Scene {
    constructor(key = 'Street') { super(key); }
    init(data = {}) { this.initialData = data; }
    preload() {
      this.load.spritesheet('drink', '/games/fox-adventure/sprites/powerup/drink.png', { frameWidth: 320, frameHeight: 320 });
      for (const name of ['idle', 'walk', 'run', 'jump', 'crouch', 'punch']) {
        this.load.spritesheet(`muscle-${name}`, `/games/fox-adventure/sprites/muscle/${name}.png`, { frameWidth: 192, frameHeight: 176 });
      }
      this.load.spritesheet('death', '/games/fox-adventure/sprites/death/death.png', { frameWidth: 192, frameHeight: 176 });
      this.load.spritesheet('bell-idle', '/games/fox-adventure/sprites/bell/idle.png', { frameWidth: 320, frameHeight: 288 });
      this.load.spritesheet('bell-attack', '/games/fox-adventure/sprites/bell/attack.png', { frameWidth: 320, frameHeight: 288 });
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
      this.ending = false;
      this.dying = false;
      this.fading = false;
      this.collectedBottles = this.initialData?.bottles ?? 0;
      this.health = this.initialData?.health ?? 3;
      this.power = this.initialData?.power ?? new PowerupState();
      this.nextPunch = 0;
      this.wasGrounded = true;
      this.jumpStartUntil = 0;
      this.landingUntil = 0;
      this.punchUntil = 0;
      this.invulnerableUntil = 0;
      this.wasJump = false;
      this.throwUntil = 0;
      this.nextThrow = 0;
      this.crouching = false;
      const { pavement, platforms, pavementY, spawnX } = this.createLevel();
      for (const [key, end, rate] of [['idle',3,4], ['walk',7,9], ['run',7,14]]) {
        if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, { start: 0, end }), frameRate: rate, repeat: -1 });
      }
      for (const [key, end, rate, repeat] of [['throw', 5, 14, 0], ['projectile', 3, 12, -1], ['hit', 2, 16, 0]]) {
        if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, { start: 0, end }), frameRate: rate, repeat });
      }
      for (const [key, end, repeat] of [['bell-idle', 5, -1], ['bell-attack', 7, 0]]) {
        if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, { start: 0, end }), frameRate: key === 'bell-idle' ? 6 : 12, repeat });
      }
      this.bell = this.add.sprite(this.levelWidth - 125, pavementY - 25, 'bell-idle')
        .setOrigin(0.5, 0.85).setScale(0.4).setDepth(3).play('bell-idle');
      this.bellHover = this.tweens.add({ targets: this.bell, y: this.bell.y - 6, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      if (!this.anims.exists('death')) this.anims.create({
        key: 'death', frames: this.anims.generateFrameNumbers('death', { start: 0, end: 6 }), frameRate: 7, repeat: 0,
      });
      for (const [key, count, fps, repeat] of [
        ['drink', 8, 8, 0], ['muscle-idle', 4, 5, -1], ['muscle-walk', 8, 9, -1],
        ['muscle-run', 8, 14, -1], ['muscle-jump', 4, 10, 0],
        ['muscle-crouch', 3, 10, 0], ['muscle-punch', 6, 14, 0],
      ]) {
        if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, { start: 0, end: count - 1 }), frameRate: fps, repeat });
      }
      this.bottles = this.physics.add.group();
      this.physics.add.collider(this.bottles, platforms, (bottle) => this.breakBottle(bottle), (bottle, platform) => {
        if (platform === pavement) return true;
        return bottle.body.velocity.y >= 0 &&
          bottle.body.prev.y + bottle.body.height <= platform.body.top + 4;
      });
      this.fox = this.physics.add.sprite(spawnX, pavementY, 'idle').setOrigin(0.5, 165 / 176).setScale(0.55).setCollideWorldBounds(true);
      this.fox.setVisible(false);
      this.fox.body.setSize(78, 130).setOffset(57, 35);
      this.foxArt = this.add.sprite(spawnX, pavementY, 'idle').setOrigin(0.5, 165 / 176).setScale(0.55);
      // Render one visible character after physics has finished positioning it.
      const syncArtwork = () => {
        this.foxArt.setPosition(this.fox.x, this.fox.y).setFlipX(this.fox.flipX);
        const drinking = this.power.phase === 'drinking' || this.power.phase === 'flashing';
        this.foxArt.setOrigin(0.5, drinking ? 302 / 320 : 165 / 176).setScale(drinking ? 0.28 : 0.55);
      };
      this.events.on('postupdate', syncArtwork);
      this.events.once('shutdown', () => this.events.off('postupdate', syncArtwork));
      this.physics.add.collider(this.fox, platforms, undefined, (fox, platform) => {
        if (platform === pavement) return true;
        // Only land from above; walking underneath or jumping through a ledge
        // must never collide with its sides or underside.
        return fox.body.velocity.y >= 0 &&
          fox.body.prev.y + fox.body.height <= platform.body.top + 4;
      });

      // Tight texture bounds give pickups a visible, predictable overlap area.
      const projectile = this.textures.get('projectile');
      if (!projectile.has('pickup')) projectile.add('pickup', 0, 64, 116, 63, 52);
      this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });
      for (const [x, y] of this.pickupLocations()) {
        const pickup = this.pickups.create(x, y, 'projectile', 'pickup').setScale(0.7);
        this.tweens.add({ targets: pickup, y: y - 8, duration: 950, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
      this.add.rectangle(770, 22, 166, 48, 0x10121c, 0.9).setOrigin(0).setStrokeStyle(1, 0x766c70).setScrollFactor(0).setDepth(10);
      this.add.image(795, 46, 'projectile', 'pickup').setScale(0.45).setScrollFactor(0).setDepth(11);
      this.bottleCounter = this.add.text(818, 46, '0 / 3', {
        fontFamily: 'monospace', fontSize: '22px', fontStyle: 'bold', color: '#f3e9d3',
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(11);
      this.add.rectangle(770, 78, 166, 44, 0x10121c, 0.9).setOrigin(0).setStrokeStyle(1, 0x766c70).setScrollFactor(0).setDepth(10);
      this.hearts = this.add.graphics().setScrollFactor(0).setDepth(11);
      this.updateBottleCounter();
      this.drawHearts();
      this.add.rectangle(626, 22, 134, 48, 0x10121c, 0.9).setOrigin(0).setStrokeStyle(1, 0x766c70).setScrollFactor(0).setDepth(10);
      const powerIcon = this.add.graphics().setScrollFactor(0).setDepth(11);
      this.drawBeer(powerIcon, 640, 34, 0.5, 1);
      this.powerCounter = this.add.text(673, 46, 'Q READY', { fontFamily: 'monospace', fontSize: '15px', color: '#f3d475' })
        .setOrigin(0, 0.5).setScrollFactor(0).setDepth(11);
      this.beerTimer = this.add.graphics().setScrollFactor(0).setDepth(11).setVisible(false);
      this.beerSeconds = this.add.text(480, 96, '', { fontFamily: 'monospace', fontSize: '14px', color: '#ffe1a3' })
        .setOrigin(0.5).setScrollFactor(0).setDepth(11).setVisible(false);
      this.events.on('player-hit', this.takeDamage, this);
      this.events.once('shutdown', () => this.events.off('player-hit', this.takeDamage, this));
      this.physics.add.overlap(this.fox, this.pickups, (_fox, pickup) => {
        if (!pickup.active || this.dying) return;
        this.tweens.killTweensOf(pickup);
        pickup.disableBody(true, true);
        this.collectedBottles += 1;
        this.updateBottleCounter();
      });
      this.keys=this.input.keyboard.addKeys('W,A,S,D,SPACE,SHIFT,R,Q');
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
      this.cameras.main.fadeIn(650, 0, 0, 0);
    }


    createLevel() {
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
      // Keep the painted ledge, with a dark backing and bright rim that clearly
      // distinguish playable platforms from the scenery.
      if (!street.has('platform')) street.add('platform', 0, 475, 274, 220, 24);
      for (const [x, y] of [[540, 385], [730, 310], [1040, 385], [1230, 310], [1625, 370]]) {
        this.add.rectangle(x, y + 3, 170, 26, 0x10121c, 0.95);
        platforms.create(x, y, 'street', 'platform').setDisplaySize(160, 18).refreshBody();
        this.add.rectangle(x, y, 164, 20).setStrokeStyle(2, 0xf4bd65);
        this.add.rectangle(x, y - 8, 160, 3, 0xffe1a3);
      }
      return { pavement, platforms, pavementY, spawnX };
    }

    pickupLocations() { return [[730, 260], [1230, 260], [1625, 320]]; }

    drawHearts() {
      const pixels = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
      const powered = this.power.phase === 'active';
      const count = powered ? 5 : 3;
      const size = 3;
      const gap = powered ? 28 : 37;
      const start = 770 + Math.round((166 - ((count - 1) * gap + 7 * size)) / 2);
      this.hearts.clear();
      for (let heart = 0; heart < count; heart++) {
        const x = start + heart * gap;
        const bonus = heart >= 3;
        const filled = bonus ? heart - 3 < this.power.bonusHealth : heart < this.health;
        pixels.forEach((row, y) => {
          [...row].forEach((pixel, column) => {
            if (pixel !== '1') return;
            this.hearts.fillStyle(0x090d14).fillRect(x + column * size + 1, 93 + y * size, size, size);
            this.hearts.fillStyle(filled ? (bonus ? 0xffce55 : 0xf06477) : 0x483945)
              .fillRect(x + column * size, 91 + y * size, size, size);
          });
        });
        if (filled) this.hearts.fillStyle(0xffedcb).fillRect(x + size, 94, size * 2, size);
      }
    }

    updateBottleCounter() {
      this.bottleCounter.setText(`${this.collectedBottles} / 3`)
        .setColor(this.collectedBottles === 3 ? '#79d7be' : '#f3e9d3');
    }

    drawBeer(graphics, x, y, scale, fraction) {
      const rect = (color, dx, dy, w, h) => graphics.fillStyle(color).fillRect(x + dx * scale, y + dy * scale, w * scale, h * scale);
      rect(0x0b111b, -8, -8, 64, 92);
      rect(0xf6dfb2, 40, 16, 14, 36);
      rect(0x17232a, 44, 22, 6, 24);
      rect(0xf6dfb2, 0, 8, 44, 64);
      rect(0x29353b, 4, 12, 36, 56);
      const fill = Math.max(0, Math.min(1, fraction));
      const height = Math.ceil(48 * fill / 4) * 4;
      if (height > 0) {
        rect(0xf1ae29, 4, 68 - height, 36, height);
        rect(0xffd15c, 8, 68 - height, 8, height);
        rect(0xfff0ca, 4, 64 - height, 36, 8);
      }
      rect(0xffffff, 8, 16, 4, 8);
    }

    updatePowerHud(time) {
      const active = this.power.phase === 'active';
      const preparing = ['drinking', 'flashing'].includes(this.power.phase);
      const cooldown = this.power.cooldown(time);
      this.powerCounter.setText(preparing ? 'Q ...' : cooldown ? `Q ${cooldown}s` : 'Q READY');
      this.beerTimer.setVisible(active).clear();
      this.beerSeconds.setVisible(active);
      if (active) {
        this.drawBeer(this.beerTimer, 458, 18, 0.8, this.power.remaining(time) / POWER_DURATION);
        this.beerSeconds.setText(`${Math.ceil(this.power.remaining(time) / 1000)}s`);
      }
    }

    startPowerup(time) {
      const result = this.power.request(time, this.collectedBottles);
      if (result !== 'started') {
        const counter = result === 'missing-bottle' ? this.bottleCounter : this.powerCounter;
        this.tweens.killTweensOf(counter);
        counter.setColor(result === 'missing-bottle' ? '#ff455d' : '#ffbf55');
        this.tweens.add({ targets: counter, alpha: 0.25, duration: 100, yoyo: true, repeat: 3,
          onComplete: () => { counter.setAlpha(1); if (counter === this.bottleCounter) this.updateBottleCounter(); else counter.setColor('#f3d475'); } });
        return;
      }
      this.collectedBottles--;
      this.updateBottleCounter();
      this.fox.setVelocityX(0);
      this.setCrouching(false);
      this.throwUntil = 0;
      this.foxArt.once('animationcomplete-drink', () => {
        if (this.dying || this.ending || this.power.phase !== 'drinking') return;
        this.power.phase = 'flashing';
        this.flashWhite();
        this.time.delayedCall(700, () => {
          if (this.dying || this.ending) return;
          this.power.activate(this.time.now);
          this.foxArt.clearTint().play('muscle-idle');
          this.drawHearts();
        });
      });
      this.foxArt.play('drink');
    }

    flashWhite() {
      if (this.ending || this.dying) return;
      this.whiteFlash?.remove(false);
      let white = true;
      this.foxArt.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      this.whiteFlash = this.time.addEvent({ delay: 100, repeat: 4, callback: () => {
        if (this.ending || this.dying) return;
        white = !white;
        if (white) this.foxArt.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
        else this.foxArt.clearTint();
      } });
    }

    endPowerup() {
      this.punchUntil = 0;
      this.foxArt.clearTint().play('idle');
      this.flashWhite();
      this.drawHearts();
    }

    punch(time) {
      this.nextPunch = time + 500;
      this.punchUntil = time + 430;
      this.foxArt.play('muscle-punch', true);
      this.events.emit('player-attack', { kind: 'punch' });
      this.time.delayedCall(160, () => {
        if (this.ending || this.power.phase !== 'active') return;
        const direction = this.fox.flipX ? -1 : 1;
        const hitbox = this.add.zone(this.fox.x + direction * 48, this.fox.y - 42, 48, 42);
        this.physics.add.existing(hitbox);
        hitbox.body.setAllowGravity(false);
        this.events.emit('player-punch', { hitbox, damage: PUNCH_DAMAGE, direction });
        this.time.delayedCall(140, () => hitbox.destroy());
      });
    }

    setCrouching(crouching) {
      if (crouching === this.crouching) return;
      const body = this.fox.body;
      const previousHeight = body.height;
      body.setSize(78, crouching ? 80 : 130, false).setOffset(57, crouching ? 85 : 35);
      const resizeOffset = previousHeight - body.height;
      body.position.y += resizeOffset;
      body.prev.y += resizeOffset;
      body.prevFrame.y += resizeOffset;
      body.updateCenter();
      this.crouching = crouching;
    }

    takeDamage(amount = 1) {
      if (!Number.isFinite(amount) || amount < 1 || this.health + this.power.bonusHealth <= 0 || this.dying || this.time.now < this.invulnerableUntil) return false;
      this.health = Math.max(0, this.health - this.power.absorbDamage(Math.floor(amount)));
      this.invulnerableUntil = this.time.now + 800;
      this.drawHearts();
      this.tweens.add({ targets: this.foxArt, alpha: 0.35, duration: 80, yoyo: true, repeat: 4,
        onComplete: () => this.foxArt.setAlpha(1) });
      this.events.emit('health-changed', this.health + this.power.bonusHealth);
      if (this.health === 0) {
        this.playDeath();
        this.events.emit('player-defeated');
      }
      return true;
    }

    fadeToRestart() {
      if (this.fading) return;
      this.fading = true;
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => onComplete?.());
      this.cameras.main.fadeOut(2200, 0, 0, 0);
    }

    playDeath() {
      if (this.dying) return;
      this.dying = true;
      this.ending = true;
      this.power.cancel();
      this.drawHearts();
      this.updatePowerHud(this.time.now);
      // Cancel any pending homecoming actions or damage flash so nothing
      // overrides the death animation or starts a competing ending.
      this.time.removeAllEvents();
      this.tweens.killTweensOf(this.foxArt);
      this.fox.setVelocity(0, 0);
      this.bottles.clear(true, true);
      this.foxArt.clearTint().setAlpha(1).setAngle(0);
      this.foxArt.once('animationcomplete-death', () => {
        this.time.delayedCall(650, () => this.fadeToRestart());
      });
      this.foxArt.play('death');
    }

    finishAdventure() {
      if (this.ending) return;
      this.ending = true;
      if (['drinking', 'flashing'].includes(this.power.phase)) this.power.cancel();
      this.foxArt.clearTint().setAlpha(1);
      this.fox.setVelocity(0, 0).setFlipX(false);
      this.foxArt.setAngle(0).play(this.power.phase === 'active' ? 'muscle-idle' : 'idle', true);
      this.bottles.clear(true, true);
      this.bellHover.stop();
      this.bell.play('bell-attack');
      this.time.delayedCall(350, () => {
        // A story beat only: recoil without removing normal or bonus hearts.
        if (this.dying) return;
        this.fox.setVelocityX(-65);
        this.foxArt.setTint(0xffb7a5);
        this.tweens.add({ targets: this.foxArt, angle: -14, duration: 100, yoyo: true });
        this.cameras.main.shake(140, 0.002);
        this.time.delayedCall(180, () => {
          this.fox.setVelocityX(0);
          this.foxArt.clearTint();
        });
      });
      this.bell.once('animationcomplete', () => this.bell.play('bell-idle'));
      this.time.delayedCall(650, () => {
        const x = this.bell.x - 205;
        const y = this.bell.y - 155;
        const bubble = this.add.graphics().setDepth(20);
        bubble.fillStyle(0xfff2d6).fillRoundedRect(x, y, 264, 60, 8);
        bubble.lineStyle(3, 0x352830).strokeRoundedRect(x, y, 264, 60, 8);
        bubble.fillStyle(0xfff2d6).fillTriangle(this.bell.x - 12, y + 57, this.bell.x + 6, y + 57, this.bell.x, y + 76);
        this.add.text(x + 14, y + 12, 'Finally, you are home!', {
          fontFamily: 'monospace', fontSize: '18px', color: '#352830', wordWrap: { width: 240 },
        }).setDepth(21);
      });
      this.time.delayedCall(3000, () => {
        if (this.dying) return;
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start('Room', { health: this.health, bottles: this.collectedBottles, power: this.power });
        });
        this.cameras.main.fadeOut(1400, 0, 0, 0);
      });
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
      this.events.emit('player-attack', { kind: 'bottle' });
    }

    update(time) {
      if (this.power.expire(time)) this.endPowerup();
      this.updatePowerHud(time);
      if (this.ending) return;
      if (Phaser.Input.Keyboard.JustDown(this.keys.R)) { this.scene.restart(); return; }
      if (this.health === 0) return;
      const grounded = this.fox.body.blocked.down;
      if (this.sys.settings.key === 'Street' && grounded && this.fox.x >= this.bell.x - 65) { this.finishAdventure(); return; }
      if (Phaser.Input.Keyboard.JustDown(this.keys.Q)) this.startPowerup(time);
      if (['drinking', 'flashing'].includes(this.power.phase)) {
        this.fox.setVelocityX(0);
        this.wasJump = this.keys.W.isDown;
        return;
      }
      const powered = this.power.phase === 'active';
      if (grounded && !this.wasGrounded) this.landingUntil = time + 90;
      this.wasGrounded = grounded;
      const crouching = this.keys.S.isDown && grounded;
      const enteredCrouch = crouching && !this.crouching;
      const leavingCrouch = !crouching && this.crouching;
      this.setCrouching(crouching);
      const direction = Number(this.keys.D.isDown) - Number(this.keys.A.isDown);
      const run = this.keys.SHIFT.isDown;
      this.fox.setVelocityX(crouching ? 0 : direction * (run ? 310 : 185));
      if (direction && !crouching) this.fox.setFlipX(direction < 0);
      const jump = this.keys.W.isDown;
      if (jump && !this.wasJump && grounded && !crouching) {
        this.fox.setVelocityY(-480);
        this.jumpStartUntil = time + 90;
      }
      this.wasJump = jump;
      if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
        if (powered && time >= this.nextPunch) this.punch(time);
        else if (!powered && time >= this.nextThrow) this.throwBottle(time);
      }
      if (powered && time < this.punchUntil) this.foxArt.play('muscle-punch', true);
      else if (crouching) {
        if (powered) {
          if (enteredCrouch) this.foxArt.play('muscle-crouch');
          else if (!this.foxArt.anims.isPlaying) this.foxArt.setTexture('muscle-crouch', 2);
        } else { this.foxArt.anims.stop(); this.foxArt.setTexture('crouch'); }
      } else if (!powered && time < this.throwUntil) this.foxArt.play('throw', true);
      else if (!grounded) {
        this.foxArt.anims.stop();
        this.foxArt.setTexture(powered ? 'muscle-jump' : 'jump', powered && time < this.jumpStartUntil ? 0 : this.fox.body.velocity.y < 0 ? 1 : 2);
      } else if (powered && time < this.landingUntil) {
        this.foxArt.anims.stop();
        this.foxArt.setTexture('muscle-jump', 3);
      } else {
        if (powered && leavingCrouch) this.foxArt.setTexture('muscle-crouch', 3);
        this.foxArt.play(`${powered ? 'muscle-' : ''}${direction ? (run ? 'run' : 'walk') : 'idle'}`, true);
      }
    }

  }
  class Room extends Street {
    constructor() { super('Room'); }

    preload() {
      super.preload();
      this.load.image('slipper', '/games/fox-adventure/sprites/slipper.png');
      this.load.image('room', '/games/fox-adventure/maps/room.png');
      for (const [name, count] of [['idle', 6], ['walk', 8], ['hit', 4], ['death', 8]]) {
        this.load.spritesheet(`solo-${name}`, `/games/fox-adventure/sprites/solo/${name}.png`, {
          frameWidth: 192, frameHeight: 176, endFrame: count - 1,
        });
      }
    }

    createLevel() {
      this.levelWidth = 960;
      const pavementY = 460;
      this.physics.world.setBounds(20, 0, 920, 540);
      this.cameras.main.setBounds(0, 0, 960, 540);
      const source = this.textures.get('room').getSourceImage();
      const scale = Math.max(960 / source.width, 540 / source.height);
      this.add.image(480, 540, 'room').setOrigin(0.5, 1).setDisplaySize(source.width * scale, source.height * scale);
      const platforms = this.physics.add.staticGroup();
      const pavement = this.add.rectangle(480, pavementY + 40, 960, 80).setVisible(false);
      this.physics.add.existing(pavement, true);
      platforms.add(pavement);
      this.roomFloor = pavement;
      return { pavement, platforms, pavementY, spawnX: 140 };
    }

    pickupLocations() { return []; }

    create() {
      this.roomCutscene = true;
      super.create();
      this.foxArt.play(this.power.phase === 'active' ? 'muscle-idle' : 'idle');
      for (const [key, count, fps] of [['solo-idle', 6, 6], ['solo-walk', 8, 8], ['solo-hit', 4, 10], ['solo-death', 8, 8]]) {
        if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, { start: 0, end: count - 1 }), frameRate: fps, repeat: key === 'solo-idle' || key === 'solo-walk' ? -1 : 0 });
      }
      this.solo = this.add.sprite(1030, 460, 'solo-idle').setOrigin(0.5, 168 / 176)
        .setScale(0.85).setFlipX(true).setDepth(3).play('solo-idle');
      this.setupCombat();
      this.dialogue = [
        { speaker: 'bell', text: 'Znowu jesteś pijany' },
        { speaker: 'fox', text: 'Kurwa przepraszam no...wiem, że zjebałem. Biorę to na klatę' },
        { speaker: 'bell', text: 'Weź to na klatę nierobie jeden....SOLO! Bierz go!' },
      ];
      this.time.delayedCall(900, () => this.showDialogue(0));
    }

    setupCombat() {
      this.soloHealth = SOLO_HEALTH;
      this.soloBody = this.add.zone(765, 405, 60, 110);
      this.physics.add.existing(this.soloBody, true);
      this.soloBody.body.enable = false;
      this.soloBar = this.add.container(765, 320).setDepth(8).setVisible(false);
      this.soloBarGraphics = this.add.graphics();
      this.soloBarLabel = this.add.text(0, -15, 'SOLO  100 / 100', {
        fontFamily: 'monospace', fontSize: '13px', color: '#fff0ce', stroke: '#15121c', strokeThickness: 3,
      }).setOrigin(0.5);
      this.soloBar.add([this.soloBarGraphics, this.soloBarLabel]);
      this.slippers = this.physics.add.group();
      this.slipperMarkers = new Set();
      this.physics.add.collider(this.roomFloor, this.slippers, (_floor, slipper) => slipper.destroy());
      this.physics.add.overlap(this.fox, this.slippers, (_fox, slipper) => {
        if (this.ending || !slipper.active) return;
        slipper.destroy();
        this.takeDamage(1);
      });
      this.physics.add.overlap(this.soloBody, this.bottles, (_solo, bottle) => {
        if (!bottle.active || this.soloHealth <= 0 || this.roomCutscene || this.ending) return;
        this.damageSolo(BOTTLE_DAMAGE);
        this.breakBottle(bottle);
      });
      const punchHit = ({ hitbox, damage }) => {
        if (this.roomCutscene || this.ending || this.soloHealth <= 0) return;
        const overlap = this.physics.add.overlap(hitbox, this.soloBody, () => {
          if (!hitbox.body?.enable || this.soloHealth <= 0 || this.ending) return;
          hitbox.body.enable = false;
          this.damageSolo(damage);
        });
        this.time.delayedCall(140, () => overlap.destroy());
      };
      this.events.on('player-attack', this.throwSlipper, this);
      this.events.on('player-punch', punchHit);
      this.events.once('shutdown', () => {
        this.events.off('player-attack', this.throwSlipper, this);
        this.events.off('player-punch', punchHit);
      });
    }

    drawSoloHealth() {
      const width = 110;
      this.soloBarGraphics.clear().fillStyle(0x14111c).fillRect(-58, -3, 116, 17);
      this.soloBarGraphics.fillStyle(0x552a38).fillRect(-55, 0, width, 10);
      const fill = Math.ceil(width * this.soloHealth / SOLO_HEALTH);
      if (fill) this.soloBarGraphics.fillStyle(0xe66b65).fillRect(-55, 0, fill, 10);
      this.soloBarGraphics.lineStyle(1, 0xf3cf9c).strokeRect(-58, -3, 116, 17);
      this.soloBarLabel.setText(`SOLO  ${this.soloHealth} / ${SOLO_HEALTH}`);
    }

    damageSolo(damage) {
      if (this.soloHealth <= 0 || this.roomCutscene || this.ending) return;
      this.soloHealth = remainingSoloHealth(this.soloHealth, damage);
      this.drawSoloHealth();
      if (this.soloHealth === 0) {
        this.soloBody.body.enable = false;
        this.slippers.clear(true, true);
        this.solo.clearTint().play('solo-death');
        this.solo.once('animationcomplete-solo-death', () => this.soloBar.setVisible(false));
      } else {
        this.solo.setTint(0xffb7a5).play('solo-hit');
        this.time.delayedCall(120, () => this.solo.clearTint());
        this.solo.once('animationcomplete-solo-hit', () => {
          if (this.soloHealth > 0) this.solo.play('solo-idle');
        });
      }
    }

    throwSlipper() {
      if (this.roomCutscene || this.ending || this.soloHealth <= 0) return;
      const target = { x: this.fox.body.center.x, y: this.fox.body.center.y };
      const marker = this.add.graphics().setDepth(4);
      marker.lineStyle(2, 0xffd178, 0.9).strokeEllipse(target.x, this.fox.y, 28, 8);
      this.slipperMarkers.add(marker);
      this.time.delayedCall(220, () => {
        marker.destroy();
        this.slipperMarkers.delete(marker);
        if (this.ending || this.soloHealth <= 0) return;
        const start = { x: this.bell.x - 8, y: this.bell.y - 32 };
        const { vx, vy } = slipperTrajectory(start, target);
        const slipper = this.slippers.create(start.x, start.y, 'slipper').setScale(0.85);
        slipper.body.setSize(48, 28).setOffset(8, 10);
        slipper.setGravityY(SLIPPER_GRAVITY - this.physics.world.gravity.y).setVelocity(vx, vy);
        slipper.setAngularVelocity(vx < 0 ? -400 : 400);
        this.time.delayedCall(2600, () => { if (slipper.active) slipper.destroy(); });
      });
    }

    playDeath() {
      this.slippers.clear(true, true);
      this.slipperMarkers.forEach(marker => marker.destroy());
      this.slipperMarkers.clear();
      super.playDeath();
    }

    showDialogue(index) {
      this.speech?.destroy();
      const line = this.dialogue[index];
      if (!line) { this.introduceSolo(); return; }
      const actor = line.speaker === 'fox' ? this.fox : this.bell;
      const width = line.speaker === 'fox' ? 540 : 450;
      const left = Phaser.Math.Clamp(line.speaker === 'fox' ? actor.x - 70 : actor.x - width + 40, 24, 936 - width);
      const text = this.add.text(16, 14, line.text, {
        fontFamily: 'monospace', fontSize: '18px', color: '#352830', lineSpacing: 6,
        wordWrap: { width: width - 32, useAdvancedWrap: true },
      });
      const height = Math.max(64, text.height + 28);
      const top = actor.y - 125 - height;
      const bubble = this.add.graphics();
      bubble.fillStyle(0xfff2d6).fillRoundedRect(0, 0, width, height, 8);
      bubble.lineStyle(3, 0x352830).strokeRoundedRect(0, 0, width, height, 8);
      const tail = Phaser.Math.Clamp(actor.x - left, 24, width - 24);
      bubble.fillStyle(0xfff2d6).fillTriangle(tail - 10, height - 2, tail + 10, height - 2, tail, height + 20);
      this.speech = this.add.container(left, top, [bubble, text]).setDepth(30);
      text.setText('');
      const letters = Array.from(line.text);
      let count = 0;
      this.time.addEvent({ delay: 35, repeat: letters.length - 1, callback: () => {
        count++;
        text.setText(letters.slice(0, count).join(''));
        if (count === letters.length) this.time.delayedCall(index === 0 ? 1600 : 2300, () => this.showDialogue(index + 1));
      } });
    }

    introduceSolo() {
      this.bellHover.stop();
      this.tweens.add({ targets: this.bell, x: 720, y: 140, duration: 1200, ease: 'Sine.InOut', onComplete: () => {
        this.tweens.add({ targets: this.bell, x: 240, duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        this.tweens.add({ targets: this.bell, y: 132, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        this.solo.play('solo-walk');
        this.tweens.add({ targets: this.solo, x: 765, duration: 1800, ease: 'Linear', onComplete: () => {
          this.solo.play('solo-idle');
          this.roomCutscene = false;
          this.soloBody.body.enable = true;
          this.soloBar.setVisible(true);
          this.drawSoloHealth();
          Object.values(this.keys).forEach(key => key.reset());
          this.wasJump = false;
        } });
      } });
    }

    update(time) {
      if (this.roomCutscene) {
        if (this.power.expire(time)) this.endPowerup();
        this.updatePowerHud(time);
        this.fox.setVelocityX(0);
        return;
      }
      super.update(time);
    }
  }
  return new Phaser.Game({type:Phaser.AUTO,parent,width:960,height:540,pixelArt:true,backgroundColor:'#000000',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},physics:{default:'arcade',arcade:{gravity:{y:1100}}},scene:[Intro, Street, Room]});
}
