import torch
from transformers import AutoProcessor, AutoModelForImageTextToText

print("Testing SmolVLM2 loading...")
print(f"PyTorch version: {torch.__version__}")
print(f"CPU threads: {torch.get_num_threads()}")

try:
    # Use the 500M model - better fit for t3.large
    model_path = "HuggingFaceTB/SmolVLM2-500M-Instruct"
    print(f"Loading model: {model_path}")
    
    processor = AutoProcessor.from_pretrained(model_path, trust_remote_code=True)
    print("✅ Processor loaded successfully")
    
    # CPU-optimized settings without device_map to avoid accelerate issues
    model = AutoModelForImageTextToText.from_pretrained(
        model_path,
        torch_dtype=torch.float32,  # Use float32 for CPU
        trust_remote_code=True,
        low_cpu_mem_usage=True      # Optimize memory usage
    )
    
    # Manually move to CPU if needed
    model = model.to('cpu')
    
    print("✅ Model loaded successfully")
    print(f"Model device: {next(model.parameters()).device}")
    print(f"Model dtype: {next(model.parameters()).dtype}")
    
    # Test basic functionality
    print("\n🧪 Testing basic inference...")
    from PIL import Image
    import requests
    from io import BytesIO
    
    # Load a test image
    url = "https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/bee.jpg"
    response = requests.get(url)
    image = Image.open(BytesIO(response.content)).convert('RGB')
    
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "What do you see in this image?"},
                {"type": "image", "image": image}
            ]
        }
    ]
    
    inputs = processor.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=True,
        return_dict=True,
        return_tensors="pt"
    )
    
    print("✅ Input processing successful")
    
    # Generate response (this will take a moment)
    print("🤔 Generating response... (this may take 30-60 seconds)")
    with torch.no_grad():
        generated_ids = model.generate(
            **inputs,
            do_sample=False,
            max_new_tokens=64,
            pad_token_id=processor.tokenizer.eos_token_id
        )
    
    response = processor.batch_decode(
        generated_ids,
        skip_special_tokens=True
    )[0]
    
    print("✅ Inference successful!")
    print(f"Response: {response}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("Note: Model will download on first run (~1-2GB)")
    import traceback
    print("\nFull error:")
    traceback.print_exc()