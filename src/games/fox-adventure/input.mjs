// Install after Phaser's keyboard listener, so cancelling page scrolling does
// not hide the event from Phaser. Full game restarts destroy scenes directly.
export function installGameScrollGuard(sceneEvents, target = window) {
  const preventScroll = event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target?.isContentEditable || event.target?.closest?.('input, textarea, select, button, a')) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  };
  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    target.removeEventListener('keydown', preventScroll);
    sceneEvents.off('shutdown', remove);
    sceneEvents.off('destroy', remove);
  };
  target.addEventListener('keydown', preventScroll, { passive: false });
  sceneEvents.once('shutdown', remove);
  sceneEvents.once('destroy', remove);
  return remove;
}
