import torch
from transformers import AutoProcessor, AutoModelForImageTextToText
from PIL import Image
import requests
from io import BytesIO
import time

print("Testing SmolVLM-256M (much smaller)...")

try:
    # Use the tiny 256M model instead
    model_path = "HuggingFaceTB/SmolVLM-256M-Instruct"
    processor = AutoProcessor.from_pretrained(model_path, trust_remote_code=True)
    model = AutoModelForImageTextToText.from_pretrained(
        model_path,
        torch_dtype=torch.float32,
        trust_remote_code=True,
        low_cpu_mem_usage=True
    ).to('cpu')
    
    print("Tiny model loaded!")
    
    # Load test image
    url = "https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/bee.jpg"
    response = requests.get(url)
    image = Image.open(BytesIO(response.content)).convert('RGB')
    
    text = "<image>What do you see?"
    
    start_time = time.time()
    
    inputs = processor(
        images=image,
        text=text,
        return_tensors="pt"
    )
    
    print("Processing...")
    
    with torch.no_grad():
        generated_ids = model.generate(
            **inputs,
            max_new_tokens=20,
            do_sample=False,
            pad_token_id=processor.tokenizer.eos_token_id
        )
    
    end_time = time.time()
    print(f"Completed in {end_time - start_time:.2f} seconds")
    
    response_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    print(f"Response: {response_text}")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()