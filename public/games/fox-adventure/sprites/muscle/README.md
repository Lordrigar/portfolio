# Muscle fox

Transparent 192 × 176 frames extracted from the supplied muscle fox sheet.
Animations: idle (4), walk (8), run (8), jump (4), crouch (4), punch (6).
Each animation includes a horizontal strip and individual PNG frames.

Feet are aligned with the existing fox origin at (96, 165). Crouch frames
0–2 lower the character; frame 3 returns to standing. Punch motion effects
and run dust are preserved. The background, labels, and separators are removed.

Re-extract with `scripts/split-muscle-sprites.py` and the original 1536 × 1024
image (requires Pillow).
