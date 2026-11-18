# Power-up animation

Eight transparent frames extracted from the supplied drinking animation.
Prepared for later use; not connected to gameplay.

- `drink-00.png` to `drink-07.png`: individual 320 × 320 frames.
- `drink.png`: eight-frame horizontal strip, 2560 × 320.
- `animations.json`: dimensions, suggested 8 fps, play-once settings, and origin.

Frames share a boot anchor at (160, 302). Artwork faces right. The purple
background, labels, and separator lines are removed; drinking bubbles remain.
The artwork is larger than the original fox sheets; use a scale around 0.28
when matching the current in-game character.

```js
this.load.spritesheet('powerup-drink', '/games/fox-adventure/sprites/powerup/drink.png', {
  frameWidth: 320, frameHeight: 320,
});
```

Re-extract with `scripts/split-powerup-sprites.py` and the original image
(requires Pillow).
