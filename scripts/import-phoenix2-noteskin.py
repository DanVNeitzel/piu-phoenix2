"""Import PHOENIX 2 and derive seamless hold bodies from each original cap edge."""
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
        shutil.copyfile(source(direction + ' Hold BottomCap Active '), target / f'{direction} HoldCap 6x1.PNG')
        body = Image.open(source(direction + ' Hold Body Active ')).convert('RGBA')
        cap = Image.open(source(direction + ' Hold BottomCap Active ')).convert('RGBA')
        if cap.size != (body.width * 6, body.width):
            raise ValueError(f'Unexpected hold atlas dimensions for {direction}: {cap.size}')
        atlas = Image.new('RGBA', (body.width * 6, body.width))
        for x in range(6):
            # Match every RGBA pixel at the join, including white borders and
            # internal stripes; aligning only the outer bounds leaves a color seam.
            edge = cap.crop((x * body.width, 0, (x + 1) * body.width, 1))
            for y in range(body.width):
                atlas.paste(edge, (x * body.width, y))
        atlas.save(target / f'{direction} Hold 6x1.PNG')

    shutil.copyfile(source('BASE 1x2'), target / 'Center Receptor 1x2.PNG')
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
        'notes': 'Updated user-supplied package, including its own central hold cap. Original PNG bytes preserved for taps, all five caps, receptors, glow, explosion and logo. Each body frame repeats the top RGBA row of its matching cap, aligning borders and internal stripes exactly at the join.',
        'tap_frames': 6, 'tap_cycle_seconds': 0.25,
        'explosion_frames': 6, 'explosion_frame_seconds': 0.06,
    }
    (target.parent / 'SOURCE.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
    print(f'Imported PHOENIX2: {len(list(target.glob("*.PNG")))} atlases.')


if __name__ == '__main__':
    main()
