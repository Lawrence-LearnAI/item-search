import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('./PostcardAgent.gs',import.meta.url),'utf8'),ctx);
const url='https://www.ebay.com/itm/123456789012';
const candidate={url,title:'Test historical postcard',live:true,liveEvidence:'Buy now offer visible',relevance:'Documented exclusion',designSignature:'Caption | Publisher | 1 | Scene'};
function record({unsuitable='No',bad='No',design=candidate.designSignature,listing=url,copy=''}={}) {
  const row=Array(23).fill('');row[0]=unsuitable;row[1]=bad;row[2]='Interested';row[3]='Test historical postcard';row[7]=listing;row[19]=design;row[20]=copy;row[21]=ctx.pcUrl_(listing);row[22]='Keep my personal note';return row;
}
const header=Array(23).fill('Header');
const kind=(rows,c=candidate,sources=[c.url])=>ctx.pcDecide_([header,...rows],c,sources).kind;
test('recognizes eBay item across regional titles and tracking links',()=>{
  const c={...candidate,url:'https://www.ebay.de/itm/A-title/123456789012?mkcid=1'};
  assert.equal(kind([record()],c,[c.url]),'seen');
});
test('unsuitable suppresses the design even after condition rejection',()=>{
  assert.equal(kind([record({unsuitable:'Yes',bad:'Yes',listing:'https://www.ebay.com/itm/123456789013'})]),'suppressed');
});
test('bad condition permits a different copy of the same design',()=>{
  assert.equal(kind([record({bad:'Yes',listing:'https://www.ebay.com/itm/123456789013'})]),'add');
});
test('bad condition never repeats the exact rejected listing',()=>assert.equal(kind([record({bad:'Yes'})]),'seen'));
test('a visible acceptable copy prevents a second design row',()=>assert.equal(kind([record({listing:'https://www.ebay.com/itm/123456789013'})]),'seen'));
test('meaningful variant may appear independently',()=>assert.equal(kind([record({design:'Other caption | Publisher | 2 | Scene'})]),'seen'));
test('variant with a different listing is retained',()=>assert.equal(kind([record({design:'Other caption | Publisher | 2 | Scene',listing:'https://www.ebay.com/itm/123456789013'})]),'add'));
test('source-free or non-live claims are rejected',()=>{
  assert.equal(kind([],candidate,[]),'unverified');
  assert.equal(kind([],{...candidate,live:false}),'unverified');
  assert.equal(kind([],{...candidate,title:null}),'unverified');
});
test('same reverse evidence prevents relisted poor copy',()=>{
  const c={...candidate,copyEvidence:'Address in blue ink; Paris 1907; torn lower left'};
  assert.equal(kind([record({bad:'Yes',listing:'https://www.ebay.com/itm/123456789013',copy:c.copyEvidence})],c),'seen');
});
test('tracking stripped but query-based identities retained',()=>{
  assert.equal(ctx.pcUrl_('https://example.com/card?id=11&utm_source=x'),'https://example.com/card?id=11');
  assert.notEqual(ctx.pcUrl_('https://example.com/card?id=11'),ctx.pcUrl_('https://example.com/card?id=12'));
});
test('untrusted cells cannot become spreadsheet formulas',()=>{
  const row=ctx.pcCandidateRow_({...candidate,title:'=IMPORTDATA("https://evil.invalid")',price:-2},'listing');
  assert.equal(row[3][0],"'");assert.equal(row[10],'Unknown');
});
test('review fields remain untouched by duplicate decisions',()=>{
  const old=record();const before=JSON.stringify(old);kind([old]);assert.equal(JSON.stringify(old),before);
});
