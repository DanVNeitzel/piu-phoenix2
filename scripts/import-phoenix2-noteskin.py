"""Import the supplied PHOENIX 2 directory, adapting atlas margins to the engine."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DIRECTIONS = ['DownLeft', 'UpLeft', 'Center', 'UpRight', 'DownRight']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    args = parser.parse_args()
    sources = list(args.directory.iterdir())

    def source(prefix):
        matches = [p for p in sources if p.name.startswith(prefix)]
        if len(matches) != 1:
            raise ValueError(f'Expected one source for {prefix}: {matches}')
        return matches[0]

    target = ROOT / 'piured-engine/noteskins/PHOENIX2/UHD'
    target.mkdir(parents=True, exist_ok=True)
    for direction in DIRECTIONS:
        shutil.copyfile(source(direction + ' Tap Note '), target / f'{direction} TapNote 3x2.PNG')
        if direction == 'Center':
            # The package omits this cap; the previously supplied central artwork matches.
            shutil.copyfile(ROOT / 'piured-engine/noteskins/PHOENIX/UHD/Center HoldCap 6x1.PNG',
                            target / 'Center HoldCap 6x1.PNG')
        else:
            cap = Image.open(source(direction + ' Hold BottomCap Active ')).convert('RGBA')
            side = cap.width // 6
            # Source cells are 362 x 724 with the arrow centered at y=344.
            # Remove the excess vertical canvas; keep the original pixels and six frames.
            top = 163
            cap.crop((0, top, cap.width, top + side)).save(target / f'{direction} HoldCap 6x1.PNG')
        body = Image.open(source(direction + ' Hold Body Active ')).convert('RGBA')
        if direction != 'Center':
            cap = Image.open(target / f'{direction} HoldCap 6x1.PNG')
            side = cap.width // 6
            connector = cap.getchannel('A').crop((0, 0, side, 1)).getbbox()
            strip = body.getchannel('A').getbbox()
            left, right = round(connector[0] * 96 / side), round(connector[2] * 96 / side)
            matched = Image.new('RGBA', (96, body.height))
            matched.paste(body.crop(strip).resize((right - left, body.height), Image.Resampling.LANCZOS), (left, 0))
            body = matched
        atlas = Image.new('RGBA', (body.width * 6, body.width))
        for x in range(6):
            for y in range(0, body.width, body.height):
                atlas.paste(body, (x * body.width, y))
        atlas.save(target / f'{direction} Hold 6x1.PNG')

    receptor = Image.open(source('BASE 1x2')).convert('RGBA')
    normalized = Image.new('RGBA', (480, 192))
    # The supplied sheet has horizontal outer margins and 305px lane spacing.
    # Isolate each lane, pad it to a square, then resize uniformly to preserve shape.
    for row in range(2):
        for lane in range(5):
            tile = Image.new('RGBA', (397, 397))
            left = 230 + lane * 305
            tile.paste(receptor.crop((left, row * 396, left + 305, row * 396 + 397)), (46, 0))
            # The engine uses 0.78 units between lanes on its five-unit receptor plane.
            x = round(192 + (lane - 2) * 0.78 * 96)
            normalized.alpha_composite(tile.resize((96, 96), Image.Resampling.LANCZOS), (x, row * 96))
    normalized.save(target / 'Center Receptor 1x2.PNG')
    for prefix, filename in [('GLOW 5x2', 'Tap 5x2.PNG'), ('_explosion ', 'StepFX 6x1.PNG')]:
        shutil.copyfile(source(prefix), target / filename)
    cover = ROOT / 'assets/img/CW_settings/noteskin_cover/PHOENIX2.png'
    shutil.copyfile(source('NOTE_LOGO.png'), cover)
    thumbnail = ROOT / 'assets/img/noteskin/PHOENIX2/thumbnail.gif'
    thumbnail.parent.mkdir(parents=True, exist_ok=True)
    Image.open(cover).save(thumbnail, format='GIF')
    metadata = {
        'source': 'User-supplied z3phoenix2 directory',
        'files': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sources if p.suffix.lower() == '.png'},
        'notes': 'Original taps, glow, explosion and logo. Body strips matched to cap connector widths and tiled; directional caps cropped vertically at y=163 to square frames; receptor lanes padded, uniformly resized and aligned to engine lane spacing. Central cap reused from previously supplied PHOENIX artwork (not included in this package).',
        'tap_frames': 6, 'tap_cycle_seconds': 0.25,
        'explosion_frames': 6, 'explosion_frame_seconds': 0.06,
    }
    (target.parent / 'SOURCE.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
    print(f'Imported PHOENIX2: {len(list(target.glob("*.PNG")))} atlases.')


if __name__ == '__main__':
    main()
