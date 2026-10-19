import os
import numpy as np
from PIL import Image
import scipy.ndimage as ndi

def slice_mascots():
    img_path = r'C:\Users\ruahn49\.gemini\antigravity-ide\brain\fb2bf707-561b-4d6d-a11e-2073b1a8296c\mascot_spritesheet_1792393149657.jpg'
    img = Image.open(img_path).convert('RGBA')
    arr = np.array(img)
    rgb = arr[:, :, :3]
    lum = 0.299 * rgb[:,:,0] + 0.587 * rgb[:,:,1] + 0.114 * rgb[:,:,2]

    # Outline
    dark = lum < 115
    closed = ndi.binary_closing(dark, structure=np.ones((9, 9)))
    filled = ndi.binary_fill_holes(closed)

    # In case accessories like zzz or fart clouds or hearts are separate small components,
    # let's dilate moderately so accessories merge with their parent character
    dilated = ndi.binary_dilation(filled, structure=np.ones((25, 25)))
    labeled, num_features = ndi.label(dilated)

    # Filter components by area > 10000
    components = []
    for label in range(1, num_features + 1):
        mask = (labeled == label)
        area = mask.sum()
        if area > 10000:
            y_ind, x_ind = np.where(mask)
            cy, cx = y_ind.mean(), x_ind.mean()
            ymin, ymax = y_ind.min(), y_ind.max()
            xmin, xmax = x_ind.min(), x_ind.max()
            components.append({
                'label': label,
                'area': area,
                'cx': cx,
                'cy': cy,
                'bbox': (xmin, ymin, xmax, ymax)
            })

    print(f'Found {len(components)} mascot components')
    components.sort(key=lambda c: c['cy'])
    rows = [components[0:3], components[3:6], components[6:9]]

    names = [
        ['hamster_walk', 'hamster_jump', 'hamster_sleep'],
        ['tit_hop', 'tit_fly', 'tit_sing'],
        ['cat_walk', 'cat_play', 'cat_sit']
    ]

    for r_idx in range(3):
        row = rows[r_idx]
        row.sort(key=lambda c: c['cx'])
        for c_idx in range(3):
            item_name = names[r_idx][c_idx]
            comp = row[c_idx]
            xmin, ymin, xmax, ymax = comp['bbox']
            
            # Crop region with padding
            pad = 8
            y0 = max(0, ymin - pad)
            y1 = min(img.height, ymax + pad)
            x0 = max(0, xmin - pad)
            x1 = min(img.width, xmax + pad)

            sub_arr = arr[y0:y1, x0:x1].copy()
            sub_lum = lum[y0:y1, x0:x1]

            # In this cropped sub-region, extract transparent sprite
            # Background paper has lum > 240
            # Foreground sticker + character has lum < 240
            # We want to remove the paper background outside the sticker/crayon line!
            # Let's flood fill from edges of the sub_arr to find outer paper:
            from collections import deque
            h, w, _ = sub_arr.shape
            visited = np.zeros((h, w), dtype=bool)
            q = deque()
            for x in range(w):
                q.append((0, x))
                q.append((h - 1, x))
                visited[0, x] = True
                visited[h - 1, x] = True
            for y in range(h):
                q.append((y, 0))
                q.append((y, w - 1))
                visited[y, 0] = True
                visited[y, w - 1] = True

            # Any pixel close to the corner paper color (lum > 230 and no dark crayon line)
            # Actually, the background is plain paper (around 240-255).
            # The sticker outline or black crayon outline surrounds the character.
            # To get a clean doodle sprite (removing outer paper AND white sticker margin):
            # A pixel is background if it's connected to border and (lum > 220) OR if outside the character's closed contour!
            sub_dark = sub_lum < 115
            sub_closed = ndi.binary_closing(sub_dark, structure=np.ones((11, 11)))
            sub_filled = ndi.binary_fill_holes(sub_closed)
            sub_char_mask = ndi.binary_dilation(sub_filled, structure=np.ones((5, 5)))
            
            # Also include accessories (colored hearts, pink fart, zzz, notes)
            # Anything with color saturation or not pure paper white
            r = sub_arr[:, :, 0].astype(float)
            g = sub_arr[:, :, 1].astype(float)
            b = sub_arr[:, :, 2].astype(float)
            max_c = np.maximum(np.maximum(r, g), b)
            min_c = np.minimum(np.minimum(r, g), b)
            sat = np.where(max_c > 0, (max_c - min_c) / max_c, 0)
            has_color = (sat > 0.12) | (sub_lum < 180)
            
            # Combine char mask with colored accessories
            combined_mask = sub_char_mask | has_color
            combined_mask = ndi.binary_closing(combined_mask, structure=np.ones((7, 7)))
            combined_mask = ndi.binary_fill_holes(combined_mask)
            
            # Smooth edges with distance transform
            dist = ndi.distance_transform_edt(combined_mask)
            alpha = np.clip(dist * 255 / 2.0, 0, 255).astype(np.uint8)
            sub_arr[:, :, 3] = alpha

            out = Image.fromarray(sub_arr, 'RGBA')
            # Crop transparent margins
            bbox = out.getbbox()
            if bbox:
                out = out.crop(bbox)

