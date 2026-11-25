const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const coop=require('../assets/js/coop.js');
const library=require('../assets/js/channel-library.js');
const parser=vm.runInNewContext(fs.readFileSync(require.resolve('../piured-engine/js/pegjs-ssc-parser/parser/SSCParserClient.js'),'utf8')+';sscParser;');
const header='#TITLE:Test;\n#BPMS:0=120;\n#OFFSET:0;\n';
const chart=(rows,meter=99,style='pump-double')=>'#NOTEDATA:;\n#STEPSTYPE:'+style+';\n#DESCRIPTION:Test;\n#DIFFICULTY:Edit;\n#METER:'+meter+';\n#NOTES:\n'+rows+'\n;';

test('99, titles, comments and reserved attributes alone never imply CO-OP',()=>{
  const content=header+chart('1000000000\n0200000000\n0300000000\n{1|n|0|3}000000000 // XYZ CO-OP\n');
  assert.equal(coop.parse(content,parser).levels[0].COOP,null);
  assert.equal(coop.summaries(content)[0].COOP,null);
  assert.equal(library.matchesChart(coop.parse(content,parser).levels[0],{type:'pump-double',level:'27+'}),true);
});

test('StepF2 detects owners independent of level; fourth player requires XYZ and ordinary notes',()=>{
  for(const [rows,players] of [['XY00000000',[1,2]],['XY10000000',[1,2]],['XyZ1000000',[1,2,3,4]],['{X|n|0|0}Y00000000',[1,2]]]){
    const content=header+chart(rows,18),parsed=coop.parse(content,parser).levels[0];
    assert.deepEqual(parsed.COOP.players,players);
    assert.deepEqual(coop.summaries(content)[0].COOP,parsed.COOP);
    assert.equal(library.matchesChart(parsed,{coop:true}),true);
    assert.equal(library.matchesChart(parsed,null),false);
    assert.equal(library.matchesChart(parsed,{type:'pump-double',level:18}),false);
  }
  assert.equal(coop.owner('1',{players:[1,2,3]}),0);
  assert.equal(coop.owner('1',{players:[1,2,3,4]}),4);
});

test('native Routine merges player streams with unequal resolutions at exact beats',()=>{
  const content=header+chart('1000000000\n0000000000\n&\n0000000000\n0000010000\n0000000000\n0000000000',12,'pump-routine');
  const level=coop.parse(content,parser).levels[0];
  assert.equal(level.STEPSTYPE,'pump-double');
  assert.equal(level.SOURCE_STEPSTYPE,'pump-routine');
  assert.deepEqual(level.COOP.players,[1,2]);
  assert.equal(level.NOTES[0].length,4);
  assert.equal(coop.owner(level.NOTES[0][0][0],level.COOP),1);
  assert.equal(coop.owner(level.NOTES[0][1][5],level.COOP),2);
  assert.deepEqual(coop.summaries(content)[0].COOP,level.COOP);
});

test('keyboard presets have distinct bindings and reject duplicate or reserved keys',()=>{
  const maps=coop.bindings();
  assert.equal(coop.validBindings(maps),true);
  maps[1][0]=maps[0][0];assert.equal(coop.validBindings(maps),false);
  maps[1][0]='Escape';assert.equal(coop.validBindings(maps),false);
});

test('three native owners do not create a fourth player; Routine also accepts StepF2 markers',()=>{
  const native=header+chart('1000000000\n&\n0000010000\n&\n0000000001',18,'pump-routine');
  assert.deepEqual(coop.parse(native,parser).levels[0].COOP.players,[1,2,3]);
  assert.deepEqual(coop.summaries(native)[0].COOP.players,[1,2,3]);
  const stepf2=header+chart('XY00000000',18,'pump-routine');
  const level=coop.parse(stepf2,parser).levels[0];
  assert.equal(coop.owner(level.NOTES[0][0][1],level.COOP),2);
  assert.deepEqual(coop.summaries(stepf2)[0].COOP,level.COOP);
});

test('the shipped library index includes Passacaglia P3 and Super Fantasy P4',()=>{
  const index=require('../assets/data/coop-index.json');
  assert.equal(index.schema,1);
  for(const [title,players] of [['Passacaglia',3],['Super Fantasy',4]]){
    const song=index.songs.find(song=>song.sscPath.includes(title));
    assert.ok(song,title+' must be indexed without browsing it first');
    assert.ok(song.charts.some(chart=>chart.COOP?.count===players));
    assert.ok(index.indexedPaths.includes(song.sscPath));
  }
  assert.ok(index.songs.every(song=>song.charts.some(chart=>chart.COOP)));
});
