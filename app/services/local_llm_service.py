from app.core.config import LOCAL_LLM_MODEL, LLM_MAX_NEW_TOKENS

_tokenizer = None
_model = None
_torch = None
_device = None

def load_local_llm():
    global _tokenizer, _model, _torch, _device

    if _tokenizer is None or _model is None:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        _torch = torch
        _device = "cuda" if torch.cuda.is_available() else "cpu"

        _tokenizer = AutoTokenizer.from_pretrained(
            LOCAL_LLM_MODEL,
            trust_remote_code=True,
        )

        if _tokenizer.pad_token_id is None:
            _tokenizer.pad_token = _tokenizer.eos_token

        dtype = torch.float16 if _device == "cuda" else torch.float32

        _model = AutoModelForCausalLM.from_pretrained(
            LOCAL_LLM_MODEL,
            torch_dtype=dtype,
            trust_remote_code=True,
            low_cpu_mem_usage=True,
            attn_implementation="eager",
        )

        _model.to(_device)
        _model.eval()

    return _tokenizer, _model


def ask_local_llm(prompt: str) -> str:
    tokenizer, model = load_local_llm()

    messages = [
        {
            "role": "system",
            "content": (
                "Tu réponds uniquement avec du JSON valide. "
                "Pas de markdown. Pas d'explication hors JSON."
            ),
        },
        {
            "role": "user",
            "content": prompt,
        },
    ]

    try:
        formatted_prompt = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )
    except Exception:
        formatted_prompt = prompt

    inputs = tokenizer(
        formatted_prompt,
        return_tensors="pt",
        truncation=True,
        max_length=3072,
    )

    inputs = {key: value.to(_device) for key, value in inputs.items()}

    with _torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=LLM_MAX_NEW_TOKENS,
            do_sample=False,
            temperature=None,
            top_p=None,
            repetition_penalty=1.05,
            no_repeat_ngram_size=3,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    generated_tokens = output[0][inputs["input_ids"].shape[-1]:]
    text = tokenizer.decode(generated_tokens, skip_special_tokens=True)

    return text.strip()