def slice_props():
    img_path = r'C:\Users\ruahn49\.gemini\antigravity-ide\brain\fb2bf707-561b-4d6d-a11e-2073b1a8296c\decor_props_sheet_1792393179156.jpg'
    img = Image.open(img_path).convert('RGBA')
    arr = np.array(img)
    rgb = arr[:, :, :3]
    lum = 0.299 * rgb[:,:,0] + 0.587 * rgb[:,:,1] + 0.114 * rgb[:,:,2]

    # Outline or colored items
    # In props, some items like sun rays or stars have yellow strokes
    r = rgb[:, :, 0].astype(float)
    g = rgb[:, :, 1].astype(float)
    b = rgb[:, :, 2].astype(float)
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    sat = np.where(max_c > 0, (max_c - min_c) / max_c, 0)

    # Any non-white pixel (paper is lum > 250 and sat < 0.05)
    is_fg = (lum < 242) | (sat > 0.08)
    closed = ndi.binary_closing(is_fg, structure=np.ones((9, 9)))
    filled = ndi.binary_fill_holes(closed)

    # Dilate to merge small parts of the same item (e.g. sun rays, stars, balloon string)
    dilated = ndi.binary_dilation(filled, structure=np.ones((25, 25)))
    labeled, num_features = ndi.label(dilated)

    # Filter components by area > 4000
    components = []
    for label in range(1, num_features + 1):
        mask = (labeled == label)
        area = mask.sum()
        if area > 4000:
            y_ind, x_ind = np.where(mask)
            cy, cx = y_ind.mean(), x_ind.mean()
            ymin, ymax = y_ind.min(), y_ind.max()
            xmin, xmax = x_ind.min(), x_ind.max()
            components.append({
                'label': label,
                'area': area,
                'cx': cx,
                'cy': cy,
                'bbox': (xmin, ymin, xmax, ymax)
            })

    print(f'Found {len(components)} prop components')
    components.sort(key=lambda c: c['cy'])
    
    # 3 rows of 4 items
    rows = [components[0:4], components[4:8], components[8:12]]

    prop_names = [
        ['moon', 'sun', 'cloud', 'stars'],
        ['tent', 'box', 'sunflower', 'carrot'],
        ['balloon', 'campfire', 'bench', 'churu']
    ]

    for r_idx in range(3):
        row = rows[r_idx]
        row.sort(key=lambda c: c['cx'])
        for c_idx in range(4):
            item_name = prop_names[r_idx][c_idx]
            comp = row[c_idx]
            xmin, ymin, xmax, ymax = comp['bbox']

            pad = 6
            y0 = max(0, ymin - pad)
            y1 = min(img.height, ymax + pad)
            x0 = max(0, xmin - pad)
            x1 = min(img.width, xmax + pad)

            sub_arr = arr[y0:y1, x0:x1].copy()
            sub_lum = lum[y0:y1, x0:x1]
            sub_sat = sat[y0:y1, x0:x1]

            # Foreground mask in this sub-region
            sub_fg = (sub_lum < 244) | (sub_sat > 0.06)
            sub_closed = ndi.binary_closing(sub_fg, structure=np.ones((7, 7)))
            sub_filled = ndi.binary_fill_holes(sub_closed)
            sub_mask = ndi.binary_dilation(sub_filled, structure=np.ones((3, 3)))

            # Remove any tiny disjoint components coming from neighboring items
            sub_labeled, sub_num = ndi.label(sub_mask)
            if sub_num > 1:
                # Find the main component(s) near the center
                ch, cw = sub_mask.shape
                center_y, center_x = ch / 2, cw / 2
                valid_mask = np.zeros_like(sub_mask)
                for l in range(1, sub_num + 1):
                    comp_m = (sub_labeled == l)
                    if comp_m.sum() < 80: # tiny speck
                        continue
                    # Check distance of component center to crop center
                    cy_m, cx_m = np.where(comp_m)[0].mean(), np.where(comp_m)[1].mean()
                    dist_to_center = np.hypot(cy_m - center_y, cx_m - center_x)
                    if dist_to_center < max(cw, ch) * 0.45 or comp_m.sum() > 400:
                        valid_mask |= comp_m
                sub_mask = valid_mask

            dist = ndi.distance_transform_edt(sub_mask)
            alpha = np.clip(dist * 255 / 1.8, 0, 255).astype(np.uint8)
            sub_arr[:, :, 3] = alpha

            out = Image.fromarray(sub_arr, 'RGBA')
            bbox = out.getbbox()
            if bbox:
                out = out.crop(bbox)

            out_path = f'assets/props/{item_name}.png'
            out.save(out_path, 'PNG')
            print(f'Saved {out_path}: {out.size}')

slice_props()

