# Solo

First big enemy sprite set, extracted from the supplied sheet.
Prepared assets only; Solo is not placed in the level yet.

| Animation | Frames | Suggested fps | Loop |
| --- | ---: | ---: | --- |
| idle | 6 | 6 | yes |
| walk | 8 | 8 | yes |
| run | 8 | 12 | yes |
| jump | 6 | 10 | no |
| crouch | 4 | 8 | no |
| punch (heavy) | 8 | 12 | no |
| hit | 4 | 10 | no |
| death | 8 | 8 | no |

Every animation has a horizontal PNG strip and individual numbered PNGs.
All 52 frames are transparent and 192 × 176, with a common foot anchor at
(96, 168). Suggested sprite origin: (0.5, 168 / 176). Solo faces right;
flip horizontally to face left. Punch effects, run dust, and death spirals
are preserved; labels, separators, and the purple background are removed.

The native character artwork is around 130 pixels tall. A display scale of
approximately 0.8 will make Solo larger than the current 0.55-scale fox.
`animations.json` contains frame dimensions and suggested playback settings.

```js
this.load.spritesheet('solo-idle', '/games/fox-adventure/sprites/solo/idle.png', {
  frameWidth: 192, frameHeight: 176,
});
```

Re-extract with `scripts/split-solo-sprites.py` and the original 1536 × 1024
image (requires Pillow).
