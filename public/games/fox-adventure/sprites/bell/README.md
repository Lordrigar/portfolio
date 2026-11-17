# Bell sprite

Prepared from the supplied bell sheet without regenerating the artwork.

- `idle.png`: 6 frames, suggested 6 fps, looping.
- `attack.png`: 8 frames, suggested 12 fps, play once.
- `idle-00.png` through `idle-05.png`: individual idle frames.
- `attack-00.png` through `attack-07.png`: individual attack frames.
- `animations.json`: frame dimensions and suggested playback settings.

All frames are transparent, 320 × 288 pixels, with the bell body aligned at
x = 160. Keep the same origin across animations. Labels, panel borders,
background, and floor shadows have been removed; broom motion effects remain.
The character faces left in the source artwork; use `setFlipX(true)` to face right.

Phaser loading example:

```js
this.load.spritesheet('bell-idle', '/games/fox-adventure/sprites/bell/idle.png', {
  frameWidth: 320, frameHeight: 288,
});
this.load.spritesheet('bell-attack', '/games/fox-adventure/sprites/bell/attack.png', {
  frameWidth: 320, frameHeight: 288,
});
```

The assets are prepared only; the bell has not been added to gameplay.
Re-extract using `scripts/split-bell-sprites.py` and the original 1774 × 887 image
(requires Pillow).
