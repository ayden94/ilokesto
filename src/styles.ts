export const globalStyles = `
@keyframes ilokestoModalFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes ilokestoModalFadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
@keyframes ilokestoModalScaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes ilokestoModalScaleOut {
  from { transform: scale(1); opacity: 1; }
  to { transform: scale(0.95); opacity: 0; }
}
.ilokesto-modal-dialog::backdrop {
  background-color: rgba(0, 0, 0, 0.5);
  animation: ilokestoModalFadeIn 0.2s ease-out forwards;
}
.ilokesto-modal-dialog.ilokesto-modal-closing::backdrop {
  animation: ilokestoModalFadeOut 0.2s ease-out forwards;
}
@media (prefers-reduced-motion: reduce) {
  .ilokesto-modal-dialog::backdrop {
    animation-duration: 0s !important;
  }
}
`;
