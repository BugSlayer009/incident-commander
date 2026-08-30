export function startSpeechRecognition(speakerName, speakerRole, onTranscript) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.error("Speech recognition not supported in this browser (use Chrome)");
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onresult = (event) => {
    const last = event.results.length - 1;
    const text = event.results[last][0].transcript;
    onTranscript(text, speakerName, speakerRole);
  };

  recognition.onerror = (e) => console.error("Speech recognition error:", e.error);
  recognition.onend = () => recognition.start(); // auto-restart to keep listening

  recognition.start();
  return recognition;
}

export function stopSpeechRecognition(recognition) {
  if (recognition) {
    recognition.onend = null;
    recognition.stop();
  }
}