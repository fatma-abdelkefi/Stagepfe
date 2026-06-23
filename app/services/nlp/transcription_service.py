import os
import tempfile
from functools import lru_cache
from typing import Any, Dict


MAXIMO_WORKLOG_DESCRIPTION_MAX = 100


def _normalize_transcript(text: str) -> str:
    text = " ".join(str(text or "").strip().split())

    replacements = {
        "Controle": "Contrôle",
        "controle": "contrôle",
        "à normal": "anormal",
        "a normal": "anormal",
        "bruit à normal": "bruit anormal",
        "bruit a normal": "bruit anormal",
        "effectuée": "effectué",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    return text.strip()


def _truncate_maximo_description(text: str) -> str:
    text = _normalize_transcript(text)

    if len(text) <= MAXIMO_WORKLOG_DESCRIPTION_MAX:
        return text

    return text[:MAXIMO_WORKLOG_DESCRIPTION_MAX].strip()


def _build_summary(text: str) -> str:
    text = _normalize_transcript(text)

    if not text:
        return ""

    first_sentence = text

    for sep in [".", "!", "?"]:
        if sep in text:
            first_sentence = text.split(sep)[0].strip()
            break

    if len(first_sentence) >= 10:
        return _truncate_maximo_description(first_sentence)

    return _truncate_maximo_description(text)


@lru_cache(maxsize=1)
def _get_whisper_model():
    try:
        from faster_whisper import WhisperModel
    except Exception as exc:
        raise RuntimeError(
            "Le module faster_whisper n'est pas installé. "
            "Exécute : pip install faster-whisper. "
            f"Détail : {exc}"
        )

    model_size = os.getenv("WHISPER_MODEL_SIZE", "base")
    device = os.getenv("WHISPER_DEVICE", "cpu")
    compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

    return WhisperModel(
        model_size,
        device=device,
        compute_type=compute_type,
    )


def _transcribe_audio_file(audio_path: str) -> str:
    model = _get_whisper_model()

    segments, _info = model.transcribe(
        audio_path,
        language="fr",
        task="transcribe",
        beam_size=5,
        best_of=5,
        temperature=0,
        vad_filter=True,
        vad_parameters={
            "min_silence_duration_ms": 500,
        },
        initial_prompt=(
            "Contexte de maintenance industrielle et GMAO IBM Maximo. "
            "Le technicien dicte un journal de travail. "
            "Mots possibles : ordre de travail, work log, intervention, "
            "maintenance, pompe, moteur, roulement, vibration, fuite, "
            "câble, équipement, contrôle, redémarrage, inspection, "
            "remplacement, réparation, test, fonctionnement normal."
        ),
    )

    transcript = " ".join(
        str(segment.text or "").strip()
        for segment in segments
        if str(segment.text or "").strip()
    )

    return _normalize_transcript(transcript)


async def transcribe_audio_bytes(
    content: bytes,
    filename: str = "audio.m4a",
    content_type: str = "audio/mp4",
) -> Dict[str, Any]:
    if not content:
        raise ValueError("Fichier audio vide ou illisible.")

    suffix = os.path.splitext(filename or "")[1] or ".m4a"
    tmp_path = ""

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        transcript = _transcribe_audio_file(tmp_path)

        if not transcript:
            return {
                "success": False,
                "transcript": "",
                "raw_transcript": "",
                "corrected_transcript": "",
                "cleaned_text": "",
                "payload": {
                    "description": "",
                    "description_longdescription": {
                        "ldtext": "",
                    },
                },
                "message": "Aucune parole détectée dans l'audio.",
                "source": "local_nlp_integrated",
            }

        summary = _build_summary(transcript)

        return {
            "success": True,

            "transcript": transcript,
            "raw_transcript": transcript,
            "corrected_transcript": transcript,
            "cleaned_text": transcript,

            "payload": {
                "description": summary,
                "description_longdescription": {
                    "ldtext": transcript,
                },
            },

            "filename": filename,
            "content_type": content_type,
            "source": "local_nlp_integrated",
        }

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass