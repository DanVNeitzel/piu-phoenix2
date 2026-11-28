"""Convert the selected complete Pump packs to PIUWeb atlases and preview them."""
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/img/pump'
DIRECTIONS = ('DownLeft', 'UpLeft', 'Center', 'UpRight', 'DownRight')
MIRRORED = {'UpRight': 'UpLeft', 'DownRight': 'DownLeft'}
PACKS = {
    'PUMP-PRIME2-ALT': ('prime_2', 'PRIME 2 ALT', False),
    'PUMP-HNS1': ('hns_1', 'HNS 1', True),
    'PUMP-PSP5': ('psp_5', 'PSP 5', True),
    'PUMP-XX': ('z2xx', 'XX', True),
    'PUMP-XX-MOBILE': ('z2xxmobile', 'XX MOBILE', False),
    'PUMP-JUMP': ('jump', 'JUMP', False),
    'PUMP-JONATHAN': ('jonathan', 'JONATHAN', False),
}


def find(folder, prefix, optional=False):
    matches = [path for path in folder.iterdir()
               if path.suffix.lower() == '.png' and path.name.lower().startswith(prefix.lower())]
    if optional and not matches:
        return None
    if len(matches) != 1:
        raise ValueError(f'{folder.name}: expected one {prefix}, found {matches}')
    return matches[0]


def frames(path, grid=None):
    with Image.open(path) as source:
        image = source.convert('RGBA')
    match = re.search(r'(\d+)x(\d+)\.png$', path.name, re.I)
    columns, rows = grid or (tuple(map(int, match.groups())) if match else (1, 1))
    width, height = image.width // columns, image.height // rows
    if not width or not height or image.width % columns or image.height % rows:
        raise ValueError(f'{path}: image size does not fit {columns}x{rows}')
    return [image.crop((x * width, y * height, (x + 1) * width, (y + 1) * height))
            for y in range(rows) for x in range(columns)]


def sample(images, count):
    if len(images) == 1:
        return images * count
    return [images[round(i * (len(images) - 1) / (count - 1))] for i in range(count)]


def atlas(images, columns, rows):
    width, height = images[0].size
    result = Image.new('RGBA', (width * columns, height * rows))
    for i, image in enumerate(images):
        result.paste(image, (i % columns * width, i // columns * height))
    return result


def square(image):
    if image.height == image.width:
        return image
    return image.resize((image.width, image.width), Image.Resampling.BILINEAR)


def body_square(frame):
    if frame.height > 2:
        return square(frame)
    result = Image.new('RGBA', (frame.width, frame.width))
    for y in range(0, frame.width, frame.height):
        result.paste(frame, (0, y))
    return result


def convert(name, mirror):
    source = SOURCE / name
    textures = {}
    for direction in DIRECTIONS:
        tap_direction = MIRRORED.get(direction, direction) if mirror else direction
        taps = frames(find(source, f'{tap_direction} Tap Note'))
        if tap_direction != direction:
            taps = [ImageOps.mirror(tap) for tap in taps]
        textures[f'{direction} TapNote 3x2.PNG'] = atlas(sample(taps, 6), 3, 2)
        bodies = frames(find(source, f'{direction} Hold Body Active'))
        caps = frames(find(source, f'{direction} Hold BottomCap Active'))
        textures[f'{direction} Hold 6x1.PNG'] = atlas([body_square(f) for f in sample(bodies, 6)], 6, 1)
        textures[f'{direction} HoldCap 6x1.PNG'] = atlas([square(f) for f in sample(caps, 6)], 6, 1)

    # Jonathan inherits its receptors and tap feedback from default in metrics.ini.
    base_source = SOURCE / 'default' if name == 'jonathan' else source
    textures['Center Receptor 1x2.PNG'] = atlas(frames(find(base_source, 'BASE 1x2'), (1, 2)), 1, 2)
    glow_grid = (5, 1) if name == 'jump' else (5, 2)
    glow = frames(find(base_source, 'GLOW 5x'), glow_grid)
    textures['Tap 5x2.PNG'] = atlas(glow * (2 if name == 'jump' else 1), 5, 2)
    # PIUWeb uses one common explosion across all lanes for these skins.
    effect = {'jump': '_Center Explosion', 'z2xxmobile': '_note_yellow',
              'jonathan': '_Tap Explosion Bright'}.get(name, '_explosion')
    textures['StepFX 6x1.PNG'] = atlas(sample(frames(find(source, effect)), 6), 6, 1)
    return textures


def main():
    preview = Image.new('RGB', (540, 64 + len(PACKS) * 77), '#121823')
    draw = ImageDraw.Draw(preview)
    title = ImageFont.load_default(size=20)
    label = ImageFont.load_default(size=14)
    draw.text((16, 17), 'PIUWeb · Novas noteskins', font=title, fill='white')
    for row, (skin, (name, display, mirror)) in enumerate(PACKS.items()):
        textures = convert(name, mirror)
        target = ROOT / 'piured-engine/noteskins' / skin / 'UHD'
        target.mkdir(parents=True, exist_ok=True)
        for filename, image in textures.items():
            image.save(target / filename, optimize=True)

        logo = find(SOURCE / name, 'NOTE_LOGO', optional=True)
        art = frames(logo)[0] if logo else frames(target / 'UpRight TapNote 3x2.PNG')[0]
        art.thumbnail((96, 96), Image.Resampling.LANCZOS)
        art.save(ROOT / 'assets/img/CW_settings/noteskin_cover' / f'{skin}.png')

        y = 52 + row * 77
        draw.rectangle((10, y, 529, y + 71), fill='#212b3a')
        draw.text((20, y + 26), display, font=label, fill='white')
        for column, direction in enumerate(DIRECTIONS):
            image = frames(target / f'{direction} TapNote 3x2.PNG')[0]
            image.thumbnail((58, 58), Image.Resampling.LANCZOS)
            preview.paste(image, (164 + column * 72, y + 7), image)
    output = ROOT / 'output'
    output.mkdir(exist_ok=True)
    preview.save(output / 'previa-noteskins-pump-0.8.82.png')


if __name__ == '__main__':
    main()
