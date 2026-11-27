"""Adapt the user's z3phoenix archive to piured's atlas names (no art redrawing)."""
import argparse
import hashlib
import io
import json
from pathlib import Path
from zipfile import ZipFile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DIRECTIONS = ['DownLeft', 'UpLeft', 'Center', 'UpRight', 'DownRight']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    args = parser.parse_args()
    target = ROOT / 'piured-engine/noteskins/PHOENIX/UHD'
    target.mkdir(parents=True, exist_ok=True)
    with ZipFile(args.archive) as archive:
        names = {Path(name).name: name for name in archive.namelist()}

        def source(prefix):
            matches = [name for name in names if name.startswith(prefix)]
            if len(matches) != 1:
                raise ValueError(f'Expected one source for {prefix}: {matches}')
            return archive.read(names[matches[0]])

        for direction in DIRECTIONS:
            (target / f'{direction} TapNote 3x2.PNG').write_bytes(source(direction + ' Tap Note '))
            (target / f'{direction} HoldCap 6x1.PNG').write_bytes(source(direction + ' Hold BottomCap Active '))
            body = Image.open(io.BytesIO(source(direction + ' Hold Body Active '))).convert('RGBA')
            side = body.width
            atlas = Image.new('RGBA', (side * 6, side))
            # The source is a two-pixel horizontal strip; repeat its original pixels.
            for x in range(6):
                for y in range(0, side, body.height):
                    atlas.paste(body, (x * side, y))
            atlas.save(target / f'{direction} Hold 6x1.PNG')
        for prefix, filename in [('BASE 1x2', 'Center Receptor 1x2.PNG'),
                                 ('GLOW 5x2', 'Tap 5x2.PNG'),
                                 ('_explosion ', 'StepFX 6x1.PNG')]:
            (target / filename).write_bytes(source(prefix))
        cover = ROOT / 'assets/img/CW_settings/noteskin_cover/PHOENIX.png'
        cover.write_bytes(source('NOTE_LOGO.png'))
        thumbnail=ROOT / 'assets/img/noteskin/PHOENIX/thumbnail.gif'
        thumbnail.parent.mkdir(parents=True,exist_ok=True)
        Image.open(io.BytesIO(source('NOTE_LOGO.png'))).save(thumbnail,format='GIF')
    metadata = {
        'source': args.archive.name,
        'sha256': hashlib.sha256(args.archive.read_bytes()).hexdigest(),
        'notes': 'User-supplied z3phoenix artwork. Original PNG bytes preserved except hold body strips tiled to 6x1 atlases.',
        'tap_frames': 6, 'tap_cycle_seconds': 0.25, 'explosion_frames': 6,
        'explosion_frame_seconds': 0.06,
    }
    (target.parent / 'SOURCE.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
    print(f'Imported PHOENIX: {len(list(target.glob("*.PNG")))} atlases and original cover.')


if __name__ == '__main__':
    main()
