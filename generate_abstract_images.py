#!/usr/bin/env python3
"""
Generate 100 abstract black and white images programmatically.
These are placeholder images - you can replace them with real abstract art later.
"""

import os
import sys
import random
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

def generate_abstract_image(width=1200, height=800, seed=None):
    """
    Generate an abstract black and white image.
    """
    if seed:
        random.seed(seed)
    
    # Create a new image with white background
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)
    
    # Choose a random pattern style
    pattern_type = random.choice(['geometric', 'organic', 'minimalist', 'textured', 'flowing'])
    
    if pattern_type == 'geometric':
        # Geometric patterns
        num_shapes = random.randint(20, 50)
        for _ in range(num_shapes):
            shape = random.choice(['circle', 'rectangle', 'line'])
            x1 = random.randint(0, width)
            y1 = random.randint(0, height)
            
            if shape == 'circle':
                radius = random.randint(10, 100)
                # Ensure coordinates are within bounds and x2 >= x1, y2 >= y1
                x1 = max(radius, min(x1, width - radius))
                y1 = max(radius, min(y1, height - radius))
                x2 = x1 + radius
                y2 = y1 + radius
                draw.ellipse([x1, y1, x2, y2], fill='black' if random.random() > 0.5 else 'white', outline='black', width=2)
            elif shape == 'rectangle':
                x2 = random.randint(0, width)
                y2 = random.randint(0, height)
                # Ensure x2 >= x1 and y2 >= y1
                if x2 < x1:
                    x1, x2 = x2, x1
                if y2 < y1:
                    y1, y2 = y2, y1
                draw.rectangle([x1, y1, x2, y2], fill='black' if random.random() > 0.5 else None, outline='black', width=2)
            else:  # line
                x2 = random.randint(0, width)
                y2 = random.randint(0, height)
                draw.line([x1, y1, x2, y2], fill='black', width=random.randint(1, 5))
    
    elif pattern_type == 'organic':
        # Organic flowing patterns
        num_curves = random.randint(5, 15)
        for _ in range(num_curves):
            points = []
            start_x = random.randint(0, width)
            start_y = random.randint(0, height)
            for i in range(10):
                angle = random.uniform(0, 2 * math.pi)
                length = random.randint(20, 100)
                start_x = max(0, min(width, start_x + length * math.cos(angle)))
                start_y = max(0, min(height, start_y + length * math.sin(angle)))
                points.append((start_x, start_y))
            
            if len(points) > 1:
                draw.line(points, fill='black', width=random.randint(2, 8))
    
    elif pattern_type == 'minimalist':
        # Minimalist - few simple shapes
        num_elements = random.randint(3, 8)
        for _ in range(num_elements):
            x = random.randint(0, width)
            y = random.randint(0, height)
            size = random.randint(50, 200)
            
            if random.random() > 0.5:
                # Circle
                draw.ellipse([x-size//2, y-size//2, x+size//2, y+size//2], 
                           fill='black' if random.random() > 0.5 else None, 
                           outline='black', width=3)
            else:
                # Rectangle
                draw.rectangle([x-size//2, y-size//2, x+size//2, y+size//2], 
                              fill='black' if random.random() > 0.5 else None, 
                              outline='black', width=3)
    
    elif pattern_type == 'textured':
        # Textured patterns with noise
        for _ in range(1000):
            x = random.randint(0, width)
            y = random.randint(0, height)
            size = random.randint(1, 5)
            draw.ellipse([x-size, y-size, x+size, y+size], fill='black')
        
        # Add some larger shapes
        for _ in range(random.randint(5, 15)):
            x1 = random.randint(0, width)
            y1 = random.randint(0, height)
            x2 = random.randint(0, width)
            y2 = random.randint(0, height)
            # Ensure x2 >= x1 and y2 >= y1
            if x2 < x1:
                x1, x2 = x2, x1
            if y2 < y1:
                y1, y2 = y2, y1
            draw.rectangle([x1, y1, x2, y2], outline='black', width=2)
    
    else:  # flowing
        # Flowing wave-like patterns
        for wave in range(random.randint(3, 8)):
            points = []
            for x in range(0, width, 10):
                y = height // 2 + random.randint(-100, 100) * math.sin(x / 50 + wave)
                y = max(0, min(height, y))
                points.append((x, y))
            
            if len(points) > 1:
                draw.line(points, fill='black', width=random.randint(2, 6))
    
    # Apply some filters for variation
    if random.random() > 0.7:
        img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.5, 2)))
    
    return img

def generate_images(start_num=71, end_num=170):
    """
    Generate abstract B&W images and save them.
    """
    image_dir = Path("ui/public/images")
    image_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Generating {end_num - start_num + 1} abstract B&W images...")
    print(f"Saving to: {image_dir.absolute()}")
    print()
    
    generated = 0
    
    for image_num in range(start_num, end_num + 1):
        filepath = image_dir / f"abstract-{image_num}.jpg"
        
        # Skip if already exists
        if filepath.exists():
            print(f"  abstract-{image_num}.jpg already exists, skipping...")
            continue
        
        print(f"  Generating abstract-{image_num}.jpg...", end=" ", flush=True)
        
        try:
            # Use image number as seed for reproducibility
            img = generate_abstract_image(seed=image_num * 1000)
            img.save(filepath, 'JPEG', quality=85)
            print("✓")
            generated += 1
        except Exception as e:
            print(f"✗ Error: {e}")
        
        # Progress update every 10 images
        if (image_num - start_num + 1) % 10 == 0:
            print(f"  Progress: {image_num - start_num + 1}/{end_num - start_num + 1} images")
    
    print(f"\n✓ Successfully generated {generated} images!")
    print(f"  Images saved as: abstract-{start_num}.jpg through abstract-{end_num}.jpg")
    print()
    print("Note: These are programmatically generated placeholder images.")
    print("You can replace them with real abstract art images later if desired.")
    return generated > 0

def main():
    print("=" * 70)
    print("Abstract B&W Image Generator")
    print("=" * 70)
    print()
    
    success = generate_images(start_num=71, end_num=170)
    
    if success:
        print("\n" + "=" * 70)
        print("✓ Generation complete! Images are ready to use.")
        print("=" * 70)
    else:
        print("\n" + "=" * 70)
        print("⚠ No images were generated.")
        print("=" * 70)
        sys.exit(1)

if __name__ == "__main__":
    main()

