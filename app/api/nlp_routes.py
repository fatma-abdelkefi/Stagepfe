from typing import Any, Dict

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.nlp.transcription_service import transcribe_audio_bytes

router = APIRouter(prefix="/nlp", tags=["NLP"])


def clean_text(text: str) -> str:
    return " ".join(str(text or "").split()).strip()


def build_summary(text: str, max_len: int = 120) -> str:
    text = clean_text(text)

    if not text:
        return ""

    first_sentence = text

    for sep in [".", "!", "?"]:
        if sep in text:
            first_sentence = text.split(sep)[0].strip()
            break

    if len(first_sentence) >= 10:
        return first_sentence[:max_len].strip()

    return text[:max_len].strip()


@router.post("/transcribe-audio")
async def transcribe_audio(file: UploadFile = File(...)) -> Dict[str, Any]:
    try:
        content = await file.read()

        if not content:
            raise HTTPException(
                status_code=400,
                detail="Fichier audio vide ou illisible.",
            )

        result = await transcribe_audio_bytes(
            content=content,
            filename=file.filename or "audio.m4a",
            content_type=file.content_type or "audio/mp4",
        )

        transcript = clean_text(
            result.get("transcript")
            or result.get("text")
            or result.get("transcription")
            or ""
        )

        if not transcript:
            return {
                "success": False,
                "transcript": "",
                "payload": {
                    "description": "",
                    "description_longdescription": {
                        "ldtext": "",
                    },
                },
                "message": "Aucune parole détectée.",
                "raw": result,
            }

        summary = build_summary(transcript)

        return {
            "success": True,
            "transcript": transcript,
            "payload": {
                "description": summary,
                "description_longdescription": {
                    "ldtext": transcript,
                },
            },
            "raw": result,
        }

    except HTTPException:
        raise

    except RuntimeError as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur transcription audio intégrée : {str(exc)}",
        )