import os
from PIL import Image, ImageFilter

def make_transparent(input_path, output_path, flood_tolerance=35):
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    
    # Let's find the corner color (background)
    corner_color = img.getpixel((0, 0))
    
    # We want to remove the background outside the sticker/character.
    # Since the character has a bold black contour, let's examine the pixels.
    # A flood-fill from the 4 corners:
    from collections import deque
    
    visited = set()
    queue = deque([(0, 0), (w-1, 0), (0, h-1), (w-1, h-1)])
    
    # Anything close to the outer paper color or white sticker edge before hitting black contour
    # Actually, the background is plain paper (around 230-255).
    # Inside the character, the body is white, but it's enclosed by a thick black outline!
    # If we flood fill from the corners and only stop at the dark crayon outline (luminance < 100),
    # we will cleanly remove all outer paper AND the white sticker border!
    
    for pt in list(queue):
        visited.add(pt)
        
    pixels = img.load()
    
    while queue:
        x, y = queue.popleft()
        r, g, b, a = pixels[x, y]
        
        # Check luminance
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        
        # If it's dark (the black crayon outline), we DO NOT cross it!
        # The crayon outline has luminance < 110.
        if lum < 100:
            continue
            
        # It's outer background/sticker border! Make transparent
        pixels[x, y] = (r, g, b, 0)
        
        # Neighbors
        for nx, ny in [(x+1, y), (x-1, y), (x, y+1), (x, y-1)]:
            if 0 <= nx < w and 0 <= ny < h:
                if (nx, ny) not in visited:
                    visited.add((nx, ny))
                    queue.append((nx, ny))
                    
    # Smooth edges slightly
    # Save as PNG
    img.save(output_path, "PNG")
    print(f"Extracted transparent sprite: {output_path}")

make_transparent("assets/hamster.jpg", "assets/hamster.png")
make_transparent("assets/tit.jpg", "assets/tit.png")
make_transparent("assets/cat.jpg", "assets/cat.png")
