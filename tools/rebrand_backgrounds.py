# bg_minihompy / bg_error 원본의 실제 상표 글자(싸이월드, Windows, IE)를 방구월드 · Fartdow 로 덮어쓴다.
# 사용: python3 tools/rebrand_backgrounds.py (원본 skin2/assets/skin/bg, Noto Sans KR kr400.ttf 가 현재 폴더에 있어야 함)
from PIL import Image, ImageDraw, ImageFont
S='skin2/assets/skin/bg/'; O='rebrand/'
kr=lambda s,w=400: ImageFont.truetype(f'kr{w}.ttf', s)
def put(d, box, bg, xy, text, font, fill, anchor='lm'):
    d.rectangle(box, fill=bg); d.text(xy, text, font=font, fill=fill, anchor=anchor)

im=Image.open(S+'bg_minihompy.png').convert('RGBA'); d=ImageDraw.Draw(im)
put(d,(8,0,960,40),(0,85,225),(16,21),'방구월드 - 사이좋은 방구들, 방구월드 - Microfart Internet Exploder',kr(19),(255,255,255))
put(d,(100,96,985,121),(255,255,255),(105,108),'http://minihp.bbungworld.com/pims/main/pims_main.asp?tid=20048600',kr(17),(20,20,20))
put(d,(156,2287,455,2318),(30,75,185),(170,2305),'방구월드 - 사이좋은 방구...',kr(18),(255,255,255))
put(d,(511,478,554,504),(245,247,250),(514,491),'방구',kr(22),(35,80,155))
im.save(O+'bg_minihompy.png')

im=Image.open(S+'bg_error.png').convert('RGBA'); d=ImageDraw.Draw(im)
mono=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',23)
put(d,(425,95,656,136),(192,192,192),(540,114),'Fartdow',mono,(0,0,170),'mm')
im.save(O+'bg_error.png')
