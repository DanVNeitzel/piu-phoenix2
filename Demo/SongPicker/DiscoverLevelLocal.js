/*
 * # Copyright (C) Pedro G. Bascoy
 # This file is part of piured <https://github.com/piulin/piured>.
 #
 # piured is free software: you can redistribute it and/or modify
 # it under the terms of the GNU General Public License as published by
 # the Free Software Foundation, either version 3 of the License, or
 # (at your option) any later version.
 #
 # piured is distributed in the hope that it will be useful,
 # but WITHOUT ANY WARRANTY; without even the implied warranty of
 # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 # GNU General Public License for more details.
 #
 # You should have received a copy of the GNU General Public License
 # along with piured. If not, see <http://www.gnu.org/licenses/>.
 *
 */
function discoverLevels(sscPath, content) {
    let song;
    if (content !== undefined) {
        song = Object.create(Song.prototype); song.pathToSSCFile = sscPath; song.loadSSC(content);
    } else { song = new Song(sscPath); }

    selsong =  song ;

    let gl = document.getElementById('level') ;

    const order = {'pump-single':0,'pump-double':1,'pump-halfdouble':2};
    song.levels.map((level,index) => ({level,index})).filter(item => item.level.STEPSTYPE in order && PiuLibrary.matchesChart(item.level,channelChartFilter))
      .sort((a,b) => order[a.level.STEPSTYPE] - order[b.level.STEPSTYPE] || Number(a.level.METER) - Number(b.level.METER))
      .forEach(({level,index}) => {
        const item=createListGroupLinkSubtitle(index, level.METER + ' - ' + level.DESCRIPTION,
          level.STEPSTYPE, level.CREDIT, function() { change_level(index); });
        if(level.COOP){item.classList.add('circle-coop');item.querySelector('.fw-bold').textContent='×'+level.COOP.count;
          PiuCoop.applyBadge(item,level.COOP);
          item.title='CO-OP · '+level.COOP.count+' jogadores · nível '+level.METER;item.setAttribute('aria-label',item.title);}
        gl.append(item);
      });
}
