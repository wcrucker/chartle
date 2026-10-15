export const MAX_GUESSES=10;
export const CATEGORIES=['rank','year','gender','country','genre','structure'];
export const LABELS={rank:'RYM rank',year:'Year',gender:'Gender',country:'Country',genre:'Genre',structure:'Members'};
export const GENRES=['Jazz','Rock','Folk','Psychedelic/Shoegaze','Classical','Pop','Hip-Hop','Prog','Latin','Electronica','Metal','Punk','Country','Funk/Soul','Reggae'];
export function albumPool(albums,mode='daily',practiceSize=500){return albums.filter(a=>a.rank<=(mode==='practice'&&practiceSize===1000?1000:500))}
export function normalize(s){return String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()}
export function searchAlbums(albums,query,guessed=[],limit=8){
 const words=normalize(query).split(' ').filter(Boolean);if(!words.length)return [];
 const exclude=new Set(guessed);const needle=normalize(query);
 return albums.filter(a=>!exclude.has(a.id)&&words.every(w=>normalize(a.title+' '+a.artist+' '+a.year).includes(w))).sort((a,b)=>{
  const score=a=>normalize(a.title)===needle?0:normalize(a.title).startsWith(needle)?1:normalize(a.artist).startsWith(needle)?2:3;
  return score(a)-score(b)||a.rank-b.rank;
 }).slice(0,limit)
}
function list(x){return x==null?[]:Array.isArray(x)?x:[x]}
function same(a,b){return JSON.stringify([...list(a)].sort())===JSON.stringify([...list(b)].sort())}
export function compare(guess,answer,key){
 const value=guess[key],target=answer[key];
 if(value==null||target==null||!list(value).length||!list(target).length)return {state:'unknown',value:value??'Unknown',direction:null,description:'Metadata unavailable; this clue does not eliminate the guess.'};
 if(same(value,target))return {state:'correct',value,direction:null,description:'Exact match'};
 if(key==='rank'||key==='year'){
  const close=Math.abs(value-target)<=(key==='rank'?50:5),direction=target<value?'lower':'higher';
  return {state:close?'close':'wrong',value,direction,description:(key==='rank'?(target<value?'Answer ranks higher (smaller number)':'Answer ranks lower (larger number)'):(target<value?'Answer year is earlier':'Answer year is later'))+(close?(key==='rank'?'; within 50 positions':'; within 5 years'):'')};
 }
 if(key==='country'){
  const overlap=list(value).some(v=>list(target).includes(v));
  const continent=list(guess.continent).some(v=>list(answer.continent).includes(v));
  return {state:overlap||continent?'close':'wrong',value,direction:null,description:overlap?'Shares a country':continent?'Same continent':'Different country and continent'};
 }
 return {state:'wrong',value,direction:null,description:'Does not match'};
}
export function evaluate(guess,answer){return {id:guess.id,won:guess.id===answer.id,clues:CATEGORIES.map(key=>({key,...compare(guess,answer,key)}))}}
export function gameState(ids,answerId){return ids.includes(answerId)?'won':ids.length>=MAX_GUESSES?'lost':'playing'}
export function dateKey(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
export function hash(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
export function dailyAnswer(albums,date,version){
 // Deterministic shuffled pool: visits every record before repeating.
 const pool=[...albums].sort((a,b)=>hash(version+':'+a.id)-hash(version+':'+b.id)||a.rank-b.rank);
 const day=Math.floor(Date.parse(date+'T12:00:00Z')/86400000);
 return pool[((day%pool.length)+pool.length)%pool.length];
}
export function safeSaved(raw,albums,answerId){
 try{const data=JSON.parse(raw);if(data.answerId!==answerId||!Array.isArray(data.guesses))return [];
  const valid=new Set(albums.map(a=>a.id)),ids=[];
  for(const id of data.guesses){if(typeof id!=='string'||!valid.has(id)||ids.includes(id)||ids.length>=10)continue;ids.push(id);if(id===answerId)break}return ids;
 }catch{return []}
}
export function shareText(mode,date,rows,outcome){const symbols={correct:'🟩',close:'🟨',wrong:'⬛',unknown:'⬜'};return `Chartle ${mode==='daily'?date:mode==='practice1000'?'Practice · Top 1,000':'Practice · Top 500'} · ${outcome==='won'?rows.length:'X'}/10\n${rows.map(r=>r.clues.map(c=>symbols[c.state]).join('')).join('\n')}`}
