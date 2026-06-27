// Owl's Academy — Text-to-Speech (Web Speech API)
// Usage: OWL.TTS.speak('hello world', 'en-GB')
//        OWL.TTS.btn('hello world', 'en-GB') → returns <button> that toggles play/stop

window.OWL = window.OWL || {};

OWL.TTS = (() => {
  const supported = 'speechSynthesis' in window;
  let activeBtn = null;

  function resetBtn(b) {
    if (!b) return;
    b.textContent = '🔊';
    b.classList.remove('tts-playing');
  }

  function stop() {
    if (!supported) return;
    window.speechSynthesis.cancel();
    resetBtn(activeBtn);
    activeBtn = null;
  }

  function speak(text, lang = 'en-GB', triggerBtn = null) {
    if (!supported || !text) return;
    // Toggle off if same btn clicked while speaking
    if (triggerBtn && triggerBtn === activeBtn && window.speechSynthesis.speaking) {
      stop();
      return;
    }
    stop();
    const utter = new SpeechSynthesisUtterance(text.trim());
    utter.lang = lang;
    utter.rate = 0.9;
    if (triggerBtn) {
      triggerBtn.textContent = '■';
      triggerBtn.classList.add('tts-playing');
      activeBtn = triggerBtn;
    }
    utter.onend = () => { if (activeBtn === triggerBtn) { resetBtn(triggerBtn); activeBtn = null; } };
    utter.onerror = () => { if (activeBtn === triggerBtn) { resetBtn(triggerBtn); activeBtn = null; } };
    window.speechSynthesis.speak(utter);
  }

  function btn(text, lang = 'en-GB', label = '🔊') {
    if (!supported) return null;
    const b = document.createElement('button');
    b.className = 'tts-btn';
    b.title = 'Posłuchaj / zatrzymaj';
    b.textContent = label;
    b.addEventListener('click', e => { e.stopPropagation(); speak(text, lang, b); });
    return b;
  }

  return { speak, stop, btn, supported };
})();
