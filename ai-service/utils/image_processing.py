from PIL import Image

def preprocess_frame(image: Image.Image) -> Image.Image:
    """Basic image preprocessing for AI analysis"""
    # Resize if too large (to save bandwidth and processing time)
    max_size = 800
    if image.width > max_size or image.height > max_size:
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    return image
