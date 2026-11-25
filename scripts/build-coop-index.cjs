/* Rebuild the shipped CO-OP index from actual notes in every catalogue SSC.
 * Run: node scripts/build-coop-index.cjs [library URL] [local YYYY-MM-DD]
 */
const fs=require('node:fs/promises');
const path=require('node:path');
const coop=require('../assets/js/coop.js');
const library=process.argv[2] || 'https://danvneitzel.github.io/piu-songs/';
const generatedOn=process.argv[3] || new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
const normalize=value=>value.replace(/^\.\//,'');
async function response(url){
  const result=await fetch(url,{signal:AbortSignal.timeout(20000)});
  if(!result.ok)throw new Error('HTTP '+result.status);
  return result;
}
async function main(){
  const catalogue=await (await response(new URL('songs.json',library))).json();
  const paths=[...new Set(catalogue.children[0].children.flatMap(stage=>stage.children.flatMap(song=>
    (song.children || []).filter(file=>/\.ssc$/i.test(file.name)).map(file=>normalize(file.path)))))].sort();
  const queue=paths.slice(),indexedPaths=[],songs=[],errors=[];
  await Promise.all(Array.from({length:8},async()=>{
    while(queue.length){
      const sscPath=queue.shift();
      try{
        const url=new URL(sscPath.split('/').map(encodeURIComponent).join('/'),library);
        const charts=coop.summaries(await (await response(url)).text());
        indexedPaths.push(sscPath);
        if(charts.some(chart=>chart.COOP))songs.push({sscPath,charts});
      }catch(error){errors.push({sscPath,error:error.message});}
    }
  }));
  if(!indexedPaths.length)throw new Error('Nenhum arquivo SSC foi verificado.');
  const output=path.join(__dirname,'../assets/data/coop-index.json');
  await fs.mkdir(path.dirname(output),{recursive:true});
  await fs.writeFile(output,JSON.stringify({schema:1,library,generatedOn,indexedPaths:indexedPaths.sort(),
    songs:songs.sort((a,b)=>a.sscPath.localeCompare(b.sscPath)),errors:errors.sort((a,b)=>a.sscPath.localeCompare(b.sscPath))},null,2)+'\n');
  console.log(JSON.stringify({verified:indexedPaths.length,coopSongs:songs.length,errors:errors.length,output}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
