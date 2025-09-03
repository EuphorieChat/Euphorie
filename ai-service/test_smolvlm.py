import torch
from transformers import AutoProcessor, AutoModelForImageTextToText
from PIL import Image
import requests
from io import BytesIO

print("Testing SmolVLM2 with image token...")

try:
    model_path = "HuggingFaceTB/SmolVLM2-500M-Instruct"
    processor = AutoProcessor.from_pretrained(model_path, trust_remote_code=True)
    model = AutoModelForImageTextToText.from_pretrained(
        model_path,
        torch_dtype=torch.float32,
        trust_remote_code=True,
        low_cpu_mem_usage=True
    ).to('cpu')
    
    print("Model loaded successfully!")
    
    # Load test image
    url = "https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/bee.jpg"
    response = requests.get(url)
    image = Image.open(BytesIO(response.content)).convert('RGB')
    
    # Include image token in text - this is what SmolVLM expects
    text = "<image>What do you see in this image?"
    
    inputs = processor(
        images=image,
        text=text,
        return_tensors="pt"
    )
    
    print("Input processing successful!")
    print("Generating response... (may take 30-60 seconds)")
    
    with torch.no_grad():
        generated_ids = model.generate(
            **inputs,
            max_new_tokens=50,
            do_sample=False,
            pad_token_id=processor.tokenizer.eos_token_id
        )
    
    response_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    print(f"Raw response: {response_text}")
    
    # Extract just the generated part
    if text in response_text:
        clean_response = response_text.replace(text, "").strip()
        print(f"Clean response: {clean_response}")
    else:
        print(f"Generated text: {response_text}")
    
    print("✅ Test completed successfully!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()