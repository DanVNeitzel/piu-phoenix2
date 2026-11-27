"""Bake the approved electric artwork once, avoiding canvas blur work in gameplay."""
import base64
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'assets/img/gameplay'


def main():
    TARGET.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page()
        page.add_script_tag(path=str(ROOT / 'assets/js/life-electric.js'))
        for kind, width, height in [('single', 512, 113), ('double', 768, 85)]:
            data = page.evaluate('''({width,height})=>{
                const atlas=document.createElement('canvas');atlas.width=width*4;atlas.height=height*6;
                const ctx=atlas.getContext('2d');
                const tile=document.createElement('canvas');tile.width=1024;
                tile.height=Math.ceil(1024/(width/height));
                const paint=tile.getContext('2d'),w=tile.width,h=tile.height;
                for(let frame=0;frame<24;frame++){
                    paint.clearRect(0,0,w,h);
                    PiuLifeElectric.draw(paint,{x:w*(1-1/1.12)/2,y:h*(1-1/2.8)/2,
                        width:w/1.12,height:h/2.8},frame/15,0);
                    ctx.drawImage(tile,frame%4*width,Math.floor(frame/4)*height,width,height);
                }
                return atlas.toDataURL('image/png').split(',')[1];
            }''', {'width': width, 'height': height})
            (TARGET / f'life-electric-{kind}.png').write_bytes(base64.b64decode(data))
        browser.close()


if __name__ == '__main__':
    main()
